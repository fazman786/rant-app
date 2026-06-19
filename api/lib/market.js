const COIN_IDS = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', DOT: 'polkadot', AVAX: 'avalanche-2', MATIC: 'matic-network', LINK: 'chainlink', SHIB: 'shiba-inu' };

async function tryBinanceKlines(pair, limit) {
  for (const base of ['https://api.binance.us', 'https://api.binance.com']) {
    try {
      const res = await fetch(`${base}/api/v3/klines?symbol=${pair}&interval=1h&limit=${limit}`);
      if (res.ok) return await res.json();
    } catch {}
  }
  return null;
}

export async function fetchHistoricalPrices(symbol, days = 14) {
  const pair = `${symbol.toUpperCase()}USDT`;
  const limit = days * 24;

  const binanceData = await tryBinanceKlines(pair, limit);
  if (binanceData && binanceData.length > 0) {
    return {
      prices: binanceData.map(c => parseFloat(c[4])),
      timestamps: binanceData.map(c => c[0]),
      volumes: binanceData.map(c => parseFloat(c[5]) * parseFloat(c[4])),
    };
  }

  const coinId = COIN_IDS[symbol.toUpperCase()];
  if (!coinId) throw new Error(`Unknown symbol: ${symbol}`);
  const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`);
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  const data = await res.json();
  return {
    prices: data.prices.map(p => p[1]),
    timestamps: data.prices.map(p => p[0]),
    volumes: (data.total_volumes || []).map(v => v[1]),
  };
}

async function tryBinanceTicker() {
  for (const base of ['https://api.binance.us', 'https://api.binance.com']) {
    try {
      const res = await fetch(`${base}/api/v3/ticker/24hr`);
      if (res.ok) return await res.json();
    } catch {}
  }
  return null;
}

export async function fetchMultiPrices(symbols) {
  const tickers = await tryBinanceTicker();
  if (tickers) {
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
    if (Object.keys(result).length > 0) return result;
  }

  const ids = symbols.map(s => COIN_IDS[s.toUpperCase()]).filter(Boolean).join(',');
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`);
  if (!res.ok) throw new Error(`CoinGecko price error: ${res.status}`);
  const data = await res.json();
  const result = {};
  for (const s of symbols) {
    const coinId = COIN_IDS[s.toUpperCase()];
    if (coinId && data[coinId]) {
      result[s] = {
        price: data[coinId].usd,
        change24h: data[coinId].usd_24h_change || 0,
        volume: data[coinId].usd_24h_vol || 0,
      };
    }
  }
  return result;
}
