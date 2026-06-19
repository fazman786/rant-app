import { sma, ema, rsi, macd, bollingerBands, stochastic, atr } from "./indicators.js";

const LS = {
  get: (k, fb = null) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const MIN_CONFLUENCE = 3;

export function analyzeSignals(prices, volumes = []) {
  if (prices.length < 30) return { signals: [], confluence: 0, direction: "NEUTRAL", totalSignals: 0, avgStrength: 0, summary: "Insufficient data" };

  const signals = [];
  const currentPrice = prices[prices.length - 1];

  const rsiValues = rsi(prices, 14);
  const currentRSI = rsiValues[rsiValues.length - 1];
  if (currentRSI !== undefined) {
    if (currentRSI < 30) signals.push({ name: "RSI", direction: "BUY", strength: Math.round((30 - currentRSI) / 30 * 100), value: currentRSI.toFixed(1), detail: `Oversold (${currentRSI.toFixed(0)})` });
    else if (currentRSI > 70) signals.push({ name: "RSI", direction: "SELL", strength: Math.round((currentRSI - 70) / 30 * 100), value: currentRSI.toFixed(1), detail: `Overbought (${currentRSI.toFixed(0)})` });
    else signals.push({ name: "RSI", direction: "NEUTRAL", strength: 0, value: currentRSI.toFixed(1), detail: "Neutral zone" });
  }

  const ema12 = ema(prices, 12);
  const ema26 = ema(prices, 26);
  if (ema12.length > 1 && ema26.length > 1) {
    const fastEMA = ema12[ema12.length - 1];
    const slowEMA = ema26[ema26.length - 1];
    const prevFast = ema12[ema12.length - 2];
    const prevSlow = ema26[ema26.length - 2];
    const crossUp = prevFast <= prevSlow && fastEMA > slowEMA;
    const crossDown = prevFast >= prevSlow && fastEMA < slowEMA;
    const spread = ((fastEMA - slowEMA) / slowEMA) * 100;
    if (crossUp || spread > 0.5) signals.push({ name: "EMA Cross", direction: "BUY", strength: crossUp ? 90 : Math.min(80, Math.round(spread * 40)), value: `${spread.toFixed(2)}%`, detail: crossUp ? "Bullish crossover" : "Bullish trend" });
    else if (crossDown || spread < -0.5) signals.push({ name: "EMA Cross", direction: "SELL", strength: crossDown ? 90 : Math.min(80, Math.round(Math.abs(spread) * 40)), value: `${spread.toFixed(2)}%`, detail: crossDown ? "Bearish crossover" : "Bearish trend" });
    else signals.push({ name: "EMA Cross", direction: "NEUTRAL", strength: 0, value: `${spread.toFixed(2)}%`, detail: "No clear trend" });
  }

  const macdData = macd(prices);
  const hist = macdData.histogram;
  if (hist.length > 1) {
    const currentHist = hist[hist.length - 1];
    const prevHist = hist[hist.length - 2];
    const crossUp = prevHist < 0 && currentHist > 0;
    const crossDown = prevHist > 0 && currentHist < 0;
    if (crossUp || currentHist > 0) signals.push({ name: "MACD", direction: "BUY", strength: crossUp ? 85 : Math.min(70, Math.round(Math.abs(currentHist / currentPrice * 10000))), value: currentHist.toFixed(2), detail: crossUp ? "Bullish signal cross" : "Positive momentum" });
    else if (crossDown || currentHist < 0) signals.push({ name: "MACD", direction: "SELL", strength: crossDown ? 85 : Math.min(70, Math.round(Math.abs(currentHist / currentPrice * 10000))), value: currentHist.toFixed(2), detail: crossDown ? "Bearish signal cross" : "Negative momentum" });
    else signals.push({ name: "MACD", direction: "NEUTRAL", strength: 0, value: "0.00", detail: "No momentum" });
  }

  const bb = bollingerBands(prices, 20, 2);
  if (bb.upper.length > 0) {
    const upperBand = bb.upper[bb.upper.length - 1];
    const lowerBand = bb.lower[bb.lower.length - 1];
    const bandWidth = upperBand - lowerBand;
    const pctB = bandWidth === 0 ? 0.5 : (currentPrice - lowerBand) / bandWidth;
    if (pctB < 0.15) signals.push({ name: "Bollinger", direction: "BUY", strength: Math.round((0.15 - pctB) / 0.15 * 100), value: `${(pctB * 100).toFixed(0)}%B`, detail: "Below lower band" });
    else if (pctB > 0.85) signals.push({ name: "Bollinger", direction: "SELL", strength: Math.round((pctB - 0.85) / 0.15 * 100), value: `${(pctB * 100).toFixed(0)}%B`, detail: "Above upper band" });
    else signals.push({ name: "Bollinger", direction: "NEUTRAL", strength: 0, value: `${(pctB * 100).toFixed(0)}%B`, detail: "Within bands" });
  }

  const len50 = Math.min(50, Math.floor(prices.length / 2));
  const len20 = Math.min(20, Math.floor(prices.length / 3));
  const sma50 = sma(prices, len50);
  const sma20 = sma(prices, len20);
  if (sma50.length > 0 && sma20.length > 0) {
    const s50 = sma50[sma50.length - 1];
    const s20 = sma20[sma20.length - 1];
    const aboveBoth = currentPrice > s50 && currentPrice > s20;
    const belowBoth = currentPrice < s50 && currentPrice < s20;
    if (aboveBoth) signals.push({ name: "MA Trend", direction: "BUY", strength: Math.min(75, Math.round(((currentPrice - s50) / s50) * 1000)), value: "above", detail: "Price above MAs" });
    else if (belowBoth) signals.push({ name: "MA Trend", direction: "SELL", strength: Math.min(75, Math.round(((s50 - currentPrice) / s50) * 1000)), value: "below", detail: "Price below MAs" });
    else signals.push({ name: "MA Trend", direction: "NEUTRAL", strength: 0, value: "mixed", detail: "Mixed signals" });
  }

  if (volumes.length > 20) {
    const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const curVol = volumes[volumes.length - 1];
    const volRatio = avgVol > 0 ? curVol / avgVol : 1;
    const priceChange = prices.length > 5 ? (prices[prices.length - 1] - prices[prices.length - 5]) / prices[prices.length - 5] : 0;
    if (volRatio > 1.5 && priceChange > 0) signals.push({ name: "Volume", direction: "BUY", strength: Math.min(80, Math.round(volRatio * 30)), value: `${volRatio.toFixed(1)}x`, detail: "High vol breakout" });
    else if (volRatio > 1.5 && priceChange < 0) signals.push({ name: "Volume", direction: "SELL", strength: Math.min(80, Math.round(volRatio * 30)), value: `${volRatio.toFixed(1)}x`, detail: "High vol breakdown" });
    else signals.push({ name: "Volume", direction: "NEUTRAL", strength: 0, value: `${volRatio.toFixed(1)}x`, detail: "Normal volume" });
  }

  const buySignals = signals.filter(s => s.direction === "BUY");
  const sellSignals = signals.filter(s => s.direction === "SELL");

  let direction = "NEUTRAL";
  let confluence = Math.max(buySignals.length, sellSignals.length);
  if (buySignals.length >= MIN_CONFLUENCE) direction = "BUY";
  else if (sellSignals.length >= MIN_CONFLUENCE) direction = "SELL";

  const dirSignals = signals.filter(s => s.direction === direction);
  const avgStrength = dirSignals.length > 0 ? Math.round(dirSignals.reduce((s, sig) => s + sig.strength, 0) / dirSignals.length) : 0;

  let summary = "No clear signal";
  if (direction === "BUY") summary = `Strong BUY — ${confluence} indicators aligned (${buySignals.map(s => s.name).join(", ")})`;
  else if (direction === "SELL") summary = `Strong SELL — ${confluence} indicators aligned (${sellSignals.map(s => s.name).join(", ")})`;
  else if (confluence === 2) summary = `Weak ${buySignals.length >= sellSignals.length ? "bullish" : "bearish"} — needs 1 more indicator`;

  return { signals, confluence, direction, totalSignals: signals.length, avgStrength, summary };
}

export function getTradeLog() {
  return LS.get("trade_log", []);
}

export function addTradeLog(entry) {
  const log = getTradeLog();
  log.unshift({ ...entry, timestamp: Date.now() });
  if (log.length > 200) log.length = 200;
  LS.set("trade_log", log);
  return log;
}

export function getTradeStats() {
  const log = getTradeLog();
  const closed = log.filter(t => t.type === "CLOSE");
  const wins = closed.filter(t => t.pnl > 0).length;
  const losses = closed.filter(t => t.pnl <= 0).length;
  const totalPnL = closed.reduce((s, t) => s + (t.pnl || 0), 0);
  const avgWin = wins > 0 ? closed.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0) / wins : 0;
  const avgLoss = losses > 0 ? Math.abs(closed.filter(t => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0) / losses) : 0;
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

  return {
    totalTrades: closed.length,
    wins,
    losses,
    winRate: winRate.toFixed(1),
    totalPnL: totalPnL.toFixed(2),
    avgWin: avgWin.toFixed(2),
    avgLoss: avgLoss.toFixed(2),
    profitFactor: profitFactor === Infinity ? "INF" : profitFactor.toFixed(2),
  };
}

export function getBotConfig() {
  return LS.get("bot_config", {
    autoTrade: false,
    riskLevel: "medium",
    positionSizePct: 5,
    stopLossPct: 2,
    takeProfitPct: 4,
    maxOpenPositions: 3,
    scanIntervalSec: 60,
    enabledPairs: ["BTC", "ETH", "SOL"],
    trailingStop: false,
    trailingStopPct: 1.5,
    dailyLossLimit: 500,
    confluenceRequired: 3,
  });
}

export function saveBotConfig(config) {
  LS.set("bot_config", config);
}

export function getActivePositions() {
  return LS.get("active_positions", []);
}

export function saveActivePositions(positions) {
  LS.set("active_positions", positions);
}

export function openPosition(symbol, direction, entryPrice, quantity, value, signals, confluence) {
  const positions = getActivePositions();
  const config = getBotConfig();
  const riskMult = config.riskLevel === "conservative" ? 0.5 : config.riskLevel === "aggressive" ? 2 : 1;
  const slPct = config.stopLossPct / 100 * riskMult;
  const tpPct = config.takeProfitPct / 100 * riskMult;

  const position = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    symbol,
    direction,
    entryPrice,
    quantity,
    value,
    stopLoss: direction === "BUY" ? entryPrice * (1 - slPct) : entryPrice * (1 + slPct),
    takeProfit: direction === "BUY" ? entryPrice * (1 + tpPct) : entryPrice * (1 - tpPct),
    trailingStop: config.trailingStop ? entryPrice * (1 - config.trailingStopPct / 100) : null,
    highWaterMark: entryPrice,
    signals,
    confluence,
    openedAt: Date.now(),
  };

  positions.push(position);
  saveActivePositions(positions);

  addTradeLog({
    type: "OPEN",
    symbol,
    direction,
    price: entryPrice,
    quantity,
    value,
    confluence,
    signals,
  });

  return position;
}

export function closePositionLocal(positionId, exitPrice, reason = "manual") {
  const positions = getActivePositions();
  const pos = positions.find(p => p.id === positionId);
  if (!pos) return null;

  const pnl = pos.direction === "BUY"
    ? (exitPrice - pos.entryPrice) * pos.quantity
    : (pos.entryPrice - exitPrice) * pos.quantity;
  const pnlPct = (pnl / pos.value) * 100;

  addTradeLog({
    type: "CLOSE",
    symbol: pos.symbol,
    direction: pos.direction,
    entryPrice: pos.entryPrice,
    exitPrice,
    quantity: pos.quantity,
    value: pos.value,
    pnl,
    pnlPct,
    reason,
    result: pnl > 0 ? "WIN" : "LOSS",
    duration: Date.now() - pos.openedAt,
  });

  const remaining = positions.filter(p => p.id !== positionId);
  saveActivePositions(remaining);
  return { pnl, pnlPct, result: pnl > 0 ? "WIN" : "LOSS" };
}

export function checkPositionExits(currentPrices) {
  const positions = getActivePositions();
  const config = getBotConfig();
  const exits = [];

  for (const pos of positions) {
    const price = currentPrices[pos.symbol];
    if (!price) continue;

    if (pos.direction === "BUY") {
      if (config.trailingStop && pos.trailingStop !== null) {
        if (price > pos.highWaterMark) {
          pos.highWaterMark = price;
          pos.trailingStop = price * (1 - config.trailingStopPct / 100);
        }
        if (price <= pos.trailingStop) {
          exits.push({ positionId: pos.id, price, reason: "trailing_stop" });
          continue;
        }
      }
      if (price <= pos.stopLoss) exits.push({ positionId: pos.id, price, reason: "stop_loss" });
      else if (price >= pos.takeProfit) exits.push({ positionId: pos.id, price, reason: "take_profit" });
    } else {
      if (price >= pos.stopLoss) exits.push({ positionId: pos.id, price, reason: "stop_loss" });
      else if (price <= pos.takeProfit) exits.push({ positionId: pos.id, price, reason: "take_profit" });
    }
  }

  saveActivePositions(positions);
  return exits;
}

export function clearAllData() {
  localStorage.removeItem("trade_log");
  localStorage.removeItem("active_positions");
  localStorage.removeItem("demo_portfolio");
  localStorage.removeItem("demo_order_history");
  localStorage.removeItem("bot_config");
}
