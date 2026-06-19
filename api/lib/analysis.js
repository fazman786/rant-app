import { sma, ema, rsi, macd, bollingerBands } from './indicators.js';

const MIN_STRENGTH = 40;

export function analyzeSignals(prices, volumes = [], minConfluence = 4) {
  if (prices.length < 50) return { signals: [], confluence: 0, direction: "NEUTRAL", totalSignals: 0, avgStrength: 0, confidence: 0, summary: "Insufficient data" };

  const signals = [];
  const currentPrice = prices[prices.length - 1];

  const rsiValues = rsi(prices, 14);
  const currentRSI = rsiValues[rsiValues.length - 1];
  if (currentRSI !== undefined) {
    const prevRSI = rsiValues.length > 2 ? rsiValues[rsiValues.length - 3] : currentRSI;
    if (currentRSI < 25 && currentRSI < prevRSI) signals.push({ name: "RSI", direction: "BUY", strength: Math.round((25 - currentRSI) / 25 * 100), value: currentRSI.toFixed(1), detail: `Deep oversold` });
    else if (currentRSI > 75 && currentRSI > prevRSI) signals.push({ name: "RSI", direction: "SELL", strength: Math.round((currentRSI - 75) / 25 * 100), value: currentRSI.toFixed(1), detail: `Deep overbought` });
    else if (currentRSI < 35 && prevRSI < currentRSI) signals.push({ name: "RSI", direction: "BUY", strength: Math.round((35 - currentRSI) / 35 * 80), value: currentRSI.toFixed(1), detail: `Oversold reversal` });
    else if (currentRSI > 65 && prevRSI > currentRSI) signals.push({ name: "RSI", direction: "SELL", strength: Math.round((currentRSI - 65) / 35 * 80), value: currentRSI.toFixed(1), detail: `Overbought reversal` });
    else signals.push({ name: "RSI", direction: "NEUTRAL", strength: 0, value: currentRSI.toFixed(1), detail: "Neutral zone" });
  }

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

    if (crossUp || recentCrossUp) signals.push({ name: "EMA Cross", direction: "BUY", strength: crossUp ? 90 : 75, value: `${spread.toFixed(2)}%`, detail: crossUp ? "Bullish crossover" : "Recent bullish cross" });
    else if (crossDown || recentCrossDown) signals.push({ name: "EMA Cross", direction: "SELL", strength: crossDown ? 90 : 75, value: `${spread.toFixed(2)}%`, detail: crossDown ? "Bearish crossover" : "Recent bearish cross" });
    else if (spread > 1.0 && spreadWidening) signals.push({ name: "EMA Cross", direction: "BUY", strength: Math.min(70, Math.round(spread * 25)), value: `${spread.toFixed(2)}%`, detail: "Strong bullish momentum" });
    else if (spread < -1.0 && spreadWidening) signals.push({ name: "EMA Cross", direction: "SELL", strength: Math.min(70, Math.round(Math.abs(spread) * 25)), value: `${spread.toFixed(2)}%`, detail: "Strong bearish momentum" });
    else signals.push({ name: "EMA Cross", direction: "NEUTRAL", strength: 0, value: `${spread.toFixed(2)}%`, detail: "No clear trend" });
  }

  const macdData = macd(prices);
  const hist = macdData.histogram;
  if (hist.length > 3) {
    const h0 = hist[hist.length - 1], h1 = hist[hist.length - 2], h2 = hist[hist.length - 3];
    const crossUp = h1 < 0 && h0 > 0;
    const crossDown = h1 > 0 && h0 < 0;
    const risingHist = h0 > h1 && h1 > h2;
    const fallingHist = h0 < h1 && h1 < h2;
    const histStrength = Math.abs(h0 / currentPrice * 10000);

    if (crossUp) signals.push({ name: "MACD", direction: "BUY", strength: 85, value: h0.toFixed(2), detail: "Bullish signal cross" });
    else if (crossDown) signals.push({ name: "MACD", direction: "SELL", strength: 85, value: h0.toFixed(2), detail: "Bearish signal cross" });
    else if (h0 > 0 && risingHist && histStrength > 2) signals.push({ name: "MACD", direction: "BUY", strength: Math.min(70, Math.round(histStrength * 10)), value: h0.toFixed(2), detail: "Rising bullish momentum" });
    else if (h0 < 0 && fallingHist && histStrength > 2) signals.push({ name: "MACD", direction: "SELL", strength: Math.min(70, Math.round(histStrength * 10)), value: h0.toFixed(2), detail: "Falling bearish momentum" });
    else signals.push({ name: "MACD", direction: "NEUTRAL", strength: 0, value: h0.toFixed(2), detail: "Weak momentum" });
  }

  const bb = bollingerBands(prices, 20, 2);
  if (bb.upper.length > 1) {
    const upperBand = bb.upper[bb.upper.length - 1];
    const lowerBand = bb.lower[bb.lower.length - 1];
    const bandWidth = upperBand - lowerBand;
    const pctB = bandWidth === 0 ? 0.5 : (currentPrice - lowerBand) / bandWidth;
    const prevWidth = bb.upper[bb.upper.length - 2] - bb.lower[bb.lower.length - 2];
    const squeezing = bandWidth < prevWidth * 0.9;

    if (pctB < 0.05) signals.push({ name: "Bollinger", direction: "BUY", strength: 90, value: `${(pctB * 100).toFixed(0)}%B`, detail: "Extreme lower band" });
    else if (pctB > 0.95) signals.push({ name: "Bollinger", direction: "SELL", strength: 90, value: `${(pctB * 100).toFixed(0)}%B`, detail: "Extreme upper band" });
    else if (pctB < 0.15 && squeezing) signals.push({ name: "Bollinger", direction: "BUY", strength: 70, value: `${(pctB * 100).toFixed(0)}%B`, detail: "Lower band + squeeze" });
    else if (pctB > 0.85 && squeezing) signals.push({ name: "Bollinger", direction: "SELL", strength: 70, value: `${(pctB * 100).toFixed(0)}%B`, detail: "Upper band + squeeze" });
    else signals.push({ name: "Bollinger", direction: "NEUTRAL", strength: 0, value: `${(pctB * 100).toFixed(0)}%B`, detail: "Within bands" });
  }

  const len50 = Math.min(50, Math.floor(prices.length / 2));
  const len20 = Math.min(20, Math.floor(prices.length / 3));
  const sma50 = sma(prices, len50);
  const sma20 = sma(prices, len20);
  if (sma50.length > 1 && sma20.length > 1) {
    const s50 = sma50[sma50.length - 1], s20 = sma20[sma20.length - 1];
    const prevS20 = sma20[sma20.length - 2];
    const aboveBoth = currentPrice > s50 && currentPrice > s20;
    const belowBoth = currentPrice < s50 && currentPrice < s20;
    const distFromMA = Math.abs(currentPrice - s50) / s50 * 100;

    if (aboveBoth && s20 > s50 && s20 > prevS20 && distFromMA > 0.5) signals.push({ name: "MA Trend", direction: "BUY", strength: Math.min(80, Math.round(distFromMA * 20)), value: `+${distFromMA.toFixed(1)}%`, detail: "Strong uptrend" });
    else if (belowBoth && s20 < s50 && s20 < prevS20 && distFromMA > 0.5) signals.push({ name: "MA Trend", direction: "SELL", strength: Math.min(80, Math.round(distFromMA * 20)), value: `-${distFromMA.toFixed(1)}%`, detail: "Strong downtrend" });
    else signals.push({ name: "MA Trend", direction: "NEUTRAL", strength: 0, value: "mixed", detail: "No clear trend" });
  }

  if (volumes.length > 20) {
    const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const curVol = volumes[volumes.length - 1];
    const volRatio = avgVol > 0 ? curVol / avgVol : 1;
    const priceChange5 = prices.length > 5 ? (prices[prices.length - 1] - prices[prices.length - 5]) / prices[prices.length - 5] * 100 : 0;
    const priceChange3 = prices.length > 3 ? (prices[prices.length - 1] - prices[prices.length - 3]) / prices[prices.length - 3] * 100 : 0;

    if (volRatio > 2.0 && priceChange5 > 0 && priceChange3 > 0 && Math.abs(priceChange5) > 0.5) signals.push({ name: "Volume", direction: "BUY", strength: Math.min(85, Math.round(volRatio * 25)), value: `${volRatio.toFixed(1)}x`, detail: `Surge + ${priceChange5.toFixed(1)}% up` });
    else if (volRatio > 2.0 && priceChange5 < 0 && priceChange3 < 0 && Math.abs(priceChange5) > 0.5) signals.push({ name: "Volume", direction: "SELL", strength: Math.min(85, Math.round(volRatio * 25)), value: `${volRatio.toFixed(1)}x`, detail: `Surge + ${Math.abs(priceChange5).toFixed(1)}% down` });
    else signals.push({ name: "Volume", direction: "NEUTRAL", strength: 0, value: `${volRatio.toFixed(1)}x`, detail: "Normal volume" });
  }

  const strongBuy = signals.filter(s => s.direction === "BUY" && s.strength >= MIN_STRENGTH);
  const strongSell = signals.filter(s => s.direction === "SELL" && s.strength >= MIN_STRENGTH);

  let direction = "NEUTRAL";
  let confluence = Math.max(strongBuy.length, strongSell.length);
  if (strongBuy.length >= minConfluence && strongBuy.length > strongSell.length) direction = "BUY";
  else if (strongSell.length >= minConfluence && strongSell.length > strongBuy.length) direction = "SELL";

  const dirSignals = direction === "BUY" ? strongBuy : direction === "SELL" ? strongSell : [];
  const avgStrength = dirSignals.length > 0 ? Math.round(dirSignals.reduce((s, sig) => s + sig.strength, 0) / dirSignals.length) : 0;
  const confidence = signals.length > 0 ? Math.round((confluence / signals.length) * avgStrength) : 0;

  let summary = "Waiting for high-probability setup";
  if (direction === "BUY") summary = `HIGH PROB BUY — ${confluence} strong indicators · ${confidence}% confidence`;
  else if (direction === "SELL") summary = `HIGH PROB SELL — ${confluence} strong indicators · ${confidence}% confidence`;

  return { signals, confluence, direction, totalSignals: signals.length, avgStrength, confidence, summary };
}
