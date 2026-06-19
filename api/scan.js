import { getConfig, getPositions, savePositions, getBalance, saveBalance, addTrade, saveLastScan } from './lib/storage.js';
import { fetchHistoricalPrices, fetchMultiPrices } from './lib/market.js';
import { analyzeSignals } from './lib/analysis.js';

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const querySecret = req.query?.secret;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const config = await getConfig();
    if (!config.autoTrade) {
      return res.json({ status: 'idle', message: 'Auto trade disabled' });
    }

    const positions = await getPositions();
    const balance = await getBalance();
    const prices = await fetchMultiPrices(config.enabledPairs);

    const exits = [];
    for (const pos of positions) {
      const pd = prices[pos.symbol];
      if (!pd) continue;
      const price = pd.price;

      if (pos.direction === "BUY") {
        if (config.trailingStop && pos.trailingStop !== null) {
          if (price > pos.highWaterMark) {
            pos.highWaterMark = price;
            pos.trailingStop = price * (1 - config.trailingStopPct / 100);
          }
          if (price <= pos.trailingStop) { exits.push({ pos, price, reason: "trailing_stop" }); continue; }
        }
        if (price <= pos.stopLoss) exits.push({ pos, price, reason: "stop_loss" });
        else if (price >= pos.takeProfit) exits.push({ pos, price, reason: "take_profit" });
      } else {
        if (price >= pos.stopLoss) exits.push({ pos, price, reason: "stop_loss" });
        else if (price <= pos.takeProfit) exits.push({ pos, price, reason: "take_profit" });
      }
    }

    let updatedBalance = { ...balance };
    for (const exit of exits) {
      const pnl = exit.pos.direction === "BUY"
        ? (exit.price - exit.pos.entryPrice) * exit.pos.quantity
        : (exit.pos.entryPrice - exit.price) * exit.pos.quantity;
      updatedBalance.available += exit.pos.value + pnl;
      updatedBalance.total = updatedBalance.available;
      await addTrade({
        type: "CLOSE", symbol: exit.pos.symbol, direction: exit.pos.direction,
        entryPrice: exit.pos.entryPrice, exitPrice: exit.price,
        quantity: exit.pos.quantity, value: exit.pos.value,
        pnl, pnlPct: (pnl / exit.pos.value) * 100,
        reason: exit.reason, result: pnl > 0 ? "WIN" : "LOSS",
        duration: Date.now() - exit.pos.openedAt,
      });
    }

    const exitIds = new Set(exits.map(e => e.pos.id));
    let activePositions = positions.filter(p => !exitIds.has(p.id));

    const newTrades = [];
    for (const symbol of config.enabledPairs) {
      if (activePositions.length >= config.maxOpenPositions) break;
      if (activePositions.some(p => p.symbol === symbol)) continue;

      try {
        const data = await fetchHistoricalPrices(symbol, 14);
        const result = analyzeSignals(data.prices, data.volumes, config.confluenceRequired);

        if (result.direction !== "NEUTRAL" && result.confluence >= config.confluenceRequired) {
          const price = prices[symbol]?.price;
          if (!price) continue;

          const posValue = updatedBalance.available * (config.positionSizePct / 100);
          if (posValue < 10) continue;
          const quantity = posValue / price;
          const riskMult = config.riskLevel === "conservative" ? 0.5 : config.riskLevel === "aggressive" ? 2 : 1;
          const slPct = config.stopLossPct / 100 * riskMult;
          const tpPct = config.takeProfitPct / 100 * riskMult;

          const position = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            symbol, direction: result.direction,
            entryPrice: price, quantity, value: posValue,
            stopLoss: result.direction === "BUY" ? price * (1 - slPct) : price * (1 + slPct),
            takeProfit: result.direction === "BUY" ? price * (1 + tpPct) : price * (1 - tpPct),
            trailingStop: config.trailingStop ? price * (1 - config.trailingStopPct / 100) : null,
            highWaterMark: price,
            signals: result.signals.filter(s => s.direction === result.direction && s.strength >= 40).map(s => s.name),
            confluence: result.confluence,
            confidence: result.confidence,
            openedAt: Date.now(),
          };

          activePositions.push(position);
          newTrades.push({ symbol, direction: result.direction, price, confluence: result.confluence });
          updatedBalance.available -= posValue;
          updatedBalance.total = updatedBalance.available;

          await addTrade({
            type: "OPEN", symbol, direction: result.direction,
            price, quantity, value: posValue,
            confluence: result.confluence, signals: position.signals,
          });
        }
      } catch (e) {
        console.error(`Scan ${symbol}:`, e.message);
      }
    }

    await savePositions(activePositions);
    await saveBalance(updatedBalance);

    const scanResult = {
      timestamp: Date.now(),
      scannedPairs: config.enabledPairs.length,
      openPositions: activePositions.length,
      newTrades: newTrades.length,
      closedTrades: exits.length,
      balance: updatedBalance.available,
      trades: newTrades,
    };
    await saveLastScan(scanResult);

    return res.json({ status: 'ok', ...scanResult });
  } catch (e) {
    console.error('Scan error:', e);
    return res.status(500).json({ error: e.message });
  }
}
