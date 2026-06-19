import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  analyzeSignals, getTradeLog, getTradeStats, getBotConfig, saveBotConfig,
  getActivePositions, openPosition, closePositionLocal, checkPositionExits, clearAllData,
} from "./engine.js";
import {
  EXCHANGES, TRADING_PAIRS, getExchangeConfig, saveExchangeConfig, clearExchangeConfig,
  createExchange, fetchHistoricalPrices, fetchMultiPrices,
} from "./exchanges.js";
import TRADING_STYLES from "./tradingStyles.js";

function ago(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function formatDuration(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function MiniChart({ prices }) {
  if (!prices || prices.length < 5) return null;
  const sampled = [];
  const step = Math.max(1, Math.floor(prices.length / 16));
  for (let i = 0; i < prices.length; i += step) sampled.push(prices[i]);
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const range = max - min || 1;
  const isUp = sampled[sampled.length - 1] >= sampled[0];
  return (
    <div className="tb-mini-chart">
      {sampled.map((p, i) => (
        <div key={i} className={`tb-mini-bar ${isUp ? "" : "tb-mini-bar-down"}`}
          style={{ height: Math.max(3, ((p - min) / range) * 28) + "px" }} />
      ))}
    </div>
  );
}

function SetupScreen({ onConnect }) {
  const [selected, setSelected] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [testnet, setTestnet] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const connect = async () => {
    const ex = EXCHANGES.find(e => e.id === selected);
    if (!ex) return;
    if (ex.requiresKeys && (!apiKey.trim() || !apiSecret.trim())) return setError("API key and secret required");
    if (ex.requiresWebhook && !webhookUrl.trim()) return setError("Webhook URL required");

    setConnecting(true);
    setError("");
    try {
      const config = { exchangeId: selected, apiKey: apiKey.trim(), apiSecret: apiSecret.trim(), webhookUrl: webhookUrl.trim(), testnet };
      const exchange = createExchange(config);
      await exchange.connect();
      saveExchangeConfig(config);
      onConnect(config, exchange);
    } catch (e) {
      setError(e.message || "Connection failed");
    }
    setConnecting(false);
  };

  const ex = EXCHANGES.find(e => e.id === selected);

  return (
    <div className="setup-screen">
      <div className="setup-glow" />
      <div className="setup-card">
        <div className="setup-logo">AUTO TRADE</div>
        <p className="setup-tagline">multi-indicator confluence trading engine</p>

        {!selected ? (
          <>
            <p className="setup-section">CONNECT YOUR EXCHANGE</p>
            <div className="setup-exchanges">
              {EXCHANGES.map(ex => (
                <button key={ex.id} className="setup-ex-btn" onClick={() => setSelected(ex.id)}>
                  <span className="setup-ex-icon">{ex.icon}</span>
                  <div className="setup-ex-info">
                    <span className="setup-ex-name">{ex.name}</span>
                    <span className="setup-ex-desc">{ex.description}</span>
                  </div>
                  <span className="setup-ex-arrow">&rsaquo;</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button className="setup-back" onClick={() => { setSelected(null); setError(""); }}>&larr; back</button>
            <div className="setup-connect-header">
              <span style={{ fontSize: 32 }}>{ex.icon}</span>
              <div>
                <p className="setup-connect-name">{ex.name}</p>
                <p className="setup-connect-desc">{ex.description}</p>
              </div>
            </div>

            {ex.requiresKeys && (
              <>
                <div className="setup-warning">
                  Use API keys with <strong>trade-only</strong> permissions. Never enable withdrawal access. Keys are stored locally in your browser only.
                </div>
                {ex.id === "binance" && (
                  <label className="setup-testnet-toggle" onClick={() => setTestnet(t => !t)}>
                    <div className={`setup-toggle-dot ${testnet ? "setup-toggle-on" : ""}`} />
                    <span>Use Testnet (recommended for testing)</span>
                  </label>
                )}
                <div className="setup-field">
                  <label className="setup-lbl">API KEY</label>
                  <input className="setup-inp" placeholder="your api key" value={apiKey} onChange={e => setApiKey(e.target.value)} autoComplete="off" />
                </div>
                <div className="setup-field">
                  <label className="setup-lbl">API SECRET</label>
                  <input className="setup-inp" type="password" placeholder="your api secret" value={apiSecret} onChange={e => setApiSecret(e.target.value)} autoComplete="off" />
                </div>
              </>
            )}

            {ex.requiresWebhook && (
              <>
                <div className="setup-info">
                  Enter your webhook URL. Signals will be sent as JSON POST requests with action, symbol, quantity, and price fields. Compatible with 3Commas, Cornix, Cryptohopper, and custom bots.
                </div>
                <div className="setup-field">
                  <label className="setup-lbl">WEBHOOK URL</label>
                  <input className="setup-inp" placeholder="https://your-platform.com/webhook" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
                </div>
              </>
            )}

            {ex.id === "demo" && (
              <div className="setup-info">
                Paper trading with $10,000 virtual balance. Uses real-time market data from CoinGecko. No exchange connection needed.
              </div>
            )}

            {error && <p className="setup-error">{error}</p>}

            <button className="setup-connect-btn" onClick={connect} disabled={connecting}>
              {connecting ? <span className="tb-spinner" style={{ width: 14, height: 14 }} /> : `CONNECT ${ex.name.toUpperCase()}`}
            </button>
          </>
        )}

        <p className="setup-footer">Your keys never leave your browser. This is a client-side application.</p>
      </div>
    </div>
  );
}

function SignalPanel({ symbol, analysis, prices, config, positions, onTrade }) {
  if (!analysis) return <div className="tb-empty"><div className="tb-empty-icon">📊</div><div className="tb-empty-txt">SELECT A PAIR TO ANALYSE</div></div>;

  const pair = TRADING_PAIRS.find(p => p.symbol === symbol);
  const hasPosition = positions.some(p => p.symbol === symbol);
  const confColor = analysis.direction === "BUY" ? "#00ffa3" : analysis.direction === "SELL" ? "#ff3b1f" : "var(--dim)";
  const confPct = analysis.totalSignals > 0 ? (analysis.confluence / analysis.totalSignals) * 100 : 0;

  return (
    <div className="tb-signal-card">
      <div className="tb-signal-header">
        <div className="tb-signal-coin" style={{ color: pair?.color || "#fff" }}>
          {symbol}/USD
        </div>
        <div className={`tb-signal-dir tb-signal-${analysis.direction.toLowerCase()}`}>
          {analysis.direction}
        </div>
      </div>

      <p className="tb-signal-summary">{analysis.summary}</p>

      <div className="tb-confluence">
        <span className="tb-conf-lbl" style={{ color: confColor }}>{analysis.confluence}/{analysis.totalSignals}</span>
        <div className="tb-conf-bar">
          <div className="tb-conf-fill" style={{ width: `${confPct}%`, background: confColor }} />
        </div>
        <span className="tb-conf-lbl" style={{ color: confColor, fontSize: 10 }}>CONFLUENCE</span>
      </div>

      <div className="tb-signal-grid">
        {analysis.signals.map(sig => (
          <div key={sig.name} className="tb-signal-row">
            <span className="tb-sig-name">{sig.name}</span>
            <span className={`tb-sig-dir tb-sig-${sig.direction === "BUY" ? "buy" : sig.direction === "SELL" ? "sell" : "neut"}`}>
              {sig.direction}
            </span>
            <div className="tb-sig-str">
              <div className="tb-sig-bar">
                <div className="tb-sig-bar-fill" style={{
                  width: `${sig.strength}%`,
                  background: sig.direction === "BUY" ? "#00ffa3" : sig.direction === "SELL" ? "#ff3b1f" : "var(--dim)"
                }} />
              </div>
            </div>
            <span className="tb-sig-val">{sig.value}</span>
            <span className="tb-sig-detail">{sig.detail}</span>
          </div>
        ))}
      </div>

      {analysis.direction !== "NEUTRAL" && !hasPosition && (
        <button className={`tb-trade-btn ${analysis.direction === "BUY" ? "tb-trade-buy" : "tb-trade-sell"}`}
          onClick={() => onTrade(symbol, analysis.direction, analysis)}
          disabled={!prices[symbol]}>
          {analysis.direction === "BUY" ? "OPEN LONG" : "OPEN SHORT"} {symbol}
        </button>
      )}
      {hasPosition && (
        <div style={{ textAlign: "center", padding: "10px 0", fontSize: 11, color: "var(--orange)", fontFamily: "var(--display)", letterSpacing: 2 }}>
          POSITION ALREADY OPEN
        </div>
      )}
    </div>
  );
}

function PositionsPanel({ positions, prices, onClose }) {
  if (positions.length === 0) return <div className="tb-empty"><div className="tb-empty-icon">📭</div><div className="tb-empty-txt">NO OPEN POSITIONS</div></div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {positions.map(pos => {
        const curPrice = prices[pos.symbol];
        const unrealizedPnL = curPrice
          ? pos.direction === "BUY" ? (curPrice - pos.entryPrice) * pos.quantity : (pos.entryPrice - curPrice) * pos.quantity
          : 0;
        const pnlPct = pos.value > 0 ? (unrealizedPnL / pos.value) * 100 : 0;
        const pair = TRADING_PAIRS.find(p => p.symbol === pos.symbol);
        return (
          <div key={pos.id} className="tb-pos-card">
            <div className="tb-pos-row">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="tb-pos-sym" style={{ color: pair?.color }}>{pos.symbol}</span>
                <span className={`tb-pos-dir-badge ${pos.direction === "BUY" ? "tb-signal-buy" : "tb-signal-sell"}`}>
                  {pos.direction === "BUY" ? "LONG" : "SHORT"}
                </span>
                <span style={{ fontSize: 10, color: "var(--dim)" }}>{formatDuration(Date.now() - pos.openedAt)}</span>
              </div>
              <button className="tb-pos-close" onClick={() => onClose(pos.id, pos.symbol)}>CLOSE</button>
            </div>
            <div className="tb-pos-detail">
              <div className="tb-pos-item">
                <span className="tb-pos-item-val">${pos.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                <span className="tb-pos-item-lbl">ENTRY</span>
              </div>
              <div className="tb-pos-item">
                <span className="tb-pos-item-val">${curPrice?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || "--"}</span>
                <span className="tb-pos-item-lbl">CURRENT</span>
              </div>
              <div className="tb-pos-item">
                <span className={`tb-pos-item-val ${unrealizedPnL >= 0 ? "tb-green" : "tb-red"}`}>
                  {unrealizedPnL >= 0 ? "+" : ""}${unrealizedPnL.toFixed(2)} ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
                </span>
                <span className="tb-pos-item-lbl">UNREALIZED P&L</span>
              </div>
              <div className="tb-pos-item">
                <span className="tb-pos-item-val tb-red">${pos.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                <span className="tb-pos-item-lbl">STOP LOSS</span>
              </div>
              <div className="tb-pos-item">
                <span className="tb-pos-item-val tb-green">${pos.takeProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                <span className="tb-pos-item-lbl">TAKE PROFIT</span>
              </div>
              {pos.trailingStop && (
                <div className="tb-pos-item">
                  <span className="tb-pos-item-val" style={{ color: "var(--orange)" }}>${pos.trailingStop.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  <span className="tb-pos-item-lbl">TRAILING STOP</span>
                </div>
              )}
            </div>
            <div className="tb-pos-signals">
              {pos.signals.map(s => <span key={s} className="tb-pos-sig-tag">{s}</span>)}
              <span className="tb-pos-sig-tag" style={{ color: "#00ffa3", borderColor: "rgba(0,255,163,.2)" }}>{pos.confluence} CONF</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryPanel({ log }) {
  const closed = log.filter(t => t.type === "CLOSE");
  if (closed.length === 0) return <div className="tb-empty"><div className="tb-empty-icon">📜</div><div className="tb-empty-txt">NO TRADE HISTORY</div></div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {closed.map((trade, i) => (
        <div key={i} className="tb-history-row">
          <div className={`tb-hist-result ${trade.result === "WIN" ? "tb-hist-win" : "tb-hist-loss"}`}>{trade.result}</div>
          <div className="tb-hist-info">
            <div className="tb-hist-pair">{trade.symbol} {trade.direction}</div>
            <div className="tb-hist-meta">${trade.entryPrice?.toFixed(2)} → ${trade.exitPrice?.toFixed(2)} · {ago(trade.timestamp)}</div>
          </div>
          <div className={`tb-hist-pnl ${trade.pnl >= 0 ? "tb-green" : "tb-red"}`}>
            {trade.pnl >= 0 ? "+" : ""}${trade.pnl?.toFixed(2)}
          </div>
          <div className="tb-hist-reason">{(trade.reason || "").replace("_", " ").toUpperCase()}</div>
        </div>
      ))}
    </div>
  );
}

function StatsPanel({ stats }) {
  return (
    <>
      <div className="tb-perf-grid">
        <div className="tb-perf-card">
          <div className="tb-perf-val" style={{ color: Number(stats.winRate) >= 50 ? "#00ffa3" : "var(--accent)" }}>{stats.winRate}%</div>
          <div className="tb-perf-lbl">WIN RATE</div>
        </div>
        <div className="tb-perf-card">
          <div className="tb-perf-val">{stats.totalTrades}</div>
          <div className="tb-perf-lbl">TOTAL TRADES</div>
        </div>
        <div className="tb-perf-card">
          <div className="tb-perf-val tb-green">{stats.wins}</div>
          <div className="tb-perf-lbl">WINS</div>
        </div>
        <div className="tb-perf-card">
          <div className="tb-perf-val tb-red">{stats.losses}</div>
          <div className="tb-perf-lbl">LOSSES</div>
        </div>
        <div className="tb-perf-card">
          <div className="tb-perf-val tb-green">+${stats.avgWin}</div>
          <div className="tb-perf-lbl">AVG WIN</div>
        </div>
        <div className="tb-perf-card">
          <div className="tb-perf-val tb-red">-${stats.avgLoss}</div>
          <div className="tb-perf-lbl">AVG LOSS</div>
        </div>
        <div className="tb-perf-card">
          <div className="tb-perf-val">{stats.profitFactor}</div>
          <div className="tb-perf-lbl">PROFIT FACTOR</div>
        </div>
        <div className="tb-perf-card">
          <div className={`tb-perf-val ${Number(stats.totalPnL) >= 0 ? "tb-green" : "tb-red"}`}>
            {Number(stats.totalPnL) >= 0 ? "+" : ""}${stats.totalPnL}
          </div>
          <div className="tb-perf-lbl">TOTAL P&L</div>
        </div>
      </div>

      <div className="tb-strategy-info">
        <div className="tb-strategy-title">HOW IT WORKS</div>
        <div className="tb-strategy-body">
          <p><strong>Multi-Indicator Confluence Strategy</strong></p>
          <p>The bot analyses 6 independent technical indicators simultaneously. A trade is only executed when 3 or more indicators agree on the same direction, significantly reducing false signals.</p>
          <p style={{ marginTop: 8 }}><strong>Indicators:</strong> RSI (14), EMA Crossover (12/26), MACD (12/26/9), Bollinger Bands (20, 2SD), Moving Average Trend (20/50), Volume Analysis</p>
          <p style={{ marginTop: 8 }}><strong>Risk Management:</strong> Automatic stop-loss and take-profit on every trade. Configurable position sizing, trailing stops, and daily loss limits.</p>
          <p style={{ marginTop: 8 }}><strong>Why confluence works:</strong> Each indicator measures a different aspect of price action — momentum, trend, volatility, volume. When they all agree, the probability of the trade succeeding is substantially higher than any single indicator alone.</p>
        </div>
      </div>
    </>
  );
}

function SettingsPanel({ config, onSave, exchangeConfig, onDisconnect }) {
  const [cfg, setCfg] = useState(config);
  const update = (k, v) => { const next = { ...cfg, [k]: v }; setCfg(next); onSave(next); };

  const ex = EXCHANGES.find(e => e.id === exchangeConfig?.exchangeId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="tb-settings-section">
        <div className="tb-settings-title">CONNECTED EXCHANGE</div>
        <div className="tb-settings-exchange">
          <span style={{ fontSize: 24 }}>{ex?.icon || "?"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--display)", fontSize: 14, letterSpacing: 2, color: "var(--text)" }}>{ex?.name || "Unknown"}</div>
            <div style={{ fontSize: 10, color: "var(--dim)", letterSpacing: 1 }}>{exchangeConfig?.testnet ? "TESTNET" : "LIVE"}</div>
          </div>
          <button className="tb-pos-close" onClick={onDisconnect}>DISCONNECT</button>
        </div>
      </div>

      <div className="tb-settings-section">
        <div className="tb-settings-title">RISK MANAGEMENT</div>
        <div className="tb-settings-row">
          <span className="tb-settings-lbl">Position Size</span>
          <div className="tb-settings-input-wrap">
            <input type="number" className="tb-settings-input" value={cfg.positionSizePct} onChange={e => update("positionSizePct", Number(e.target.value))} min={1} max={50} />
            <span className="tb-settings-unit">% of balance</span>
          </div>
        </div>
        <div className="tb-settings-row">
          <span className="tb-settings-lbl">Stop Loss</span>
          <div className="tb-settings-input-wrap">
            <input type="number" className="tb-settings-input" value={cfg.stopLossPct} onChange={e => update("stopLossPct", Number(e.target.value))} min={0.5} max={20} step={0.5} />
            <span className="tb-settings-unit">%</span>
          </div>
        </div>
        <div className="tb-settings-row">
          <span className="tb-settings-lbl">Take Profit</span>
          <div className="tb-settings-input-wrap">
            <input type="number" className="tb-settings-input" value={cfg.takeProfitPct} onChange={e => update("takeProfitPct", Number(e.target.value))} min={1} max={50} step={0.5} />
            <span className="tb-settings-unit">%</span>
          </div>
        </div>
        <div className="tb-settings-row">
          <span className="tb-settings-lbl">Max Open Positions</span>
          <div className="tb-settings-input-wrap">
            <input type="number" className="tb-settings-input" value={cfg.maxOpenPositions} onChange={e => update("maxOpenPositions", Number(e.target.value))} min={1} max={20} />
          </div>
        </div>
        <div className="tb-settings-row">
          <span className="tb-settings-lbl">Daily Loss Limit</span>
          <div className="tb-settings-input-wrap">
            <span className="tb-settings-unit">$</span>
            <input type="number" className="tb-settings-input" value={cfg.dailyLossLimit} onChange={e => update("dailyLossLimit", Number(e.target.value))} min={0} step={50} />
          </div>
        </div>
        <div className="tb-settings-row">
          <span className="tb-settings-lbl">Confluence Required</span>
          <div className="tb-settings-input-wrap">
            <input type="number" className="tb-settings-input" value={cfg.confluenceRequired} onChange={e => update("confluenceRequired", Number(e.target.value))} min={2} max={6} />
            <span className="tb-settings-unit">/ 6 indicators</span>
          </div>
        </div>
      </div>

      <div className="tb-settings-section">
        <div className="tb-settings-title">TRAILING STOP</div>
        <label className="setup-testnet-toggle" onClick={() => update("trailingStop", !cfg.trailingStop)}>
          <div className={`setup-toggle-dot ${cfg.trailingStop ? "setup-toggle-on" : ""}`} />
          <span>Enable trailing stop-loss</span>
        </label>
        {cfg.trailingStop && (
          <div className="tb-settings-row" style={{ marginTop: 8 }}>
            <span className="tb-settings-lbl">Trail Distance</span>
            <div className="tb-settings-input-wrap">
              <input type="number" className="tb-settings-input" value={cfg.trailingStopPct} onChange={e => update("trailingStopPct", Number(e.target.value))} min={0.5} max={10} step={0.5} />
              <span className="tb-settings-unit">%</span>
            </div>
          </div>
        )}
      </div>

      <div className="tb-settings-section">
        <div className="tb-settings-title">AUTO TRADE INTERVAL</div>
        <div className="tb-settings-row">
          <span className="tb-settings-lbl">Scan every</span>
          <div className="tb-settings-input-wrap">
            <input type="number" className="tb-settings-input" value={cfg.scanIntervalSec} onChange={e => update("scanIntervalSec", Number(e.target.value))} min={30} max={600} step={10} />
            <span className="tb-settings-unit">seconds</span>
          </div>
        </div>
      </div>

      <div className="tb-settings-section">
        <div className="tb-settings-title">TRADING PAIRS</div>
        <div className="tb-pair-grid">
          {TRADING_PAIRS.map(pair => {
            const enabled = cfg.enabledPairs.includes(pair.symbol);
            return (
              <button key={pair.symbol} className={`tb-pair-btn ${enabled ? "tb-pair-on" : ""}`}
                style={enabled ? { borderColor: pair.color, color: pair.color } : {}}
                onClick={() => {
                  const next = enabled ? cfg.enabledPairs.filter(s => s !== pair.symbol) : [...cfg.enabledPairs, pair.symbol];
                  update("enabledPairs", next);
                }}>
                {pair.symbol}
              </button>
            );
          })}
        </div>
      </div>

      <button className="tb-reset-btn" onClick={() => { if (confirm("Reset all data? Portfolio, history, and settings will be cleared.")) { clearAllData(); window.location.reload(); } }}>
        RESET ALL DATA
      </button>
    </div>
  );
}

export default function TradingBot() {
  const [exchangeConfig, setExchangeConfig] = useState(() => getExchangeConfig());
  const [exchange, setExchange] = useState(null);
  const [config, setConfig] = useState(() => getBotConfig());
  const [prices, setPrices] = useState({});
  const [historicalData, setHistoricalData] = useState({});
  const [selectedPair, setSelectedPair] = useState("BTC");
  const [analysis, setAnalysis] = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [positions, setPositions] = useState(() => getActivePositions());
  const [tradeLog, setTradeLog] = useState(() => getTradeLog());
  const [tab, setTab] = useState("signals");
  const [loading, setLoading] = useState(true);
  const [botStatus, setBotStatus] = useState("idle");
  const [lastScan, setLastScan] = useState(null);
  const [balance, setBalance] = useState(null);
  const autoRef = useRef(null);
  const pricesRef = useRef(prices);
  pricesRef.current = prices;

  const stats = useMemo(() => getTradeStats(), [tradeLog]);

  useEffect(() => {
    if (!exchangeConfig) return;
    const ex = createExchange(exchangeConfig);
    ex.connect().then(() => setExchange(ex)).catch(() => {});
  }, [exchangeConfig]);

  const loadPrices = useCallback(async () => {
    try {
      const data = await fetchMultiPrices(config.enabledPairs);
      setPrices(data);

      const priceMap = {};
      Object.entries(data).forEach(([s, d]) => { priceMap[s] = d.price; });
      const exits = checkPositionExits(priceMap);
      if (exits.length > 0) {
        for (const exit of exits) {
          closePositionLocal(exit.positionId, exit.price, exit.reason);
          if (exchange && exchangeConfig.exchangeId !== "demo") {
            const pos = positions.find(p => p.id === exit.positionId);
            if (pos) {
              try { await exchange.placeOrder(pos.symbol, pos.direction === "BUY" ? "SELL" : "BUY", pos.quantity); } catch {}
            }
          }
        }
        setPositions(getActivePositions());
        setTradeLog(getTradeLog());
      }
    } catch (e) {
      console.error("Price load error:", e);
    }
  }, [config.enabledPairs, exchange]);

  const loadBalance = useCallback(async () => {
    if (!exchange) return;
    try {
      const bal = await exchange.getBalance();
      setBalance(bal);
    } catch {}
  }, [exchange]);

  const analyzeSymbol = useCallback(async (symbol) => {
    setAnalysing(true);
    try {
      const data = await fetchHistoricalPrices(symbol, 14);
      setHistoricalData(prev => ({ ...prev, [symbol]: data }));
      const result = analyzeSignals(data.prices, data.volumes);
      setAnalysis(result);
    } catch (e) {
      console.error("Analysis error:", e);
      const cached = historicalData[symbol];
      if (cached && cached.prices?.length > 0) {
        const result = analyzeSignals(cached.prices, cached.volumes);
        setAnalysis(result);
      }
    }
    setAnalysing(false);
  }, [historicalData]);

  useEffect(() => {
    if (!exchangeConfig) return;
    Promise.all([loadPrices(), loadBalance()]).then(() => setLoading(false));
    const iv = setInterval(() => { loadPrices(); loadBalance(); }, 30000);
    return () => clearInterval(iv);
  }, [exchangeConfig, loadPrices, loadBalance]);

  useEffect(() => { if (exchangeConfig) analyzeSymbol(selectedPair); }, [selectedPair, exchangeConfig]);

  const handleTrade = useCallback(async (symbol, direction, analysis) => {
    const price = pricesRef.current[symbol]?.price;
    if (!price) return;

    const posCount = getActivePositions().length;
    if (posCount >= config.maxOpenPositions) return;

    let quantity;
    if (exchange && balance) {
      const posValue = balance.available * (config.positionSizePct / 100);
      quantity = posValue / price;
    } else {
      quantity = (10000 * config.positionSizePct / 100) / price;
    }

    const value = quantity * price;
    const sigNames = analysis.signals.filter(s => s.direction === direction).map(s => s.name);

    if (exchange) {
      try {
        await exchange.placeOrder(symbol, direction === "BUY" ? "BUY" : "SELL", quantity);
      } catch (e) {
        console.error("Order failed:", e);
        return;
      }
    }

    openPosition(symbol, direction, price, quantity, value, sigNames, analysis.confluence);
    setPositions(getActivePositions());
    setTradeLog(getTradeLog());
    loadBalance();
  }, [exchange, balance, config]);

  const handleClosePosition = useCallback(async (posId, symbol) => {
    const pos = getActivePositions().find(p => p.id === posId);
    const price = pricesRef.current[symbol]?.price;
    if (!price || !pos) return;

    if (exchange) {
      try {
        await exchange.placeOrder(symbol, pos.direction === "BUY" ? "SELL" : "BUY", pos.quantity);
      } catch (e) {
        console.error("Close order failed:", e);
      }
    }

    closePositionLocal(posId, price, "manual");
    setPositions(getActivePositions());
    setTradeLog(getTradeLog());
    loadBalance();
  }, [exchange, loadBalance]);

  useEffect(() => {
    if (!config.autoTrade || !exchangeConfig) { clearInterval(autoRef.current); setBotStatus("idle"); return; }
    setBotStatus("scanning");

    const scan = async () => {
      setBotStatus("scanning");
      for (const symbol of config.enabledPairs) {
        if (getActivePositions().length >= config.maxOpenPositions) break;
        if (getActivePositions().some(p => p.symbol === symbol)) continue;

        try {
          const data = await fetchHistoricalPrices(symbol, 14);
          const result = analyzeSignals(data.prices, data.volumes);
          if (result.direction !== "NEUTRAL" && result.confluence >= config.confluenceRequired) {
            await handleTrade(symbol, result.direction, result);
          }
        } catch {}
        await new Promise(r => setTimeout(r, 2000));
      }
      setLastScan(Date.now());
      setBotStatus("waiting");
    };

    scan();
    autoRef.current = setInterval(scan, config.scanIntervalSec * 1000);
    return () => clearInterval(autoRef.current);
  }, [config.autoTrade, config.scanIntervalSec, config.enabledPairs, config.confluenceRequired, exchangeConfig, handleTrade]);

  const handleConnect = (cfg, ex) => {
    setExchangeConfig(cfg);
    setExchange(ex);
  };

  const handleDisconnect = () => {
    clearExchangeConfig();
    setExchangeConfig(null);
    setExchange(null);
    setConfig(prev => ({ ...prev, autoTrade: false }));
    saveBotConfig({ ...config, autoTrade: false });
  };

  if (!exchangeConfig) {
    return <><style>{TRADING_STYLES}</style><SetupScreen onConnect={handleConnect} /></>;
  }

  if (loading) {
    return <><style>{TRADING_STYLES}</style><div className="tb-wrap"><div className="tb-loading"><div className="tb-spinner" /><span className="tb-loading-txt">CONNECTING TO MARKETS...</span></div></div></>;
  }

  const ex = EXCHANGES.find(e => e.id === exchangeConfig.exchangeId);

  return (
    <>
      <style>{TRADING_STYLES}</style>
      <div className="app">
        <header className="tb-header-bar">
          <div>
            <div className="tb-logo">AUTO TRADE</div>
            <div className="tb-logo-sub">{ex?.icon} {ex?.name} {exchangeConfig.testnet ? "· TESTNET" : ""}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className={`tb-bot-status ${config.autoTrade ? "tb-bot-on" : "tb-bot-off"}`}>
              <div className={`tb-status-dot ${config.autoTrade ? "tb-dot-on" : ""}`} />
              <span>{config.autoTrade ? botStatus === "scanning" ? "SCANNING" : "AUTO" : "MANUAL"}</span>
            </div>
          </div>
        </header>

        <main className="tb-main">
          <div className="tb-wrap">
            {/* BALANCE */}
            <div className="tb-balance-card">
              <div className="tb-bal-row">
                <div>
                  <div className="tb-bal-lbl">BALANCE</div>
                  <div className="tb-bal-val">
                    ${balance ? Number(balance.available).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "10,000.00"}
                  </div>
                </div>
                <div className="tb-bal-stats-mini">
                  <span className={`tb-bal-stat-pill ${Number(stats.winRate) >= 50 ? "tb-pill-green" : "tb-pill-red"}`}>{stats.winRate}% WR</span>
                  <span className={`tb-bal-stat-pill ${Number(stats.totalPnL) >= 0 ? "tb-pill-green" : "tb-pill-red"}`}>
                    {Number(stats.totalPnL) >= 0 ? "+" : ""}${stats.totalPnL} P&L
                  </span>
                </div>
              </div>
            </div>

            {/* AUTO TRADE + RISK */}
            <div className="tb-controls">
              <div className="tb-toggle" onClick={() => {
                const next = { ...config, autoTrade: !config.autoTrade };
                setConfig(next); saveBotConfig(next);
              }}>
                <div className={`tb-toggle-dot ${config.autoTrade ? "tb-toggle-on" : "tb-toggle-off"}`} />
                <div>
                  <div className="tb-toggle-lbl">AUTO TRADE</div>
                  <div className="tb-toggle-sub">
                    {config.autoTrade
                      ? lastScan ? `last scan ${ago(lastScan)}` : "scanning..."
                      : "manual mode"}
                  </div>
                </div>
              </div>
              <div className="tb-risk-sel">
                <div className="tb-risk-lbl">RISK</div>
                <div className="tb-risk-opts">
                  {["conservative", "medium", "aggressive"].map(r => (
                    <div key={r} className={`tb-risk-opt${config.riskLevel === r ? " tb-risk-opt-on" : ""}`}
                      onClick={() => { const next = { ...config, riskLevel: r }; setConfig(next); saveBotConfig(next); }}>
                      {r.slice(0, 3).toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* MARKET GRID */}
            <div className="tb-section">MARKETS <span className="tb-section-count">{config.enabledPairs.length} pairs</span></div>
            <div className="tb-market-scroll">
              {config.enabledPairs.map(symbol => {
                const p = prices[symbol];
                const pair = TRADING_PAIRS.find(t => t.symbol === symbol);
                const hasPos = positions.some(pos => pos.symbol === symbol);
                return (
                  <div key={symbol}
                    className={`tb-coin-chip ${selectedPair === symbol ? "tb-coin-chip-active" : ""}`}
                    style={hasPos ? { borderColor: "rgba(255,140,0,.5)" } : {}}
                    onClick={() => { setSelectedPair(symbol); setTab("signals"); analyzeSymbol(symbol); }}>
                    <span className="tb-chip-sym" style={{ color: pair?.color }}>{symbol}</span>
                    {p && <span className="tb-chip-price">${p.price >= 1000 ? p.price.toLocaleString(undefined, { maximumFractionDigits: 0 }) : p.price.toFixed(4)}</span>}
                    {p && <span className={`tb-chip-change ${p.change24h >= 0 ? "tb-green" : "tb-red"}`}>{p.change24h >= 0 ? "+" : ""}{p.change24h?.toFixed(1)}%</span>}
                    {hasPos && <span className="tb-chip-pos-dot" />}
                  </div>
                );
              })}
            </div>

            {/* TABS */}
            <div className="tb-tabs">
              {[
                { id: "signals", label: "SIGNALS" },
                { id: "positions", label: `POSITIONS (${positions.length})` },
                { id: "history", label: "HISTORY" },
                { id: "stats", label: "STATS" },
                { id: "settings", label: "SETTINGS" },
              ].map(t => (
                <button key={t.id} className={`tb-tab${tab === t.id ? " tb-tab-on" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
              ))}
            </div>

            {/* TAB CONTENT */}
            {tab === "signals" && (
              analysing
                ? <div className="tb-loading"><div className="tb-spinner" /><span className="tb-loading-txt">ANALYSING {selectedPair}...</span></div>
                : <SignalPanel symbol={selectedPair} analysis={analysis} prices={prices} config={config} positions={positions} onTrade={handleTrade} />
            )}
            {tab === "positions" && <PositionsPanel positions={positions} prices={Object.fromEntries(Object.entries(prices).map(([k, v]) => [k, v.price]))} onClose={handleClosePosition} />}
            {tab === "history" && <HistoryPanel log={tradeLog} />}
            {tab === "stats" && <StatsPanel stats={stats} />}
            {tab === "settings" && <SettingsPanel config={config} onSave={c => { setConfig(c); saveBotConfig(c); }} exchangeConfig={exchangeConfig} onDisconnect={handleDisconnect} />}
          </div>
        </main>
      </div>
    </>
  );
}
