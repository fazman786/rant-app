import { sma, ema, rsi, macd, bollingerBands, stochastic, atr } from "./indicators.js";

const LS = {
  get: (k, fb = null) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const INITIAL_BALANCE = 10000;
const POSITION_SIZE_PCT = 0.05;
const STOP_LOSS_PCT = 0.02;
const TAKE_PROFIT_PCT = 0.04;
const MIN_CONFLUENCE = 3;

export const COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", color: "#f7931a" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", color: "#627eea" },
  { id: "solana", symbol: "SOL", name: "Solana", color: "#00ffa3" },
  { id: "binancecoin", symbol: "BNB", name: "BNB", color: "#f3ba2f" },
  { id: "ripple", symbol: "XRP", name: "XRP", color: "#00aae4" },
  { id: "cardano", symbol: "ADA", name: "Cardano", color: "#0033ad" },
];

const API_BASE = "https://api.coingecko.com/api/v3";

export async function fetchMarketData(coinId, days = 30) {
  const res = await fetch(
    `${API_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=hourly`
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return {
    prices: data.prices.map(p => p[1]),
    timestamps: data.prices.map(p => p[0]),
    volumes: (data.total_volumes || []).map(v => v[1]),
  };
}

export async function fetchCurrentPrices() {
  const ids = COINS.map(c => c.id).join(",");
  const res = await fetch(
    `${API_BASE}/simple/price?ids=${ids}&vs_currency=usd&include_24hr_change=true&include_24hr_vol=true`
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function analyzeSignals(prices, volumes = []) {
  if (prices.length < 30) return { signals: [], confluence: 0, direction: "NEUTRAL" };

  const signals = [];
  const currentPrice = prices[prices.length - 1];

  const rsiValues = rsi(prices, 14);
  const currentRSI = rsiValues[rsiValues.length - 1];
  if (currentRSI !== undefined) {
    if (currentRSI < 30) signals.push({ name: "RSI", direction: "BUY", strength: Math.round((30 - currentRSI) / 30 * 100), value: currentRSI.toFixed(1), detail: "Oversold territory" });
    else if (currentRSI > 70) signals.push({ name: "RSI", direction: "SELL", strength: Math.round((currentRSI - 70) / 30 * 100), value: currentRSI.toFixed(1), detail: "Overbought territory" });
    else signals.push({ name: "RSI", direction: "NEUTRAL", strength: 0, value: currentRSI.toFixed(1), detail: "Neutral zone" });
  }

  const ema12 = ema(prices, 12);
  const ema26 = ema(prices, 26);
  const fastEMA = ema12[ema12.length - 1];
  const slowEMA = ema26[ema26.length - 1];
  const prevFast = ema12[ema12.length - 2];
  const prevSlow = ema26[ema26.length - 2];
  if (fastEMA && slowEMA) {
    const crossUp = prevFast <= prevSlow && fastEMA > slowEMA;
    const crossDown = prevFast >= prevSlow && fastEMA < slowEMA;
    const spread = ((fastEMA - slowEMA) / slowEMA) * 100;
    if (crossUp || spread > 0.5) signals.push({ name: "EMA Cross", direction: "BUY", strength: crossUp ? 90 : Math.min(80, Math.round(spread * 40)), value: `${spread.toFixed(2)}%`, detail: crossUp ? "Bullish crossover" : "Bullish trend" });
    else if (crossDown || spread < -0.5) signals.push({ name: "EMA Cross", direction: "SELL", strength: crossDown ? 90 : Math.min(80, Math.round(Math.abs(spread) * 40)), value: `${spread.toFixed(2)}%`, detail: crossDown ? "Bearish crossover" : "Bearish trend" });
    else signals.push({ name: "EMA Cross", direction: "NEUTRAL", strength: 0, value: `${spread.toFixed(2)}%`, detail: "No clear trend" });
  }

  const macdData = macd(prices);
  const hist = macdData.histogram;
  const currentHist = hist[hist.length - 1];
  const prevHist = hist[hist.length - 2];
  if (currentHist !== undefined) {
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
    const middleBand = bb.middle[bb.middle.length - 1];
    const bandWidth = upperBand - lowerBand;
    const pctB = bandWidth === 0 ? 0.5 : (currentPrice - lowerBand) / bandWidth;
    if (pctB < 0.15) signals.push({ name: "Bollinger", direction: "BUY", strength: Math.round((0.15 - pctB) / 0.15 * 100), value: `${(pctB * 100).toFixed(0)}%B`, detail: "Below lower band" });
    else if (pctB > 0.85) signals.push({ name: "Bollinger", direction: "SELL", strength: Math.round((pctB - 0.85) / 0.15 * 100), value: `${(pctB * 100).toFixed(0)}%B`, detail: "Above upper band" });
    else signals.push({ name: "Bollinger", direction: "NEUTRAL", strength: 0, value: `${(pctB * 100).toFixed(0)}%B`, detail: "Within bands" });
  }

  const sma50 = sma(prices, Math.min(50, Math.floor(prices.length / 2)));
  const sma20 = sma(prices, Math.min(20, Math.floor(prices.length / 3)));
  if (sma50.length > 0 && sma20.length > 0) {
    const s50 = sma50[sma50.length - 1];
    const s20 = sma20[sma20.length - 1];
    const aboveBoth = currentPrice > s50 && currentPrice > s20;
    const belowBoth = currentPrice < s50 && currentPrice < s20;
    if (aboveBoth) signals.push({ name: "MA Trend", direction: "BUY", strength: Math.min(75, Math.round(((currentPrice - s50) / s50) * 1000)), value: `>${Math.round(s50)}`, detail: "Price above MAs" });
    else if (belowBoth) signals.push({ name: "MA Trend", direction: "SELL", strength: Math.min(75, Math.round(((s50 - currentPrice) / s50) * 1000)), value: `<${Math.round(s50)}`, detail: "Price below MAs" });
    else signals.push({ name: "MA Trend", direction: "NEUTRAL", strength: 0, value: "mixed", detail: "Mixed signals" });
  }

  if (volumes.length > 20) {
    const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const curVol = volumes[volumes.length - 1];
    const volRatio = curVol / avgVol;
    const priceChange = (prices[prices.length - 1] - prices[prices.length - 5]) / prices[prices.length - 5];
    if (volRatio > 1.5 && priceChange > 0) signals.push({ name: "Volume", direction: "BUY", strength: Math.min(80, Math.round(volRatio * 30)), value: `${volRatio.toFixed(1)}x`, detail: "High volume breakout" });
    else if (volRatio > 1.5 && priceChange < 0) signals.push({ name: "Volume", direction: "SELL", strength: Math.min(80, Math.round(volRatio * 30)), value: `${volRatio.toFixed(1)}x`, detail: "High volume breakdown" });
    else signals.push({ name: "Volume", direction: "NEUTRAL", strength: 0, value: `${volRatio.toFixed(1)}x`, detail: "Normal volume" });
  }

  const buySignals = signals.filter(s => s.direction === "BUY");
  const sellSignals = signals.filter(s => s.direction === "SELL");
  const buyConf = buySignals.length;
  const sellConf = sellSignals.length;

  let direction = "NEUTRAL";
  let confluence = 0;
  if (buyConf >= MIN_CONFLUENCE) { direction = "BUY"; confluence = buyConf; }
  else if (sellConf >= MIN_CONFLUENCE) { direction = "SELL"; confluence = sellConf; }
  else { confluence = Math.max(buyConf, sellConf); }

  const avgStrength = signals.filter(s => s.direction === direction).reduce((s, sig) => s + sig.strength, 0) / Math.max(1, signals.filter(s => s.direction === direction).length);

  return { signals, confluence, direction, totalSignals: signals.length, avgStrength: Math.round(avgStrength) };
}

export function getPortfolio() {
  return LS.get("trading_portfolio", {
    balance: INITIAL_BALANCE,
    positions: [],
    history: [],
    totalTrades: 0,
    wins: 0,
    losses: 0,
    totalPnL: 0,
    autoTrade: false,
    riskLevel: "medium",
  });
}

export function savePortfolio(portfolio) {
  LS.set("trading_portfolio", portfolio);
}

export function resetPortfolio() {
  const fresh = {
    balance: INITIAL_BALANCE,
    positions: [],
    history: [],
    totalTrades: 0,
    wins: 0,
    losses: 0,
    totalPnL: 0,
    autoTrade: false,
    riskLevel: "medium",
  };
  savePortfolio(fresh);
  return fresh;
}

function getRiskMultiplier(riskLevel) {
  if (riskLevel === "conservative") return 0.5;
  if (riskLevel === "aggressive") return 2;
  return 1;
}

export function executeTrade(portfolio, coinId, direction, currentPrice, analysis) {
  const coin = COINS.find(c => c.id === coinId);
  if (!coin) return portfolio;

  const existing = portfolio.positions.find(p => p.coinId === coinId);
  if (existing) return portfolio;

  const riskMult = getRiskMultiplier(portfolio.riskLevel);
  const positionValue = portfolio.balance * POSITION_SIZE_PCT * riskMult;
  if (positionValue < 1 || positionValue > portfolio.balance) return portfolio;

  const qty = positionValue / currentPrice;
  const stopLoss = direction === "BUY"
    ? currentPrice * (1 - STOP_LOSS_PCT * riskMult)
    : currentPrice * (1 + STOP_LOSS_PCT * riskMult);
  const takeProfit = direction === "BUY"
    ? currentPrice * (1 + TAKE_PROFIT_PCT * riskMult)
    : currentPrice * (1 - TAKE_PROFIT_PCT * riskMult);

  const position = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    coinId,
    symbol: coin.symbol,
    direction,
    entryPrice: currentPrice,
    quantity: qty,
    value: positionValue,
    stopLoss,
    takeProfit,
    confluence: analysis.confluence,
    signals: analysis.signals.filter(s => s.direction === direction).map(s => s.name),
    openedAt: Date.now(),
  };

  return {
    ...portfolio,
    balance: portfolio.balance - positionValue,
    positions: [...portfolio.positions, position],
  };
}

export function closePosition(portfolio, positionId, currentPrice, reason = "manual") {
  const pos = portfolio.positions.find(p => p.id === positionId);
  if (!pos) return portfolio;

  const exitValue = pos.direction === "BUY"
    ? pos.quantity * currentPrice
    : pos.value + (pos.entryPrice - currentPrice) * pos.quantity;

  const pnl = exitValue - pos.value;
  const pnlPct = (pnl / pos.value) * 100;
  const isWin = pnl > 0;

  const trade = {
    ...pos,
    exitPrice: currentPrice,
    pnl,
    pnlPct,
    exitValue,
    reason,
    closedAt: Date.now(),
    result: isWin ? "WIN" : "LOSS",
  };

  return {
    ...portfolio,
    balance: portfolio.balance + exitValue,
    positions: portfolio.positions.filter(p => p.id !== positionId),
    history: [trade, ...portfolio.history].slice(0, 100),
    totalTrades: portfolio.totalTrades + 1,
    wins: portfolio.wins + (isWin ? 1 : 0),
    losses: portfolio.losses + (isWin ? 0 : 1),
    totalPnL: portfolio.totalPnL + pnl,
  };
}

export function checkStopLossAndTakeProfit(portfolio, currentPrices) {
  let updated = { ...portfolio };
  for (const pos of portfolio.positions) {
    const price = currentPrices[pos.coinId];
    if (!price) continue;

    if (pos.direction === "BUY") {
      if (price <= pos.stopLoss) updated = closePosition(updated, pos.id, price, "stop_loss");
      else if (price >= pos.takeProfit) updated = closePosition(updated, pos.id, price, "take_profit");
    } else {
      if (price >= pos.stopLoss) updated = closePosition(updated, pos.id, price, "stop_loss");
      else if (price <= pos.takeProfit) updated = closePosition(updated, pos.id, price, "take_profit");
    }
  }
  return updated;
}

export function getPerformanceMetrics(portfolio) {
  const winRate = portfolio.totalTrades === 0 ? 0 : (portfolio.wins / portfolio.totalTrades) * 100;
  const avgWin = portfolio.wins === 0 ? 0 : portfolio.history.filter(t => t.result === "WIN").reduce((s, t) => s + t.pnl, 0) / portfolio.wins;
  const avgLoss = portfolio.losses === 0 ? 0 : Math.abs(portfolio.history.filter(t => t.result === "LOSS").reduce((s, t) => s + t.pnl, 0) / portfolio.losses);
  const profitFactor = avgLoss === 0 ? avgWin > 0 ? Infinity : 0 : avgWin / avgLoss;
  const totalValue = portfolio.balance + portfolio.positions.reduce((s, p) => s + p.value, 0);
  const totalReturn = ((totalValue - INITIAL_BALANCE) / INITIAL_BALANCE) * 100;

  return {
    winRate: winRate.toFixed(1),
    totalTrades: portfolio.totalTrades,
    wins: portfolio.wins,
    losses: portfolio.losses,
    avgWin: avgWin.toFixed(2),
    avgLoss: avgLoss.toFixed(2),
    profitFactor: profitFactor === Infinity ? "INF" : profitFactor.toFixed(2),
    totalPnL: portfolio.totalPnL.toFixed(2),
    totalValue: totalValue.toFixed(2),
    totalReturn: totalReturn.toFixed(2),
    balance: portfolio.balance.toFixed(2),
  };
}
