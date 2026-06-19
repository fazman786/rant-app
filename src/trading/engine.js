import { sma, ema, rsi, macd, bollingerBands, stochastic, atr } from "./indicators.js";

const LS = {
  get: (k, fb = null) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const MIN_STRENGTH = 25;

export function analyzeSignals(prices, volumes = [], minConfluence = 2) {
  if (prices.length < 50) return { signals: [], confluence: 0, direction: "NEUTRAL", totalSignals: 0, avgStrength: 0, confidence: 0, summary: "Insufficient data" };

  const signals = [];
  const currentPrice = prices[prices.length - 1];

  // RSI — tighter thresholds for higher accuracy
  const rsiValues = rsi(prices, 14);
  const currentRSI = rsiValues[rsiValues.length - 1];
  if (currentRSI !== undefined) {
    const prevRSI = rsiValues.length > 2 ? rsiValues[rsiValues.length - 3] : currentRSI;
    if (currentRSI < 25 && currentRSI < prevRSI) {
      signals.push({ name: "RSI", direction: "BUY", strength: Math.round((25 - currentRSI) / 25 * 100), value: currentRSI.toFixed(1), detail: `Deep oversold (${currentRSI.toFixed(0)})` });
    } else if (currentRSI > 75 && currentRSI > prevRSI) {
      signals.push({ name: "RSI", direction: "SELL", strength: Math.round((currentRSI - 75) / 25 * 100), value: currentRSI.toFixed(1), detail: `Deep overbought (${currentRSI.toFixed(0)})` });
    } else if (currentRSI < 35 && prevRSI < currentRSI) {
      signals.push({ name: "RSI", direction: "BUY", strength: Math.round((35 - currentRSI) / 35 * 80), value: currentRSI.toFixed(1), detail: `Oversold reversal (${currentRSI.toFixed(0)})` });
    } else if (currentRSI > 65 && prevRSI > currentRSI) {
      signals.push({ name: "RSI", direction: "SELL", strength: Math.round((currentRSI - 65) / 35 * 80), value: currentRSI.toFixed(1), detail: `Overbought reversal (${currentRSI.toFixed(0)})` });
    } else {
      signals.push({ name: "RSI", direction: "NEUTRAL", strength: 0, value: currentRSI.toFixed(1), detail: "Neutral zone" });
    }
  }

  // EMA Cross — require actual crossover or strong trend
  const ema12 = ema(prices, 12);
  const ema26 = ema(prices, 26);
  if (ema12.length > 2 && ema26.length > 2) {
    const fastEMA = ema12[ema12.length - 1];
    const slowEMA = ema26[ema26.length - 1];
    const prevFast = ema12[ema12.length - 2];
    const prevSlow = ema26[ema26.length - 2];
    const prev2Fast = ema12[ema12.length - 3];
    const prev2Slow = ema26[ema26.length - 3];
    const crossUp = prevFast <= prevSlow && fastEMA > slowEMA;
    const crossDown = prevFast >= prevSlow && fastEMA < slowEMA;
    const recentCrossUp = prev2Fast <= prev2Slow && prevFast > prevSlow && fastEMA > slowEMA;
    const recentCrossDown = prev2Fast >= prev2Slow && prevFast < prevSlow && fastEMA < slowEMA;
    const spread = ((fastEMA - slowEMA) / slowEMA) * 100;
    const spreadWidening = Math.abs(spread) > Math.abs(((prevFast - prevSlow) / prevSlow) * 100);

    if (crossUp || recentCrossUp) {
      signals.push({ name: "EMA Cross", direction: "BUY", strength: crossUp ? 90 : 75, value: `${spread.toFixed(2)}%`, detail: crossUp ? "Bullish crossover" : "Recent bullish cross" });
    } else if (crossDown || recentCrossDown) {
      signals.push({ name: "EMA Cross", direction: "SELL", strength: crossDown ? 90 : 75, value: `${spread.toFixed(2)}%`, detail: crossDown ? "Bearish crossover" : "Recent bearish cross" });
    } else if (spread > 1.0 && spreadWidening) {
      signals.push({ name: "EMA Cross", direction: "BUY", strength: Math.min(70, Math.round(spread * 25)), value: `${spread.toFixed(2)}%`, detail: "Strong bullish momentum" });
    } else if (spread < -1.0 && spreadWidening) {
      signals.push({ name: "EMA Cross", direction: "SELL", strength: Math.min(70, Math.round(Math.abs(spread) * 25)), value: `${spread.toFixed(2)}%`, detail: "Strong bearish momentum" });
    } else {
      signals.push({ name: "EMA Cross", direction: "NEUTRAL", strength: 0, value: `${spread.toFixed(2)}%`, detail: "No clear trend" });
    }
  }

  // MACD — require crossover or strong histogram divergence
  const macdData = macd(prices);
  const hist = macdData.histogram;
  if (hist.length > 3) {
    const h0 = hist[hist.length - 1];
    const h1 = hist[hist.length - 2];
    const h2 = hist[hist.length - 3];
    const crossUp = h1 < 0 && h0 > 0;
    const crossDown = h1 > 0 && h0 < 0;
    const risingHist = h0 > h1 && h1 > h2;
    const fallingHist = h0 < h1 && h1 < h2;
    const histStrength = Math.abs(h0 / currentPrice * 10000);

    if (crossUp) {
      signals.push({ name: "MACD", direction: "BUY", strength: 85, value: h0.toFixed(2), detail: "Bullish signal cross" });
    } else if (crossDown) {
      signals.push({ name: "MACD", direction: "SELL", strength: 85, value: h0.toFixed(2), detail: "Bearish signal cross" });
    } else if (h0 > 0 && risingHist && histStrength > 2) {
      signals.push({ name: "MACD", direction: "BUY", strength: Math.min(70, Math.round(histStrength * 10)), value: h0.toFixed(2), detail: "Rising bullish momentum" });
    } else if (h0 < 0 && fallingHist && histStrength > 2) {
      signals.push({ name: "MACD", direction: "SELL", strength: Math.min(70, Math.round(histStrength * 10)), value: h0.toFixed(2), detail: "Falling bearish momentum" });
    } else {
      signals.push({ name: "MACD", direction: "NEUTRAL", strength: 0, value: h0.toFixed(2), detail: "Weak momentum" });
    }
  }

  // Bollinger Bands — tighter thresholds + squeeze detection
  const bb = bollingerBands(prices, 20, 2);
  if (bb.upper.length > 1) {
    const upperBand = bb.upper[bb.upper.length - 1];
    const lowerBand = bb.lower[bb.lower.length - 1];
    const midBand = bb.middle[bb.middle.length - 1];
    const bandWidth = upperBand - lowerBand;
    const pctB = bandWidth === 0 ? 0.5 : (currentPrice - lowerBand) / bandWidth;
    const prevUpper = bb.upper[bb.upper.length - 2];
    const prevLower = bb.lower[bb.lower.length - 2];
    const prevWidth = prevUpper - prevLower;
    const squeezing = bandWidth < prevWidth * 0.9;

    if (pctB < 0.05) {
      signals.push({ name: "Bollinger", direction: "BUY", strength: 90, value: `${(pctB * 100).toFixed(0)}%B`, detail: "Extreme lower band touch" });
    } else if (pctB > 0.95) {
      signals.push({ name: "Bollinger", direction: "SELL", strength: 90, value: `${(pctB * 100).toFixed(0)}%B`, detail: "Extreme upper band touch" });
    } else if (pctB < 0.15 && squeezing) {
      signals.push({ name: "Bollinger", direction: "BUY", strength: 70, value: `${(pctB * 100).toFixed(0)}%B`, detail: "Lower band + squeeze" });
    } else if (pctB > 0.85 && squeezing) {
      signals.push({ name: "Bollinger", direction: "SELL", strength: 70, value: `${(pctB * 100).toFixed(0)}%B`, detail: "Upper band + squeeze" });
    } else {
      signals.push({ name: "Bollinger", direction: "NEUTRAL", strength: 0, value: `${(pctB * 100).toFixed(0)}%B`, detail: "Within bands" });
    }
  }

  // MA Trend — require price meaningfully above/below + MAs aligned
  const len50 = Math.min(50, Math.floor(prices.length / 2));
  const len20 = Math.min(20, Math.floor(prices.length / 3));
  const sma50 = sma(prices, len50);
  const sma20 = sma(prices, len20);
  if (sma50.length > 1 && sma20.length > 1) {
    const s50 = sma50[sma50.length - 1];
    const s20 = sma20[sma20.length - 1];
    const prevS50 = sma50[sma50.length - 2];
    const prevS20 = sma20[sma20.length - 2];
    const aboveBoth = currentPrice > s50 && currentPrice > s20;
    const belowBoth = currentPrice < s50 && currentPrice < s20;
    const masAlignedBull = s20 > s50 && s20 > prevS20;
    const masAlignedBear = s20 < s50 && s20 < prevS20;
    const distFromMA = Math.abs(currentPrice - s50) / s50 * 100;

    if (aboveBoth && masAlignedBull && distFromMA > 0.5) {
      signals.push({ name: "MA Trend", direction: "BUY", strength: Math.min(80, Math.round(distFromMA * 20)), value: `+${distFromMA.toFixed(1)}%`, detail: "Strong uptrend" });
    } else if (belowBoth && masAlignedBear && distFromMA > 0.5) {
      signals.push({ name: "MA Trend", direction: "SELL", strength: Math.min(80, Math.round(distFromMA * 20)), value: `-${distFromMA.toFixed(1)}%`, detail: "Strong downtrend" });
    } else {
      signals.push({ name: "MA Trend", direction: "NEUTRAL", strength: 0, value: "mixed", detail: "No clear trend" });
    }
  }

  // Volume — require higher volume threshold + price confirmation
  if (volumes.length > 20) {
    const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const curVol = volumes[volumes.length - 1];
    const volRatio = avgVol > 0 ? curVol / avgVol : 1;
    const priceChange5 = prices.length > 5 ? (prices[prices.length - 1] - prices[prices.length - 5]) / prices[prices.length - 5] * 100 : 0;
    const priceChange3 = prices.length > 3 ? (prices[prices.length - 1] - prices[prices.length - 3]) / prices[prices.length - 3] * 100 : 0;
    const consistentUp = priceChange5 > 0 && priceChange3 > 0;
    const consistentDown = priceChange5 < 0 && priceChange3 < 0;

    if (volRatio > 2.0 && consistentUp && Math.abs(priceChange5) > 0.5) {
      signals.push({ name: "Volume", direction: "BUY", strength: Math.min(85, Math.round(volRatio * 25)), value: `${volRatio.toFixed(1)}x`, detail: `Surge + ${priceChange5.toFixed(1)}% up` });
    } else if (volRatio > 2.0 && consistentDown && Math.abs(priceChange5) > 0.5) {
      signals.push({ name: "Volume", direction: "SELL", strength: Math.min(85, Math.round(volRatio * 25)), value: `${volRatio.toFixed(1)}x`, detail: `Surge + ${Math.abs(priceChange5).toFixed(1)}% down` });
    } else {
      signals.push({ name: "Volume", direction: "NEUTRAL", strength: 0, value: `${volRatio.toFixed(1)}x`, detail: "Normal volume" });
    }
  }

  // Only count strong signals toward confluence
  const strongBuy = signals.filter(s => s.direction === "BUY" && s.strength >= MIN_STRENGTH);
  const strongSell = signals.filter(s => s.direction === "SELL" && s.strength >= MIN_STRENGTH);
  const buySignals = signals.filter(s => s.direction === "BUY");
  const sellSignals = signals.filter(s => s.direction === "SELL");

  let direction = "NEUTRAL";
  let confluence = Math.max(strongBuy.length, strongSell.length);
  if (strongBuy.length >= minConfluence && strongBuy.length > strongSell.length) direction = "BUY";
  else if (strongSell.length >= minConfluence && strongSell.length > strongBuy.length) direction = "SELL";

  const dirSignals = direction === "BUY" ? strongBuy : direction === "SELL" ? strongSell : [];
  const avgStrength = dirSignals.length > 0 ? Math.round(dirSignals.reduce((s, sig) => s + sig.strength, 0) / dirSignals.length) : 0;
  const confidence = signals.length > 0 ? Math.round((confluence / signals.length) * avgStrength) : 0;

  let summary = "No clear signal — waiting for high-probability setup";
  if (direction === "BUY") summary = `HIGH PROBABILITY BUY — ${confluence} strong indicators (${strongBuy.map(s => s.name).join(", ")}) · ${confidence}% confidence`;
  else if (direction === "SELL") summary = `HIGH PROBABILITY SELL — ${confluence} strong indicators (${strongSell.map(s => s.name).join(", ")}) · ${confidence}% confidence`;
  else if (confluence >= 2) summary = `Building ${strongBuy.length >= strongSell.length ? "bullish" : "bearish"} — ${confluence} strong, need ${minConfluence}`;

  return { signals, confluence, direction, totalSignals: signals.length, avgStrength, confidence, summary };
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
    riskLevel: "conservative",
    positionSizePct: 3,
    stopLossPct: 1.5,
    takeProfitPct: 4.5,
    maxOpenPositions: 2,
    scanIntervalSec: 120,
    enabledPairs: ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA"],
    trailingStop: true,
    trailingStopPct: 1.0,
    dailyLossLimit: 300,
    confluenceRequired: 2,
  });
}

export function saveBotConfig(config) {
  LS.set("bot_config", config);
}

export function getBalance() {
  return LS.get("bot_balance", { available: 10000, total: 10000 });
}

export function saveBalance(balance) {
  LS.set("bot_balance", balance);
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

  const bal = getBalance();
  bal.available = Math.max(0, bal.available - value);
  saveBalance(bal);

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

  const bal = getBalance();
  bal.available += pos.value + pnl;
  bal.total += pnl;
  saveBalance(bal);

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
  localStorage.removeItem("bot_balance");
}
