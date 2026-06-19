async function hmacSHA256(key, message) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function qs(params) {
  return Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
}

const LS = {
  get: (k, fb = null) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

export const EXCHANGES = [
  { id: "demo", name: "Demo Mode", description: "Paper trading with live market data", icon: "🧪", requiresKeys: false },
  { id: "binance", name: "Binance", description: "World's largest crypto exchange", icon: "🟡", requiresKeys: true, apiUrl: "https://api.binance.com", wsUrl: "wss://stream.binance.com:9443/ws" },
  { id: "bybit", name: "Bybit", description: "Popular derivatives exchange", icon: "🟠", requiresKeys: true, apiUrl: "https://api.bybit.com", wsUrl: "wss://stream.bybit.com/v5/public/spot" },
  { id: "coinbase", name: "Coinbase", description: "US-regulated exchange", icon: "🔵", requiresKeys: true, apiUrl: "https://api.coinbase.com" },
  { id: "kraken", name: "Kraken", description: "Established European exchange", icon: "🟣", requiresKeys: true, apiUrl: "https://api.kraken.com" },
  { id: "webhook", name: "Webhook / Any Platform", description: "Send signals to any trading platform via webhooks (3Commas, Cornix, TradingView, etc.)", icon: "🔗", requiresKeys: false, requiresWebhook: true },
];

export function getExchangeConfig() {
  return LS.get("exchange_config", null);
}

export function saveExchangeConfig(config) {
  LS.set("exchange_config", config);
}

export function clearExchangeConfig() {
  localStorage.removeItem("exchange_config");
}

class BaseExchange {
  constructor(config) {
    this.config = config;
    this.connected = false;
  }
  async connect() { this.connected = true; return true; }
  async disconnect() { this.connected = false; }
  async getBalance() { return { total: 0, available: 0, currency: "USDT" }; }
  async getTicker(symbol) { return { price: 0, change24h: 0, volume: 0 }; }
  async placeOrder(symbol, side, quantity, type = "MARKET", price = null) { return null; }
  async cancelOrder(symbol, orderId) { return false; }
  async getOpenOrders(symbol) { return []; }
  async getOrderHistory(symbol, limit = 50) { return []; }
  normalizeSymbol(base, quote = "USDT") { return `${base}${quote}`; }
}

class DemoExchange extends BaseExchange {
  constructor(config) {
    super(config);
    this.portfolio = LS.get("demo_portfolio", { balance: 10000, positions: {} });
  }

  async connect() {
    this.connected = true;
    return true;
  }

  async getBalance() {
    this.portfolio = LS.get("demo_portfolio", { balance: 10000, positions: {} });
    const posValue = Object.values(this.portfolio.positions).reduce((s, p) => s + p.value, 0);
    return { total: this.portfolio.balance + posValue, available: this.portfolio.balance, currency: "USD" };
  }

  async getTicker(symbol) {
    for (const base of ['https://api.binance.com', 'https://api.binance.us']) {
      try {
        const res = await fetch(`${base}/api/v3/ticker/24hr?symbol=${symbol}USDT`);
        if (res.ok) {
          const t = await res.json();
          return { price: parseFloat(t.lastPrice), change24h: parseFloat(t.priceChangePercent), volume: parseFloat(t.quoteVolume) };
        }
      } catch {}
    }
    try {
      const id = symbolToCoinGecko(symbol);
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currency=usd&include_24hr_change=true&include_24hr_vol=true`);
      const data = await res.json();
      if (data[id]) return { price: data[id].usd, change24h: data[id].usd_24h_change || 0, volume: data[id].usd_24h_vol || 0 };
    } catch {}
    return { price: 0, change24h: 0, volume: 0 };
  }

  async placeOrder(symbol, side, quantity, type = "MARKET", price = null) {
    this.portfolio = LS.get("demo_portfolio", { balance: 10000, positions: {} });
    const ticker = await this.getTicker(symbol);
    const execPrice = price || ticker.price;
    if (!execPrice) return null;

    const cost = quantity * execPrice;
    const orderId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    if (side === "BUY") {
      if (cost > this.portfolio.balance) return null;
      this.portfolio.balance -= cost;
      this.portfolio.positions[symbol] = {
        symbol, quantity, entryPrice: execPrice, value: cost, side: "BUY", openedAt: Date.now()
      };
    } else {
      const pos = this.portfolio.positions[symbol];
      if (pos) {
        const pnl = (execPrice - pos.entryPrice) * pos.quantity;
        this.portfolio.balance += pos.value + pnl;
        delete this.portfolio.positions[symbol];
      } else {
        this.portfolio.positions[`SHORT_${symbol}`] = {
          symbol, quantity, entryPrice: execPrice, value: cost, side: "SELL", openedAt: Date.now()
        };
      }
    }

    LS.set("demo_portfolio", this.portfolio);
    return { orderId, symbol, side, quantity, price: execPrice, status: "FILLED", timestamp: Date.now() };
  }

  async getOpenOrders() { return []; }
  async getOrderHistory() {
    return LS.get("demo_order_history", []);
  }
}

class BinanceExchange extends BaseExchange {
  constructor(config) {
    super(config);
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = config.testnet ? "https://testnet.binance.vision" : "https://api.binance.com";
    this.ws = null;
  }

  async signedRequest(method, endpoint, params = {}) {
    const timestamp = Date.now();
    const allParams = { ...params, timestamp, recvWindow: 10000 };
    const queryString = qs(allParams);
    const signature = await hmacSHA256(this.apiSecret, queryString);
    const url = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`;
    const res = await fetch(url, {
      method,
      headers: { "X-MBX-APIKEY": this.apiKey },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.msg || `Binance API error: ${res.status}`);
    }
    return res.json();
  }

  async publicRequest(endpoint, params = {}) {
    const queryString = qs(params);
    const url = `${this.baseUrl}${endpoint}${queryString ? "?" + queryString : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
    return res.json();
  }

  async connect() {
    try {
      const data = await this.signedRequest("GET", "/api/v3/account");
      this.connected = true;
      return true;
    } catch (e) {
      throw new Error(`Binance connection failed: ${e.message}`);
    }
  }

  async getBalance() {
    const data = await this.signedRequest("GET", "/api/v3/account");
    const usdtBal = data.balances?.find(b => b.asset === "USDT");
    const total = data.balances?.reduce((s, b) => s + parseFloat(b.free) + parseFloat(b.locked), 0) || 0;
    return {
      total,
      available: parseFloat(usdtBal?.free || 0),
      currency: "USDT",
      balances: data.balances?.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0),
    };
  }

  async getTicker(symbol) {
    const data = await this.publicRequest("/api/v3/ticker/24hr", { symbol: this.normalizeSymbol(symbol) });
    return {
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChangePercent),
      volume: parseFloat(data.quoteVolume),
      high: parseFloat(data.highPrice),
      low: parseFloat(data.lowPrice),
    };
  }

  async placeOrder(symbol, side, quantity, type = "MARKET", price = null) {
    const params = {
      symbol: this.normalizeSymbol(symbol),
      side: side.toUpperCase(),
      type: type.toUpperCase(),
      quantity: quantity.toString(),
    };
    if (type === "LIMIT" && price) {
      params.price = price.toString();
      params.timeInForce = "GTC";
    }
    const data = await this.signedRequest("POST", "/api/v3/order", params);
    return {
      orderId: data.orderId,
      symbol: data.symbol,
      side: data.side,
      quantity: parseFloat(data.executedQty || data.origQty),
      price: parseFloat(data.fills?.[0]?.price || data.price || 0),
      status: data.status,
      timestamp: data.transactTime,
    };
  }

  async cancelOrder(symbol, orderId) {
    await this.signedRequest("DELETE", "/api/v3/order", {
      symbol: this.normalizeSymbol(symbol),
      orderId,
    });
    return true;
  }

  async getOpenOrders(symbol) {
    const params = symbol ? { symbol: this.normalizeSymbol(symbol) } : {};
    return this.signedRequest("GET", "/api/v3/openOrders", params);
  }

  async getOrderHistory(symbol, limit = 50) {
    return this.signedRequest("GET", "/api/v3/allOrders", {
      symbol: this.normalizeSymbol(symbol),
      limit,
    });
  }

  normalizeSymbol(symbol) {
    if (symbol.includes("USDT")) return symbol;
    return `${symbol.replace("/", "").replace("-", "")}USDT`;
  }

  subscribePrice(symbol, callback) {
    const wsSymbol = this.normalizeSymbol(symbol).toLowerCase();
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${wsSymbol}@ticker`);
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      callback({
        price: parseFloat(data.c),
        change24h: parseFloat(data.P),
        volume: parseFloat(data.q),
      });
    };
    return () => ws.close();
  }
}

class BybitExchange extends BaseExchange {
  constructor(config) {
    super(config);
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = "https://api.bybit.com";
  }

  async signedRequest(method, endpoint, params = {}) {
    const timestamp = Date.now().toString();
    const queryString = method === "GET" ? qs(params) : "";
    const body = method === "POST" ? JSON.stringify(params) : "";
    const signStr = `${timestamp}${this.apiKey}${5000}${queryString || body}`;
    const signature = await hmacSHA256(this.apiSecret, signStr);
    const url = `${this.baseUrl}${endpoint}${queryString ? "?" + queryString : ""}`;
    const res = await fetch(url, {
      method,
      headers: {
        "X-BAPI-API-KEY": this.apiKey,
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-SIGN": signature,
        "X-BAPI-RECV-WINDOW": "5000",
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      ...(method === "POST" ? { body } : {}),
    });
    const data = await res.json();
    if (data.retCode !== 0) throw new Error(data.retMsg || "Bybit API error");
    return data.result;
  }

  async connect() {
    try {
      await this.signedRequest("GET", "/v5/account/wallet-balance", { accountType: "UNIFIED" });
      this.connected = true;
      return true;
    } catch (e) {
      throw new Error(`Bybit connection failed: ${e.message}`);
    }
  }

  async getBalance() {
    const data = await this.signedRequest("GET", "/v5/account/wallet-balance", { accountType: "UNIFIED" });
    const coin = data.list?.[0]?.coin?.find(c => c.coin === "USDT");
    return {
      total: parseFloat(data.list?.[0]?.totalEquity || 0),
      available: parseFloat(coin?.availableToWithdraw || 0),
      currency: "USDT",
    };
  }

  async getTicker(symbol) {
    const res = await fetch(`${this.baseUrl}/v5/market/tickers?category=spot&symbol=${symbol}USDT`);
    const data = await res.json();
    const t = data.result?.list?.[0];
    return {
      price: parseFloat(t?.lastPrice || 0),
      change24h: parseFloat(t?.price24hPcnt || 0) * 100,
      volume: parseFloat(t?.turnover24h || 0),
    };
  }

  async placeOrder(symbol, side, quantity, type = "MARKET") {
    return this.signedRequest("POST", "/v5/order/create", {
      category: "spot",
      symbol: `${symbol}USDT`,
      side: side === "BUY" ? "Buy" : "Sell",
      orderType: type === "MARKET" ? "Market" : "Limit",
      qty: quantity.toString(),
    });
  }
}

class WebhookExchange extends BaseExchange {
  constructor(config) {
    super(config);
    this.webhookUrl = config.webhookUrl;
    this.webhookSecret = config.webhookSecret || "";
    this.sentSignals = [];
  }

  async connect() {
    this.connected = !!this.webhookUrl;
    return this.connected;
  }

  async getTicker(symbol) {
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}USDT`);
      if (res.ok) {
        const t = await res.json();
        return { price: parseFloat(t.lastPrice), change24h: parseFloat(t.priceChangePercent), volume: parseFloat(t.quoteVolume) };
      }
    } catch {}
    try {
      const id = symbolToCoinGecko(symbol);
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currency=usd&include_24hr_change=true`);
      const data = await res.json();
      if (data[id]) return { price: data[id].usd, change24h: data[id].usd_24h_change || 0, volume: 0 };
    } catch {}
    return { price: 0, change24h: 0, volume: 0 };
  }

  async placeOrder(symbol, side, quantity, type = "MARKET", price = null) {
    const signal = {
      action: side,
      symbol,
      quantity,
      type,
      price,
      timestamp: new Date().toISOString(),
      source: "AutoTradeBot",
    };

    if (this.webhookUrl) {
      try {
        await fetch(this.webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(this.webhookSecret ? { "X-Webhook-Secret": this.webhookSecret } : {}),
          },
          body: JSON.stringify(signal),
        });
      } catch (e) {
        console.error("Webhook send failed:", e);
      }
    }

    this.sentSignals.unshift(signal);
    if (this.sentSignals.length > 100) this.sentSignals = this.sentSignals.slice(0, 100);
    LS.set("webhook_signals", this.sentSignals);

    return { orderId: Date.now().toString(), ...signal, status: "SENT" };
  }

  getSentSignals() {
    return LS.get("webhook_signals", []);
  }
}

function symbolToCoinGecko(symbol) {
  const map = {
    BTC: "bitcoin", ETH: "ethereum", SOL: "solana", BNB: "binancecoin",
    XRP: "ripple", ADA: "cardano", DOGE: "dogecoin", AVAX: "avalanche-2",
    DOT: "polkadot", MATIC: "matic-network", LINK: "chainlink", UNI: "uniswap",
    ATOM: "cosmos", LTC: "litecoin", FIL: "filecoin",
  };
  return map[symbol.toUpperCase()] || symbol.toLowerCase();
}

export function createExchange(config) {
  switch (config.exchangeId) {
    case "binance": return new BinanceExchange(config);
    case "bybit": return new BybitExchange(config);
    case "webhook": return new WebhookExchange(config);
    case "demo":
    default: return new DemoExchange(config);
  }
}

export async function fetchHistoricalPrices(symbol, days = 14) {
  const pair = `${symbol.toUpperCase()}USDT`;
  const limit = days * 24;
  const cacheKey = `hist_${symbol}_${days}`;
  const cached = LS.get(cacheKey, null);

  for (const base of ['https://api.binance.com', 'https://api.binance.us']) {
    try {
      const res = await fetch(`${base}/api/v3/klines?symbol=${pair}&interval=1h&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          const result = {
            prices: data.map(c => parseFloat(c[4])),
            timestamps: data.map(c => c[0]),
            volumes: data.map(c => parseFloat(c[5]) * parseFloat(c[4])),
          };
          LS.set(cacheKey, { data: result, ts: Date.now() });
          return result;
        }
      }
    } catch {}
  }

  try {
    const id = symbolToCoinGecko(symbol);
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=hourly`);
    if (res.ok) {
      const data = await res.json();
      const result = {
        prices: data.prices.map(p => p[1]),
        timestamps: data.prices.map(p => p[0]),
        volumes: (data.total_volumes || []).map(v => v[1]),
      };
      LS.set(cacheKey, { data: result, ts: Date.now() });
      return result;
    }
  } catch {}

  if (cached) return cached.data;
  throw new Error("Failed to fetch historical prices");
}

export async function fetchMultiPrices(symbols) {
  const cacheKey = "multi_prices";
  const cached = LS.get(cacheKey, null);
  const result = {};

  for (const base of ['https://api.binance.com', 'https://api.binance.us']) {
    try {
      const res = await fetch(`${base}/api/v3/ticker/24hr`);
      if (res.ok) {
        const tickers = await res.json();
        const tickerMap = {};
        for (const t of tickers) tickerMap[t.symbol] = t;
        for (const s of symbols) {
          const t = tickerMap[`${s}USDT`];
          if (t) {
            result[s] = {
              price: parseFloat(t.lastPrice),
              change24h: parseFloat(t.priceChangePercent),
              volume: parseFloat(t.quoteVolume),
            };
          }
        }
        if (Object.keys(result).length > 0) {
          LS.set(cacheKey, { data: result, ts: Date.now() });
          return result;
        }
      }
    } catch {}
  }

  try {
    const ids = symbols.map(s => symbolToCoinGecko(s)).join(",");
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currency=usd&include_24hr_change=true&include_24hr_vol=true`);
    if (res.ok) {
      const data = await res.json();
      symbols.forEach(s => {
        const id = symbolToCoinGecko(s);
        if (data[id]) {
          result[s] = { price: data[id].usd, change24h: data[id].usd_24h_change || 0, volume: data[id].usd_24h_vol || 0 };
        }
      });
      if (Object.keys(result).length > 0) {
        LS.set(cacheKey, { data: result, ts: Date.now() });
        return result;
      }
    }
  } catch {}

  if (cached) return cached.data;
  return {};
}

export const TRADING_PAIRS = [
  { symbol: "BTC", name: "Bitcoin", color: "#f7931a" },
  { symbol: "ETH", name: "Ethereum", color: "#627eea" },
  { symbol: "SOL", name: "Solana", color: "#00ffa3" },
  { symbol: "BNB", name: "BNB", color: "#f3ba2f" },
  { symbol: "XRP", name: "XRP", color: "#00aae4" },
  { symbol: "ADA", name: "Cardano", color: "#0033ad" },
  { symbol: "DOGE", name: "Dogecoin", color: "#c3a634" },
  { symbol: "AVAX", name: "Avalanche", color: "#e84142" },
  { symbol: "DOT", name: "Polkadot", color: "#e6007a" },
  { symbol: "LINK", name: "Chainlink", color: "#2a5ada" },
  { symbol: "UNI", name: "Uniswap", color: "#ff007a" },
  { symbol: "LTC", name: "Litecoin", color: "#bfbbbb" },
];
