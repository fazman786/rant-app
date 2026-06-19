import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  COINS, fetchMarketData, fetchCurrentPrices, analyzeSignals,
  getPortfolio, savePortfolio, resetPortfolio,
  executeTrade, closePosition, checkStopLossAndTakeProfit,
  getPerformanceMetrics,
} from "./engine.js";

const TRADING_STYLES = `
  .tb-wrap{padding:12px 16px 100px;display:flex;flex-direction:column;gap:12px}
  .tb-header{display:flex;align-items:center;justify-content:space-between;padding:4px 0}
  .tb-title{font-family:var(--display);font-size:28px;letter-spacing:3px;background:linear-gradient(135deg,#00ffa3,#00d4aa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
  .tb-subtitle{font-size:10px;color:var(--dim);letter-spacing:2px;text-transform:uppercase}
  .tb-paper-badge{background:rgba(255,140,0,.12);border:1px solid rgba(255,140,0,.3);border-radius:3px;padding:4px 10px;font-family:var(--display);font-size:11px;letter-spacing:2px;color:var(--orange)}
  .tb-disclaimer{background:rgba(255,59,31,.06);border:1px solid rgba(255,59,31,.15);border-radius:var(--r);padding:10px 14px;font-size:11px;color:var(--muted);line-height:1.5}

  .tb-balance-card{background:linear-gradient(135deg,rgba(0,255,163,.06),rgba(0,212,170,.03));border:1px solid rgba(0,255,163,.2);border-radius:var(--r);padding:18px}
  .tb-bal-row{display:flex;align-items:center;justify-content:space-between}
  .tb-bal-lbl{font-family:var(--display);font-size:11px;letter-spacing:2px;color:var(--muted)}
  .tb-bal-val{font-family:var(--display);font-size:32px;letter-spacing:2px;color:#00ffa3}
  .tb-bal-change{font-size:13px;font-family:var(--display);letter-spacing:1px;padding:3px 8px;border-radius:3px}
  .tb-bal-pos{background:rgba(0,255,163,.12);color:#00ffa3}
  .tb-bal-neg{background:rgba(255,59,31,.12);color:var(--accent)}
  .tb-bal-stats{display:flex;gap:16px;margin-top:14px;flex-wrap:wrap}
  .tb-bal-stat{display:flex;flex-direction:column;gap:2px}
  .tb-bal-stat-val{font-family:var(--display);font-size:16px;letter-spacing:1px;color:var(--text)}
  .tb-bal-stat-lbl{font-size:10px;color:var(--dim);letter-spacing:1.5px}

  .tb-controls{display:flex;gap:8px;flex-wrap:wrap}
  .tb-toggle{display:flex;align-items:center;gap:8px;background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:10px 14px;cursor:pointer;flex:1;min-width:140px}
  .tb-toggle-dot{width:10px;height:10px;border-radius:50%;transition:all .2s}
  .tb-toggle-on{background:#00ffa3;box-shadow:0 0 8px rgba(0,255,163,.5)}
  .tb-toggle-off{background:var(--dim)}
  .tb-toggle-lbl{font-family:var(--display);font-size:12px;letter-spacing:1.5px;color:var(--text)}
  .tb-toggle-sub{font-size:10px;color:var(--dim)}
  .tb-risk-sel{background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:10px 14px;flex:1;min-width:140px}
  .tb-risk-lbl{font-family:var(--display);font-size:11px;letter-spacing:1.5px;color:var(--muted);margin-bottom:6px}
  .tb-risk-opts{display:flex;gap:4px}
  .tb-risk-opt{flex:1;background:var(--s3);border:1px solid var(--bd);border-radius:2px;padding:5px 0;text-align:center;font-family:var(--display);font-size:10px;letter-spacing:1px;color:var(--muted);cursor:pointer;transition:all .15s}
  .tb-risk-opt-on{border-color:#00ffa3;color:#00ffa3;background:rgba(0,255,163,.08)}

  .tb-section{font-family:var(--display);font-size:14px;letter-spacing:2px;color:var(--text);margin-top:4px}
  .tb-section-sub{font-size:10px;color:var(--dim);letter-spacing:1px;margin-top:2px}

  .tb-market-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .tb-coin-card{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:12px;cursor:pointer;transition:all .15s;position:relative;overflow:hidden}
  .tb-coin-card:hover{border-color:rgba(0,255,163,.3)}
  .tb-coin-active{border-color:rgba(0,255,163,.5);background:rgba(0,255,163,.03)}
  .tb-coin-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
  .tb-coin-sym{font-family:var(--display);font-size:16px;letter-spacing:2px}
  .tb-coin-name{font-size:10px;color:var(--dim);letter-spacing:1px}
  .tb-coin-price{font-family:var(--display);font-size:18px;letter-spacing:1px;color:var(--text)}
  .tb-coin-change{font-size:12px;font-family:var(--display);letter-spacing:1px}
  .tb-green{color:#00ffa3}
  .tb-red{color:var(--accent)}

  .tb-signal-card{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:14px}
  .tb-signal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
  .tb-signal-coin{font-family:var(--display);font-size:16px;letter-spacing:2px;color:var(--text)}
  .tb-signal-dir{font-family:var(--display);font-size:14px;letter-spacing:2px;padding:4px 12px;border-radius:2px}
  .tb-signal-buy{background:rgba(0,255,163,.12);color:#00ffa3;border:1px solid rgba(0,255,163,.3)}
  .tb-signal-sell{background:rgba(255,59,31,.12);color:var(--accent);border:1px solid rgba(255,59,31,.3)}
  .tb-signal-neutral{background:var(--s2);color:var(--muted);border:1px solid var(--bd)}
  .tb-confluence{display:flex;align-items:center;gap:8px;margin-bottom:12px}
  .tb-conf-bar{flex:1;height:6px;background:var(--s3);border-radius:3px;overflow:hidden}
  .tb-conf-fill{height:100%;border-radius:3px;transition:width .5s ease}
  .tb-conf-lbl{font-family:var(--display);font-size:12px;letter-spacing:1px;flex-shrink:0}
  .tb-signal-grid{display:flex;flex-direction:column;gap:6px}
  .tb-signal-row{display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--s2);border-radius:var(--r)}
  .tb-sig-name{font-family:var(--display);font-size:12px;letter-spacing:1.5px;color:var(--text);width:80px;flex-shrink:0}
  .tb-sig-dir{font-size:10px;font-family:var(--display);letter-spacing:1px;padding:2px 6px;border-radius:2px;width:48px;text-align:center;flex-shrink:0}
  .tb-sig-buy{background:rgba(0,255,163,.1);color:#00ffa3}
  .tb-sig-sell{background:rgba(255,59,31,.1);color:var(--accent)}
  .tb-sig-neut{background:var(--s3);color:var(--dim)}
  .tb-sig-str{flex:1;display:flex;align-items:center;gap:6px}
  .tb-sig-bar{flex:1;height:4px;background:var(--s3);border-radius:2px;overflow:hidden}
  .tb-sig-bar-fill{height:100%;border-radius:2px;transition:width .3s}
  .tb-sig-val{font-size:11px;color:var(--muted);font-family:monospace;width:60px;text-align:right;flex-shrink:0}
  .tb-sig-detail{font-size:10px;color:var(--dim);width:120px;text-align:right;flex-shrink:0}

  .tb-trade-btn{width:100%;padding:12px;border:none;border-radius:var(--r);font-family:var(--display);font-size:16px;letter-spacing:2px;cursor:pointer;transition:all .15s;margin-top:8px}
  .tb-trade-btn:hover{transform:scale(1.02)}
  .tb-trade-btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
  .tb-trade-buy{background:#00ffa3;color:#000}
  .tb-trade-sell{background:var(--accent);color:#fff}

  .tb-pos-card{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:14px}
  .tb-pos-row{display:flex;align-items:center;justify-content:space-between}
  .tb-pos-sym{font-family:var(--display);font-size:16px;letter-spacing:2px;color:var(--text)}
  .tb-pos-dir-badge{font-family:var(--display);font-size:10px;letter-spacing:1.5px;padding:2px 8px;border-radius:2px}
  .tb-pos-detail{display:flex;gap:16px;margin-top:10px;flex-wrap:wrap}
  .tb-pos-item{display:flex;flex-direction:column;gap:2px}
  .tb-pos-item-val{font-size:13px;color:var(--text);font-family:monospace}
  .tb-pos-item-lbl{font-size:9px;color:var(--dim);letter-spacing:1px;font-family:var(--display)}
  .tb-pos-close{background:var(--s3);border:1px solid var(--bd);border-radius:2px;padding:6px 12px;font-family:var(--display);font-size:11px;letter-spacing:1.5px;color:var(--accent);cursor:pointer;transition:all .15s}
  .tb-pos-close:hover{border-color:var(--accent);background:rgba(255,59,31,.08)}
  .tb-pos-signals{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px}
  .tb-pos-sig-tag{font-size:9px;font-family:var(--display);letter-spacing:1px;padding:2px 6px;background:var(--s3);border:1px solid var(--bd);border-radius:2px;color:var(--muted)}

  .tb-history-row{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:12px;display:flex;align-items:center;gap:12px}
  .tb-hist-result{font-family:var(--display);font-size:12px;letter-spacing:1.5px;padding:4px 8px;border-radius:2px;flex-shrink:0}
  .tb-hist-win{background:rgba(0,255,163,.12);color:#00ffa3;border:1px solid rgba(0,255,163,.2)}
  .tb-hist-loss{background:rgba(255,59,31,.12);color:var(--accent);border:1px solid rgba(255,59,31,.2)}
  .tb-hist-info{flex:1}
  .tb-hist-pair{font-family:var(--display);font-size:13px;letter-spacing:1.5px;color:var(--text)}
  .tb-hist-meta{font-size:10px;color:var(--dim);margin-top:2px}
  .tb-hist-pnl{font-family:var(--display);font-size:14px;letter-spacing:1px;flex-shrink:0}
  .tb-hist-reason{font-size:9px;color:var(--dim);font-family:var(--display);letter-spacing:1px;padding:2px 6px;background:var(--s3);border-radius:2px;flex-shrink:0}

  .tb-perf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .tb-perf-card{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:12px;text-align:center}
  .tb-perf-val{font-family:var(--display);font-size:20px;letter-spacing:1px;color:var(--text)}
  .tb-perf-lbl{font-size:9px;color:var(--dim);letter-spacing:1.5px;font-family:var(--display);margin-top:4px}

  .tb-reset-btn{background:none;border:1px solid rgba(255,59,31,.2);border-radius:var(--r);padding:10px;font-family:var(--display);font-size:12px;letter-spacing:2px;color:rgba(255,59,31,.5);cursor:pointer;transition:all .15s;width:100%;margin-top:8px}
  .tb-reset-btn:hover{border-color:var(--accent);color:var(--accent)}

  .tb-empty{text-align:center;padding:24px;color:var(--dim)}
  .tb-empty-icon{font-size:32px;margin-bottom:8px}
  .tb-empty-txt{font-family:var(--display);font-size:12px;letter-spacing:2px}

  .tb-loading{display:flex;align-items:center;justify-content:center;gap:8px;padding:40px 0}
  .tb-loading-txt{font-family:var(--display);font-size:12px;letter-spacing:2px;color:var(--muted)}
  .tb-spinner{width:16px;height:16px;border:2px solid var(--bd);border-top-color:#00ffa3;border-radius:50%;animation:tbSpin .8s linear infinite}
  @keyframes tbSpin{to{transform:rotate(360deg)}}

  .tb-tabs{display:flex;gap:3px;background:var(--s2);border:1px solid var(--bd);border-radius:3px;padding:3px}
  .tb-tab{flex:1;background:transparent;border:none;color:var(--muted);font-family:var(--display);font-size:11px;letter-spacing:1.5px;padding:8px;border-radius:2px;cursor:pointer;transition:all .15s;text-align:center}
  .tb-tab-on{background:#00ffa3;color:#000}

  .tb-mini-chart{height:40px;display:flex;align-items:flex-end;gap:1px;margin-top:8px}
  .tb-mini-bar{flex:1;background:rgba(0,255,163,.3);border-radius:1px 1px 0 0;transition:height .3s}
  .tb-mini-bar-down{background:rgba(255,59,31,.3)}

  @media(max-width:380px){
    .tb-market-grid{grid-template-columns:1fr}
    .tb-perf-grid{grid-template-columns:repeat(2,1fr)}
    .tb-sig-detail{display:none}
  }
`;

function ago(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function MiniChart({ prices }) {
  if (!prices || prices.length < 5) return null;
  const sampled = [];
  const step = Math.max(1, Math.floor(prices.length / 20));
  for (let i = 0; i < prices.length; i += step) sampled.push(prices[i]);
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const range = max - min || 1;
  return (
    <div className="tb-mini-chart">
      {sampled.map((p, i) => {
        const h = Math.max(4, ((p - min) / range) * 36);
        const down = i > 0 && p < sampled[i - 1];
        return <div key={i} className={`tb-mini-bar${down ? " tb-mini-bar-down" : ""}`} style={{ height: h + "px" }} />;
      })}
    </div>
  );
}

export default function TradingBot() {
  const [portfolio, setPortfolio] = useState(() => getPortfolio());
  const [prices, setPrices] = useState({});
  const [selectedCoin, setSelectedCoin] = useState("bitcoin");
  const [analysis, setAnalysis] = useState(null);
  const [marketData, setMarketData] = useState({});
  const [loading, setLoading] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [tab, setTab] = useState("signals");
  const [error, setError] = useState(null);
  const autoRef = useRef(null);
  const priceRef = useRef(prices);
  priceRef.current = prices;

  useEffect(() => { savePortfolio(portfolio); }, [portfolio]);

  const loadPrices = useCallback(async () => {
    try {
      const data = await fetchCurrentPrices();
      const mapped = {};
      COINS.forEach(c => {
        if (data[c.id]) {
          mapped[c.id] = {
            price: data[c.id].usd,
            change24h: data[c.id].usd_24h_change,
            volume: data[c.id].usd_24h_vol,
          };
        }
      });
      setPrices(mapped);
      setError(null);

      const pMap = {};
      COINS.forEach(c => { if (mapped[c.id]) pMap[c.id] = mapped[c.id].price; });
      setPortfolio(prev => checkStopLossAndTakeProfit(prev, pMap));
    } catch (e) {
      console.error("Price fetch error:", e);
      setError("Market data temporarily unavailable. Retrying...");
    }
  }, []);

  const loadMarketData = useCallback(async (coinId) => {
    setAnalysing(true);
    try {
      const data = await fetchMarketData(coinId, 14);
      setMarketData(prev => ({ ...prev, [coinId]: data }));
      const result = analyzeSignals(data.prices, data.volumes);
      setAnalysis(result);
    } catch (e) {
      console.error("Market data error:", e);
      setAnalysis(null);
    }
    setAnalysing(false);
  }, []);

  useEffect(() => {
    loadPrices().then(() => setLoading(false));
    const iv = setInterval(loadPrices, 30000);
    return () => clearInterval(iv);
  }, [loadPrices]);

  useEffect(() => { loadMarketData(selectedCoin); }, [selectedCoin, loadMarketData]);

  useEffect(() => {
    if (!portfolio.autoTrade) { clearInterval(autoRef.current); return; }
    autoRef.current = setInterval(async () => {
      for (const coin of COINS) {
        try {
          const data = await fetchMarketData(coin.id, 14);
          const result = analyzeSignals(data.prices, data.volumes);
          if (result.direction !== "NEUTRAL" && result.confluence >= 3) {
            const price = priceRef.current[coin.id]?.price;
            if (!price) continue;
            setPortfolio(prev => {
              if (prev.positions.find(p => p.coinId === coin.id)) return prev;
              return executeTrade(prev, coin.id, result.direction, price, result);
            });
          }
        } catch {}
      }
    }, 60000);
    return () => clearInterval(autoRef.current);
  }, [portfolio.autoTrade]);

  const handleManualTrade = useCallback(() => {
    if (!analysis || analysis.direction === "NEUTRAL") return;
    const price = prices[selectedCoin]?.price;
    if (!price) return;
    setPortfolio(prev => executeTrade(prev, selectedCoin, analysis.direction, price, analysis));
  }, [analysis, prices, selectedCoin]);

  const handleClosePosition = useCallback((posId, coinId) => {
    const price = prices[coinId]?.price;
    if (!price) return;
    setPortfolio(prev => closePosition(prev, posId, price, "manual"));
  }, [prices]);

  const metrics = useMemo(() => getPerformanceMetrics(portfolio), [portfolio]);

  const confColor = analysis
    ? analysis.direction === "BUY" ? "#00ffa3"
    : analysis.direction === "SELL" ? "#ff3b1f"
    : "var(--dim)"
    : "var(--dim)";

  const confPct = analysis ? (analysis.confluence / analysis.totalSignals) * 100 : 0;

  if (loading) {
    return (
      <>
        <style>{TRADING_STYLES}</style>
        <div className="tb-wrap">
          <div className="tb-loading"><div className="tb-spinner" /><span className="tb-loading-txt">CONNECTING TO MARKETS...</span></div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{TRADING_STYLES}</style>
      <div className="tb-wrap">
        <div className="tb-header">
          <div>
            <div className="tb-title">TRADE BOT</div>
            <div className="tb-subtitle">multi-indicator confluence engine</div>
          </div>
          <div className="tb-paper-badge">PAPER TRADING</div>
        </div>

        <div className="tb-disclaimer">
          Simulation only -- not real money. Uses technical analysis confluence (3+ indicators must agree) for high-probability signals. Past patterns do not guarantee future results.
        </div>

        {/* BALANCE CARD */}
        <div className="tb-balance-card">
          <div className="tb-bal-row">
            <div>
              <div className="tb-bal-lbl">PORTFOLIO VALUE</div>
              <div className="tb-bal-val">${Number(metrics.totalValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div className={`tb-bal-change ${Number(metrics.totalReturn) >= 0 ? "tb-bal-pos" : "tb-bal-neg"}`}>
              {Number(metrics.totalReturn) >= 0 ? "+" : ""}{metrics.totalReturn}%
            </div>
          </div>
          <div className="tb-bal-stats">
            <div className="tb-bal-stat">
              <span className="tb-bal-stat-val">{metrics.winRate}%</span>
              <span className="tb-bal-stat-lbl">WIN RATE</span>
            </div>
            <div className="tb-bal-stat">
              <span className="tb-bal-stat-val">{metrics.totalTrades}</span>
              <span className="tb-bal-stat-lbl">TRADES</span>
            </div>
            <div className="tb-bal-stat">
              <span className={`tb-bal-stat-val ${Number(metrics.totalPnL) >= 0 ? "tb-green" : "tb-red"}`}>
                {Number(metrics.totalPnL) >= 0 ? "+" : ""}${Number(metrics.totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="tb-bal-stat-lbl">TOTAL P&L</span>
            </div>
            <div className="tb-bal-stat">
              <span className="tb-bal-stat-val">{metrics.profitFactor}</span>
              <span className="tb-bal-stat-lbl">PROFIT FACTOR</span>
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="tb-controls">
          <div className="tb-toggle" onClick={() => setPortfolio(prev => ({ ...prev, autoTrade: !prev.autoTrade }))}>
            <div className={`tb-toggle-dot ${portfolio.autoTrade ? "tb-toggle-on" : "tb-toggle-off"}`} />
            <div>
              <div className="tb-toggle-lbl">AUTO TRADE</div>
              <div className="tb-toggle-sub">{portfolio.autoTrade ? "scanning every 60s" : "manual mode"}</div>
            </div>
          </div>
          <div className="tb-risk-sel">
            <div className="tb-risk-lbl">RISK LEVEL</div>
            <div className="tb-risk-opts">
              {["conservative", "medium", "aggressive"].map(r => (
                <div key={r} className={`tb-risk-opt${portfolio.riskLevel === r ? " tb-risk-opt-on" : ""}`}
                  onClick={() => setPortfolio(prev => ({ ...prev, riskLevel: r }))}>
                  {r.slice(0, 3).toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MARKET OVERVIEW */}
        <div className="tb-section">MARKETS</div>
        <div className="tb-market-grid">
          {COINS.map(coin => {
            const p = prices[coin.id];
            const hasPosition = portfolio.positions.some(pos => pos.coinId === coin.id);
            return (
              <div key={coin.id}
                className={`tb-coin-card${selectedCoin === coin.id ? " tb-coin-active" : ""}`}
                onClick={() => setSelectedCoin(coin.id)}
                style={hasPosition ? { borderColor: "rgba(255,140,0,.4)" } : {}}>
                <div className="tb-coin-top">
                  <div>
                    <div className="tb-coin-sym" style={{ color: coin.color }}>{coin.symbol}</div>
                    <div className="tb-coin-name">{coin.name}</div>
                  </div>
                  {hasPosition && <span style={{ fontSize: 10, color: "var(--orange)", fontFamily: "var(--display)", letterSpacing: 1 }}>OPEN</span>}
                </div>
                {p ? (
                  <>
                    <div className="tb-coin-price">${p.price >= 1000 ? p.price.toLocaleString(undefined, { maximumFractionDigits: 0 }) : p.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                    <div className={`tb-coin-change ${p.change24h >= 0 ? "tb-green" : "tb-red"}`}>
                      {p.change24h >= 0 ? "+" : ""}{p.change24h?.toFixed(2)}%
                    </div>
                  </>
                ) : (
                  <div className="tb-coin-price" style={{ color: "var(--dim)" }}>--</div>
                )}
                {marketData[coin.id] && <MiniChart prices={marketData[coin.id].prices} />}
              </div>
            );
          })}
        </div>

        {/* TABS */}
        <div className="tb-tabs">
          <button className={`tb-tab${tab === "signals" ? " tb-tab-on" : ""}`} onClick={() => setTab("signals")}>SIGNALS</button>
          <button className={`tb-tab${tab === "positions" ? " tb-tab-on" : ""}`} onClick={() => setTab("positions")}>POSITIONS ({portfolio.positions.length})</button>
          <button className={`tb-tab${tab === "history" ? " tb-tab-on" : ""}`} onClick={() => setTab("history")}>HISTORY</button>
          <button className={`tb-tab${tab === "stats" ? " tb-tab-on" : ""}`} onClick={() => setTab("stats")}>STATS</button>
        </div>

        {/* SIGNALS TAB */}
        {tab === "signals" && (
          <>
            {analysing ? (
              <div className="tb-loading"><div className="tb-spinner" /><span className="tb-loading-txt">ANALYSING {COINS.find(c => c.id === selectedCoin)?.symbol}...</span></div>
            ) : analysis ? (
              <div className="tb-signal-card">
                <div className="tb-signal-header">
                  <div className="tb-signal-coin" style={{ color: COINS.find(c => c.id === selectedCoin)?.color }}>
                    {COINS.find(c => c.id === selectedCoin)?.symbol}/USD
                  </div>
                  <div className={`tb-signal-dir tb-signal-${analysis.direction.toLowerCase()}`}>
                    {analysis.direction}
                  </div>
                </div>

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
                          <div className="tb-sig-bar-fill"
                            style={{
                              width: `${sig.strength}%`,
                              background: sig.direction === "BUY" ? "#00ffa3" : sig.direction === "SELL" ? "#ff3b1f" : "var(--dim)"
                            }}
                          />
                        </div>
                      </div>
                      <span className="tb-sig-val">{sig.value}</span>
                      <span className="tb-sig-detail">{sig.detail}</span>
                    </div>
                  ))}
                </div>

                {analysis.direction !== "NEUTRAL" && !portfolio.positions.find(p => p.coinId === selectedCoin) && (
                  <button
                    className={`tb-trade-btn ${analysis.direction === "BUY" ? "tb-trade-buy" : "tb-trade-sell"}`}
                    onClick={handleManualTrade}
                    disabled={!prices[selectedCoin]}>
                    {analysis.direction === "BUY" ? "OPEN LONG" : "OPEN SHORT"} {COINS.find(c => c.id === selectedCoin)?.symbol}
                  </button>
                )}
                {portfolio.positions.find(p => p.coinId === selectedCoin) && (
                  <div style={{ textAlign: "center", padding: "8px 0", fontSize: 11, color: "var(--orange)", fontFamily: "var(--display)", letterSpacing: 2 }}>
                    POSITION ALREADY OPEN
                  </div>
                )}
              </div>
            ) : (
              <div className="tb-empty"><div className="tb-empty-icon">📊</div><div className="tb-empty-txt">SELECT A COIN TO ANALYSE</div></div>
            )}
          </>
        )}

        {/* POSITIONS TAB */}
        {tab === "positions" && (
          portfolio.positions.length === 0 ? (
            <div className="tb-empty"><div className="tb-empty-icon">📭</div><div className="tb-empty-txt">NO OPEN POSITIONS</div></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {portfolio.positions.map(pos => {
                const curPrice = prices[pos.coinId]?.price;
                const unrealizedPnL = curPrice
                  ? pos.direction === "BUY"
                    ? (curPrice - pos.entryPrice) * pos.quantity
                    : (pos.entryPrice - curPrice) * pos.quantity
                  : 0;
                const unrealizedPct = pos.value > 0 ? (unrealizedPnL / pos.value) * 100 : 0;
                const coin = COINS.find(c => c.id === pos.coinId);
                return (
                  <div key={pos.id} className="tb-pos-card">
                    <div className="tb-pos-row">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="tb-pos-sym" style={{ color: coin?.color }}>{pos.symbol}</span>
                        <span className={`tb-pos-dir-badge ${pos.direction === "BUY" ? "tb-signal-buy" : "tb-signal-sell"}`}>
                          {pos.direction === "BUY" ? "LONG" : "SHORT"}
                        </span>
                      </div>
                      <button className="tb-pos-close" onClick={() => handleClosePosition(pos.id, pos.coinId)}>CLOSE</button>
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
                          {unrealizedPnL >= 0 ? "+" : ""}${unrealizedPnL.toFixed(2)} ({unrealizedPct >= 0 ? "+" : ""}{unrealizedPct.toFixed(1)}%)
                        </span>
                        <span className="tb-pos-item-lbl">P&L</span>
                      </div>
                      <div className="tb-pos-item">
                        <span className="tb-pos-item-val tb-red">${pos.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        <span className="tb-pos-item-lbl">STOP LOSS</span>
                      </div>
                      <div className="tb-pos-item">
                        <span className="tb-pos-item-val tb-green">${pos.takeProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        <span className="tb-pos-item-lbl">TAKE PROFIT</span>
                      </div>
                      <div className="tb-pos-item">
                        <span className="tb-pos-item-val">${pos.value.toFixed(2)}</span>
                        <span className="tb-pos-item-lbl">SIZE</span>
                      </div>
                    </div>
                    <div className="tb-pos-signals">
                      <span style={{ fontSize: 9, color: "var(--dim)", fontFamily: "var(--display)", letterSpacing: 1 }}>SIGNALS:</span>
                      {pos.signals.map(s => <span key={s} className="tb-pos-sig-tag">{s}</span>)}
                      <span className="tb-pos-sig-tag" style={{ color: "#00ffa3", borderColor: "rgba(0,255,163,.2)" }}>{pos.confluence}/{6} CONF</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* HISTORY TAB */}
        {tab === "history" && (
          portfolio.history.length === 0 ? (
            <div className="tb-empty"><div className="tb-empty-icon">📜</div><div className="tb-empty-txt">NO TRADE HISTORY YET</div></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {portfolio.history.map(trade => (
                <div key={trade.id} className="tb-history-row">
                  <div className={`tb-hist-result ${trade.result === "WIN" ? "tb-hist-win" : "tb-hist-loss"}`}>
                    {trade.result}
                  </div>
                  <div className="tb-hist-info">
                    <div className="tb-hist-pair">{trade.symbol} {trade.direction}</div>
                    <div className="tb-hist-meta">
                      ${trade.entryPrice.toFixed(2)} → ${trade.exitPrice.toFixed(2)} · {ago(trade.closedAt)}
                    </div>
                  </div>
                  <div className={`tb-hist-pnl ${trade.pnl >= 0 ? "tb-green" : "tb-red"}`}>
                    {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                  </div>
                  <div className="tb-hist-reason">{trade.reason.replace("_", " ").toUpperCase()}</div>
                </div>
              ))}
            </div>
          )
        )}

        {/* STATS TAB */}
        {tab === "stats" && (
          <>
            <div className="tb-perf-grid">
              <div className="tb-perf-card">
                <div className="tb-perf-val" style={{ color: Number(metrics.winRate) >= 50 ? "#00ffa3" : "var(--accent)" }}>{metrics.winRate}%</div>
                <div className="tb-perf-lbl">WIN RATE</div>
              </div>
              <div className="tb-perf-card">
                <div className="tb-perf-val">{metrics.totalTrades}</div>
                <div className="tb-perf-lbl">TOTAL TRADES</div>
              </div>
              <div className="tb-perf-card">
                <div className="tb-perf-val tb-green">{metrics.wins}</div>
                <div className="tb-perf-lbl">WINS</div>
              </div>
              <div className="tb-perf-card">
                <div className="tb-perf-val tb-red">{metrics.losses}</div>
                <div className="tb-perf-lbl">LOSSES</div>
              </div>
              <div className="tb-perf-card">
                <div className="tb-perf-val tb-green">+${metrics.avgWin}</div>
                <div className="tb-perf-lbl">AVG WIN</div>
              </div>
              <div className="tb-perf-card">
                <div className="tb-perf-val tb-red">-${metrics.avgLoss}</div>
                <div className="tb-perf-lbl">AVG LOSS</div>
              </div>
              <div className="tb-perf-card">
                <div className="tb-perf-val">{metrics.profitFactor}</div>
                <div className="tb-perf-lbl">PROFIT FACTOR</div>
              </div>
              <div className="tb-perf-card">
                <div className={`tb-perf-val ${Number(metrics.totalPnL) >= 0 ? "tb-green" : "tb-red"}`}>
                  {Number(metrics.totalPnL) >= 0 ? "+" : ""}${Number(metrics.totalPnL).toFixed(2)}
                </div>
                <div className="tb-perf-lbl">TOTAL P&L</div>
              </div>
              <div className="tb-perf-card">
                <div className={`tb-perf-val ${Number(metrics.totalReturn) >= 0 ? "tb-green" : "tb-red"}`}>
                  {Number(metrics.totalReturn) >= 0 ? "+" : ""}{metrics.totalReturn}%
                </div>
                <div className="tb-perf-lbl">TOTAL RETURN</div>
              </div>
            </div>

            <div style={{ marginTop: 8, padding: 14, background: "var(--card)", border: "1px solid var(--bd)", borderRadius: "var(--r)" }}>
              <div style={{ fontFamily: "var(--display)", fontSize: 12, letterSpacing: 2, color: "var(--muted)", marginBottom: 10 }}>STRATEGY INFO</div>
              <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.8 }}>
                <p>This bot uses <strong>multi-indicator confluence</strong> -- it only opens a position when 3 or more independent technical indicators agree on the same direction.</p>
                <p style={{ marginTop: 8 }}>Indicators used: RSI, EMA Crossover, MACD, Bollinger Bands, MA Trend, Volume Analysis.</p>
                <p style={{ marginTop: 8 }}>Risk management: Automatic stop-loss ({(0.02 * 100).toFixed(0)}%) and take-profit ({(0.04 * 100).toFixed(0)}%) on every trade. Position sizing: {(0.05 * 100).toFixed(0)}% of portfolio per trade.</p>
              </div>
            </div>
          </>
        )}

        {error && (
          <div style={{ textAlign: "center", padding: 12, fontSize: 11, color: "var(--orange)", fontFamily: "var(--display)", letterSpacing: 1 }}>
            {error}
          </div>
        )}

        <button className="tb-reset-btn" onClick={() => { if (confirm("Reset portfolio to $10,000? All history will be cleared.")) setPortfolio(resetPortfolio()); }}>
          RESET PORTFOLIO
        </button>
      </div>
    </>
  );
}
