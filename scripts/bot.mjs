import { analyzeSignals } from '../api/lib/analysis.js';
import { fetchHistoricalPrices, fetchMultiPrices } from '../api/lib/market.js';

const REPO = 'fazman786/rant-app';
const STATE_BRANCH = 'bot-state';
const STATE_FILE = 'state.json';
const TOKEN = process.env.GITHUB_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const DEFAULT_CONFIG = {
  autoTrade: true,
  riskLevel: "conservative",
  positionSizePct: 3,
  stopLossPct: 1.5,
  takeProfitPct: 4.5,
  maxOpenPositions: 2,
  enabledPairs: ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA"],
  trailingStop: true,
  trailingStopPct: 1.0,
  confluenceRequired: 2,
};

const DEFAULT_STATE = {
  config: DEFAULT_CONFIG,
  positions: [],
  tradeLog: [],
  balance: { available: 10000, total: 10000 },
  lastScan: null,
  stats: { totalTrades: 0, wins: 0, losses: 0, winRate: "0.0", totalPnL: "0.00" },
  aiAnalysis: null,
};

async function getState() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${STATE_FILE}?ref=${STATE_BRANCH}`, {
      headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json' },
    });
    if (res.ok) {
      const data = await res.json();
      const content = Buffer.from(data.content, 'base64').toString();
      return { state: JSON.parse(content), sha: data.sha };
    }
  } catch (e) {
    console.log('No existing state, using defaults');
  }
  return { state: { ...DEFAULT_STATE }, sha: null };
}

async function ensureBranch() {
  const res = await fetch(`https://api.github.com/repos/${REPO}/git/refs/heads/${STATE_BRANCH}`, {
    headers: { Authorization: `token ${TOKEN}` },
  });
  if (res.ok) return;

  const mainRef = await fetch(`https://api.github.com/repos/${REPO}/git/refs/heads/main`, {
    headers: { Authorization: `token ${TOKEN}` },
  });
  if (mainRef.ok) {
    const data = await mainRef.json();
    await createBranch(data.object.sha);
  }
}

async function createBranch(sha) {
  await fetch(`https://api.github.com/repos/${REPO}/git/refs`, {
    method: 'POST',
    headers: { Authorization: `token ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${STATE_BRANCH}`, sha }),
  });
}

async function saveState(state, sha) {
  const content = Buffer.from(JSON.stringify(state, null, 2)).toString('base64');
  const body = {
    message: `bot: ${state.lastScan?.newTrades || 0} new, ${state.lastScan?.closedTrades || 0} closed, bal $${state.balance.available.toFixed(0)}`,
    content,
    branch: STATE_BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${STATE_FILE}`, {
    method: 'PUT',
    headers: { Authorization: `token ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Failed to save state:', err);
  }
}

async function aiAnalyze(allIndicators, prices, positions, balance, tradeLog, config) {
  if (!ANTHROPIC_KEY) {
    console.log('No ANTHROPIC_API_KEY — falling back to rule-based strategy');
    return null;
  }

  const recentTrades = tradeLog.slice(0, 10).map(t => ({
    type: t.type, symbol: t.symbol, direction: t.direction,
    pnl: t.pnl ? `$${t.pnl.toFixed(2)}` : undefined,
    result: t.result,
    reason: t.reason,
    ago: t.timestamp ? `${Math.round((Date.now() - t.timestamp) / 60000)}min ago` : undefined,
  }));

  const openPositions = positions.map(p => {
    const pd = prices[p.symbol];
    const unrealized = pd
      ? p.direction === "BUY" ? (pd.price - p.entryPrice) * p.quantity : (p.entryPrice - pd.price) * p.quantity
      : 0;
    return {
      symbol: p.symbol, direction: p.direction,
      entryPrice: p.entryPrice, currentPrice: pd?.price,
      unrealizedPnL: `$${unrealized.toFixed(2)}`,
      stopLoss: p.stopLoss, takeProfit: p.takeProfit,
      holdingFor: `${Math.round((Date.now() - p.openedAt) / 60000)}min`,
    };
  });

  const marketData = {};
  for (const [symbol, ind] of Object.entries(allIndicators)) {
    const pd = prices[symbol];
    marketData[symbol] = {
      price: pd?.price,
      change24h: pd?.change24h ? `${pd.change24h.toFixed(2)}%` : undefined,
      indicators: ind.signals.map(s => ({
        name: s.name, direction: s.direction,
        strength: s.strength, detail: s.detail,
      })),
      ruleBasedSignal: ind.direction,
      confluence: `${ind.confluence}/${ind.totalSignals}`,
    };
  }

  const prompt = `You are an expert crypto trading AI. Analyze the market data and decide which trades to make.

PORTFOLIO:
- Balance: $${balance.available.toFixed(2)} available, $${balance.total.toFixed(2)} total
- Max open positions: ${config.maxOpenPositions}
- Position size: ${config.positionSizePct}% of available balance
- Risk level: ${config.riskLevel}

OPEN POSITIONS:
${openPositions.length > 0 ? JSON.stringify(openPositions, null, 2) : "None"}

RECENT TRADES:
${recentTrades.length > 0 ? JSON.stringify(recentTrades, null, 2) : "None yet"}

MARKET DATA & TECHNICAL INDICATORS:
${JSON.stringify(marketData, null, 2)}

RULES:
1. You can open up to ${config.maxOpenPositions - positions.length} more positions
2. Don't open a position if one already exists for that symbol
3. Only trade when you have HIGH confidence — protect capital first
4. Consider correlations: if BTC is crashing, altcoins likely follow
5. Learn from recent trades: if recent trades were losses, be more cautious
6. Consider the 24h price change — don't chase after big moves already happened

Respond with ONLY valid JSON (no markdown, no backticks):
{
  "marketOutlook": "1-2 sentence overall market assessment",
  "trades": [
    {
      "symbol": "BTC",
      "action": "BUY" or "SELL" or "HOLD",
      "confidence": 0-100,
      "reasoning": "1-2 sentence explanation"
    }
  ],
  "riskWarning": "any risk concern or null"
}

Include ALL 6 symbols in trades array. Be selective — HOLD is the default. Only BUY/SELL with confidence >= 65.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('AI API error:', res.status, err);
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text);
    console.log('\n--- AI ANALYSIS ---');
    console.log('Market:', parsed.marketOutlook);
    if (parsed.riskWarning) console.log('Risk:', parsed.riskWarning);
    for (const t of parsed.trades) {
      if (t.action !== 'HOLD') {
        console.log(`  ${t.symbol}: ${t.action} (${t.confidence}%) — ${t.reasoning}`);
      }
    }
    console.log('-------------------\n');

    return parsed;
  } catch (e) {
    console.error('AI analysis failed:', e.message);
    return null;
  }
}

function checkExits(positions, prices, config) {
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
      if (config.trailingStop && pos.trailingStop !== null) {
        if (price < pos.highWaterMark) {
          pos.highWaterMark = price;
          pos.trailingStop = price * (1 + config.trailingStopPct / 100);
        }
        if (price >= pos.trailingStop) { exits.push({ pos, price, reason: "trailing_stop" }); continue; }
      }
      if (price >= pos.stopLoss) exits.push({ pos, price, reason: "stop_loss" });
      else if (price <= pos.takeProfit) exits.push({ pos, price, reason: "take_profit" });
    }
  }
  return exits;
}

function updateStats(tradeLog) {
  const closed = tradeLog.filter(t => t.type === "CLOSE");
  const wins = closed.filter(t => t.pnl > 0).length;
  const losses = closed.filter(t => t.pnl <= 0).length;
  const totalPnL = closed.reduce((s, t) => s + (t.pnl || 0), 0);
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
  const avgWin = wins > 0 ? closed.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0) / wins : 0;
  const avgLoss = losses > 0 ? Math.abs(closed.filter(t => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0) / losses) : 0;
  return {
    totalTrades: closed.length, wins, losses,
    winRate: winRate.toFixed(1),
    totalPnL: totalPnL.toFixed(2),
    avgWin: avgWin.toFixed(2),
    avgLoss: avgLoss.toFixed(2),
  };
}

async function main() {
  console.log(`[${new Date().toISOString()}] AI Trading Bot scan starting...`);
  console.log(`AI mode: ${ANTHROPIC_KEY ? 'ENABLED' : 'DISABLED (no API key)'}`);

  await ensureBranch();
  const { state, sha } = await getState();
  const config = state.config || DEFAULT_CONFIG;

  if (!config.autoTrade) {
    console.log('Auto trade disabled, skipping');
    return;
  }

  const prices = await fetchMultiPrices(config.enabledPairs);
  console.log(`Fetched prices for ${Object.keys(prices).length} pairs`);

  let balance = state.balance || { available: 10000, total: 10000 };
  let positions = state.positions || [];
  let tradeLog = state.tradeLog || [];

  // Check exits first
  const exits = checkExits(positions, prices, config);
  for (const exit of exits) {
    const pnl = exit.pos.direction === "BUY"
      ? (exit.price - exit.pos.entryPrice) * exit.pos.quantity
      : (exit.pos.entryPrice - exit.price) * exit.pos.quantity;

    balance.available += exit.pos.value + pnl;

    tradeLog.unshift({
      type: "CLOSE", symbol: exit.pos.symbol, direction: exit.pos.direction,
      entryPrice: exit.pos.entryPrice, exitPrice: exit.price,
      quantity: exit.pos.quantity, value: exit.pos.value,
      pnl, pnlPct: (pnl / exit.pos.value) * 100,
      reason: exit.reason, result: pnl > 0 ? "WIN" : "LOSS",
      duration: Date.now() - exit.pos.openedAt, timestamp: Date.now(),
    });

    console.log(`CLOSED ${exit.pos.symbol} ${exit.pos.direction} | ${exit.reason} | PnL: $${pnl.toFixed(2)} (${pnl > 0 ? "WIN" : "LOSS"})`);
  }

  const exitIds = new Set(exits.map(e => e.pos.id));
  positions = positions.filter(p => !exitIds.has(p.id));

  // Run technical analysis on all pairs
  const allIndicators = {};
  for (const symbol of config.enabledPairs) {
    try {
      const data = await fetchHistoricalPrices(symbol, 14);
      allIndicators[symbol] = analyzeSignals(data.prices, data.volumes, config.confluenceRequired);
    } catch (e) {
      console.error(`Error analyzing ${symbol}:`, e.message);
    }
  }

  // Get AI decision
  const aiResult = await aiAnalyze(allIndicators, prices, positions, balance, tradeLog, config);

  // Execute trades based on AI or fallback to rule-based
  let newTrades = 0;
  const slotsAvailable = config.maxOpenPositions - positions.length;

  if (aiResult && aiResult.trades) {
    // AI-powered trading
    const actionable = aiResult.trades
      .filter(t => (t.action === 'BUY' || t.action === 'SELL') && t.confidence >= 65)
      .filter(t => !positions.some(p => p.symbol === t.symbol))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, slotsAvailable);

    for (const trade of actionable) {
      const price = prices[trade.symbol]?.price;
      if (!price) continue;

      const posValue = balance.available * (config.positionSizePct / 100);
      if (posValue < 10) continue;
      const quantity = posValue / price;
      const riskMult = config.riskLevel === "conservative" ? 0.5 : config.riskLevel === "aggressive" ? 2 : 1;
      const slPct = config.stopLossPct / 100 * riskMult;
      const tpPct = config.takeProfitPct / 100 * riskMult;

      const position = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        symbol: trade.symbol, direction: trade.action,
        entryPrice: price, quantity, value: posValue,
        stopLoss: trade.action === "BUY" ? price * (1 - slPct) : price * (1 + slPct),
        takeProfit: trade.action === "BUY" ? price * (1 + tpPct) : price * (1 - tpPct),
        trailingStop: config.trailingStop
          ? trade.action === "BUY" ? price * (1 - config.trailingStopPct / 100) : price * (1 + config.trailingStopPct / 100)
          : null,
        highWaterMark: price,
        signals: [{ name: "AI", detail: trade.reasoning }],
        confluence: trade.confidence,
        aiReasoning: trade.reasoning,
        aiConfidence: trade.confidence,
        openedAt: Date.now(),
      };

      positions.push(position);
      balance.available -= posValue;
      newTrades++;

      tradeLog.unshift({
        type: "OPEN", symbol: trade.symbol, direction: trade.action,
        price, quantity, value: posValue,
        confluence: trade.confidence,
        signals: ["AI Analysis"],
        aiReasoning: trade.reasoning,
        timestamp: Date.now(),
      });

      console.log(`AI OPENED ${trade.symbol} ${trade.action} @ $${price.toFixed(2)} | ${trade.confidence}% confidence | ${trade.reasoning}`);
    }
  } else {
    // Fallback: rule-based strategy
    console.log('Using rule-based fallback strategy');
    for (const symbol of config.enabledPairs) {
      if (positions.length >= config.maxOpenPositions) break;
      if (positions.some(p => p.symbol === symbol)) continue;

      const result = allIndicators[symbol];
      if (!result) continue;

      console.log(`${symbol}: ${result.direction} (${result.confluence}/${result.totalSignals} confluence)`);

      if (result.direction !== "NEUTRAL" && result.confluence >= config.confluenceRequired) {
        const price = prices[symbol]?.price;
        if (!price) continue;

        const posValue = balance.available * (config.positionSizePct / 100);
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
          trailingStop: config.trailingStop
            ? result.direction === "BUY" ? price * (1 - config.trailingStopPct / 100) : price * (1 + config.trailingStopPct / 100)
            : null,
          highWaterMark: price,
          signals: result.signals.filter(s => s.direction === result.direction && s.strength >= 25).map(s => s.name),
          confluence: result.confluence,
          openedAt: Date.now(),
        };

        positions.push(position);
        balance.available -= posValue;
        newTrades++;

        tradeLog.unshift({
          type: "OPEN", symbol, direction: result.direction,
          price, quantity, value: posValue,
          confluence: result.confluence, signals: position.signals,
          timestamp: Date.now(),
        });

        console.log(`OPENED ${symbol} ${result.direction} @ $${price.toFixed(2)} | ${result.confluence} confluence | $${posValue.toFixed(2)}`);
      }
    }
  }

  if (tradeLog.length > 200) tradeLog.length = 200;

  let positionsValue = 0;
  for (const pos of positions) {
    const pd = prices[pos.symbol];
    if (pd) {
      const unrealized = pos.direction === "BUY"
        ? (pd.price - pos.entryPrice) * pos.quantity
        : (pos.entryPrice - pd.price) * pos.quantity;
      positionsValue += pos.value + unrealized;
    }
  }
  balance.total = balance.available + positionsValue;

  const stats = updateStats(tradeLog);

  state.positions = positions;
  state.tradeLog = tradeLog;
  state.balance = balance;
  state.stats = stats;
  state.lastScan = {
    timestamp: Date.now(),
    scannedPairs: config.enabledPairs.length,
    openPositions: positions.length,
    newTrades,
    closedTrades: exits.length,
    aiPowered: !!aiResult,
  };
  state.prices = prices;
  state.aiAnalysis = aiResult ? {
    marketOutlook: aiResult.marketOutlook,
    riskWarning: aiResult.riskWarning,
    trades: aiResult.trades,
    timestamp: Date.now(),
  } : state.aiAnalysis;

  await saveState(state, sha);

  console.log(`\nScan complete: ${newTrades} opened, ${exits.length} closed, ${positions.length} active`);
  console.log(`Balance: $${balance.available.toFixed(2)} available, $${balance.total.toFixed(2)} total`);
  console.log(`Stats: ${stats.winRate}% win rate, $${stats.totalPnL} total P&L`);
}

main().catch(e => { console.error('Bot error:', e); process.exit(1); });
