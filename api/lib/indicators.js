export function sma(data, period) {
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    result.push(sum / period);
  }
  return result;
}

export function ema(data, period) {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const result = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

export function rsi(data, period = 14) {
  if (data.length < period + 1) return [];
  const changes = [];
  for (let i = 1; i < data.length; i++) changes.push(data[i] - data[i - 1]);

  const result = [];
  let avgGain = 0, avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

export function macd(data, fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(data, fast);
  const emaSlow = ema(data, slow);
  const macdLine = emaFast.map((v, i) => v - emaSlow[i]);
  const signalLine = ema(macdLine, signal);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  return { macdLine, signalLine, histogram };
}

export function bollingerBands(data, period = 20, mult = 2) {
  const mid = sma(data, period);
  const upper = [], lower = [];
  for (let i = 0; i < mid.length; i++) {
    const slice = data.slice(i, i + period);
    const variance = slice.reduce((s, v) => s + (v - mid[i]) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    upper.push(mid[i] + mult * std);
    lower.push(mid[i] - mult * std);
  }
  return { upper, middle: mid, lower };
}

export function stochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
  const kValues = [];
  for (let i = kPeriod - 1; i < closes.length; i++) {
    const highSlice = highs.slice(i - kPeriod + 1, i + 1);
    const lowSlice = lows.slice(i - kPeriod + 1, i + 1);
    const hh = Math.max(...highSlice);
    const ll = Math.min(...lowSlice);
    const k = hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100;
    kValues.push(k);
  }
  const dValues = sma(kValues, dPeriod);
  return { k: kValues, d: dValues };
}

export function atr(highs, lows, closes, period = 14) {
  const tr = [];
  for (let i = 1; i < closes.length; i++) {
    tr.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ));
  }
  return sma(tr, period);
}

export function vwap(closes, volumes) {
  let cumVol = 0, cumTP = 0;
  return closes.map((c, i) => {
    cumTP += c * volumes[i];
    cumVol += volumes[i];
    return cumVol === 0 ? c : cumTP / cumVol;
  });
}

export function obv(closes, volumes) {
  const result = [0];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) result.push(result[i - 1] + volumes[i]);
    else if (closes[i] < closes[i - 1]) result.push(result[i - 1] - volumes[i]);
    else result.push(result[i - 1]);
  }
  return result;
}
