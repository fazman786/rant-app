export async function fetchHistoricalPrices(symbol, days = 14) {
  const pair = `${symbol.toUpperCase()}USDT`;
  const limit = days * 24;
  const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1h&limit=${limit}`);
  if (!res.ok) throw new Error(`Binance klines error: ${res.status}`);
  const data = await res.json();
  return {
    prices: data.map(c => parseFloat(c[4])),
    timestamps: data.map(c => c[0]),
    volumes: data.map(c => parseFloat(c[5]) * parseFloat(c[4])),
  };
}

export async function fetchMultiPrices(symbols) {
  const res = await fetch("https://api.binance.com/api/v3/ticker/24hr");
  if (!res.ok) throw new Error(`Binance ticker error: ${res.status}`);
  const tickers = await res.json();
  const result = {};
  for (const s of symbols) {
    const t = tickers.find(tk => tk.symbol === `${s}USDT`);
    if (t) {
      result[s] = {
        price: parseFloat(t.lastPrice),
        change24h: parseFloat(t.priceChangePercent),
        volume: parseFloat(t.quoteVolume),
      };
    }
  }
  return result;
}
