const TRADING_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#060608;--sf:#0d0d12;--s2:#141419;--s3:#1a1a22;--bd:#252530;--accent:#ff3b1f;--orange:#ff8c00;--gold:#c9a84c;--green:#00ffa3;--text:#e8e6e1;--muted:#6b6560;--dim:#3a3835;--card:#0a0a0f;--display:'Bebas Neue',sans-serif;--body:'DM Sans',sans-serif;--r:6px}
  body{background:var(--bg);color:var(--text);font-family:var(--body);min-height:100vh;overflow-x:hidden}
  .app{max-width:520px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column}

  /* SETUP SCREEN */
  .setup-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;position:relative}
  .setup-glow{position:fixed;inset:0;background:radial-gradient(ellipse 80% 50% at 50% -5%,rgba(0,255,163,.08) 0%,transparent 70%);pointer-events:none}
  .setup-card{width:100%;max-width:420px;background:var(--sf);border:1px solid var(--bd);border-radius:10px;padding:32px 24px;position:relative;z-index:1;box-shadow:0 32px 80px rgba(0,0,0,.6)}
  .setup-logo{font-family:var(--display);font-size:64px;line-height:1;background:linear-gradient(135deg,var(--green),#00d4aa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-align:center;letter-spacing:4px}
  .setup-tagline{font-size:11px;color:var(--dim);letter-spacing:3px;text-transform:uppercase;text-align:center;margin-bottom:28px}
  .setup-section{font-family:var(--display);font-size:14px;letter-spacing:2px;color:var(--muted);margin-bottom:14px}
  .setup-exchanges{display:flex;flex-direction:column;gap:8px}
  .setup-ex-btn{display:flex;align-items:center;gap:14px;width:100%;background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:14px 16px;cursor:pointer;transition:all .15s;text-align:left}
  .setup-ex-btn:hover{border-color:var(--green);background:rgba(0,255,163,.03)}
  .setup-ex-icon{font-size:28px;flex-shrink:0}
  .setup-ex-info{flex:1}
  .setup-ex-name{font-family:var(--display);font-size:16px;letter-spacing:2px;color:var(--text);display:block}
  .setup-ex-desc{font-size:11px;color:var(--dim);display:block;margin-top:2px}
  .setup-ex-arrow{font-size:24px;color:var(--dim);flex-shrink:0}
  .setup-back{background:none;border:none;color:var(--muted);font-size:13px;cursor:pointer;padding:0;margin-bottom:16px;font-family:var(--body)}
  .setup-connect-header{display:flex;align-items:center;gap:14px;margin-bottom:20px}
  .setup-connect-name{font-family:var(--display);font-size:22px;letter-spacing:2px;color:var(--text)}
  .setup-connect-desc{font-size:11px;color:var(--dim)}
  .setup-warning{background:rgba(255,140,0,.08);border:1px solid rgba(255,140,0,.2);border-radius:var(--r);padding:12px;font-size:12px;color:var(--orange);line-height:1.6;margin-bottom:14px}
  .setup-info{background:rgba(0,255,163,.05);border:1px solid rgba(0,255,163,.15);border-radius:var(--r);padding:12px;font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:14px}
  .setup-field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
  .setup-lbl{font-family:var(--display);font-size:11px;letter-spacing:2px;color:var(--muted)}
  .setup-inp{background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);color:var(--text);font-family:var(--body);font-size:14px;padding:12px 14px;outline:none;transition:border-color .2s}
  .setup-inp:focus{border-color:var(--green)}
  .setup-error{font-size:12px;color:var(--accent);margin-bottom:8px}
  .setup-connect-btn{background:var(--green);border:none;color:#000;font-family:var(--display);font-size:16px;letter-spacing:2px;padding:14px;border-radius:var(--r);cursor:pointer;width:100%;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px}
  .setup-connect-btn:hover{transform:scale(1.02)}
  .setup-connect-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
  .setup-testnet-toggle{display:flex;align-items:center;gap:10px;cursor:pointer;padding:8px 0;font-size:13px;color:var(--muted)}
  .setup-toggle-dot{width:36px;height:20px;border-radius:10px;background:var(--dim);position:relative;transition:all .2s;flex-shrink:0}
  .setup-toggle-dot::after{content:'';position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:var(--muted);transition:all .2s}
  .setup-toggle-on{background:rgba(0,255,163,.3)}
  .setup-toggle-on::after{left:19px;background:var(--green)}
  .setup-footer{font-size:10px;color:var(--dim);text-align:center;margin-top:20px;letter-spacing:1.5px}

  /* HEADER */
  .tb-header-bar{padding:16px 20px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10;background:linear-gradient(to bottom,var(--bg) 85%,transparent)}
  .tb-logo{font-family:var(--display);font-size:36px;line-height:1;letter-spacing:3px;background:linear-gradient(135deg,var(--green),#00d4aa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
  .tb-logo-sub{font-size:10px;color:var(--dim);letter-spacing:2px;margin-top:2px}
  .tb-bot-status{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;font-family:var(--display);font-size:11px;letter-spacing:1.5px}
  .tb-bot-on{background:rgba(0,255,163,.1);border:1px solid rgba(0,255,163,.3);color:var(--green)}
  .tb-bot-off{background:var(--s2);border:1px solid var(--bd);color:var(--muted)}
  .tb-status-dot{width:8px;height:8px;border-radius:50%;background:var(--dim)}
  .tb-dot-on{background:var(--green);box-shadow:0 0 6px rgba(0,255,163,.6);animation:tbPulse 2s ease infinite}
  @keyframes tbPulse{0%,100%{opacity:1}50%{opacity:.5}}

  .tb-main{flex:1;overflow-y:auto}
  .tb-wrap{padding:0 16px 40px;display:flex;flex-direction:column;gap:12px}

  /* BALANCE */
  .tb-balance-card{background:linear-gradient(135deg,rgba(0,255,163,.05),rgba(0,212,170,.02));border:1px solid rgba(0,255,163,.15);border-radius:var(--r);padding:16px}
  .tb-bal-row{display:flex;align-items:center;justify-content:space-between}
  .tb-bal-lbl{font-family:var(--display);font-size:10px;letter-spacing:2px;color:var(--muted)}
  .tb-bal-val{font-family:var(--display);font-size:28px;letter-spacing:2px;color:var(--green);margin-top:2px}
  .tb-bal-stats-mini{display:flex;flex-direction:column;gap:4px;align-items:flex-end}
  .tb-bal-stat-pill{font-family:var(--display);font-size:11px;letter-spacing:1px;padding:3px 8px;border-radius:3px}
  .tb-pill-green{background:rgba(0,255,163,.1);color:var(--green)}
  .tb-pill-red{background:rgba(255,59,31,.1);color:var(--accent)}

  /* CONTROLS */
  .tb-controls{display:flex;gap:8px}
  .tb-toggle{display:flex;align-items:center;gap:8px;background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:10px 14px;cursor:pointer;flex:1}
  .tb-toggle-dot{width:10px;height:10px;border-radius:50%;transition:all .2s;flex-shrink:0}
  .tb-toggle-on{background:var(--green);box-shadow:0 0 8px rgba(0,255,163,.5)}
  .tb-toggle-off{background:var(--dim)}
  .tb-toggle-lbl{font-family:var(--display);font-size:12px;letter-spacing:1.5px;color:var(--text)}
  .tb-toggle-sub{font-size:10px;color:var(--dim)}
  .tb-risk-sel{background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:10px 14px;flex:1}
  .tb-risk-lbl{font-family:var(--display);font-size:10px;letter-spacing:1.5px;color:var(--muted);margin-bottom:6px}
  .tb-risk-opts{display:flex;gap:3px}
  .tb-risk-opt{flex:1;background:var(--s3);border:1px solid var(--bd);border-radius:3px;padding:5px 0;text-align:center;font-family:var(--display);font-size:10px;letter-spacing:1px;color:var(--muted);cursor:pointer;transition:all .15s}
  .tb-risk-opt-on{border-color:var(--green);color:var(--green);background:rgba(0,255,163,.06)}

  .tb-section{font-family:var(--display);font-size:13px;letter-spacing:2px;color:var(--text);margin-top:4px}
  .tb-section-count{font-size:11px;color:var(--dim);margin-left:6px}

  /* MARKET SCROLL */
  .tb-market-scroll{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
  .tb-market-scroll::-webkit-scrollbar{display:none}
  .tb-coin-chip{flex-shrink:0;background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:10px 14px;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;gap:3px;min-width:90px;position:relative}
  .tb-coin-chip:hover{border-color:rgba(0,255,163,.3)}
  .tb-coin-chip-active{border-color:rgba(0,255,163,.5);background:rgba(0,255,163,.03)}
  .tb-chip-sym{font-family:var(--display);font-size:15px;letter-spacing:2px}
  .tb-chip-price{font-family:var(--display);font-size:13px;color:var(--text)}
  .tb-chip-change{font-size:10px;font-family:var(--display);letter-spacing:1px}
  .tb-chip-pos-dot{position:absolute;top:6px;right:6px;width:6px;height:6px;border-radius:50%;background:var(--orange)}

  /* TABS */
  .tb-tabs{display:flex;gap:2px;background:var(--s2);border:1px solid var(--bd);border-radius:4px;padding:3px;overflow-x:auto;scrollbar-width:none}
  .tb-tabs::-webkit-scrollbar{display:none}
  .tb-tab{flex-shrink:0;background:transparent;border:none;color:var(--muted);font-family:var(--display);font-size:10px;letter-spacing:1px;padding:7px 10px;border-radius:3px;cursor:pointer;transition:all .15s;white-space:nowrap}
  .tb-tab-on{background:var(--green);color:#000}

  .tb-green{color:var(--green)!important}
  .tb-red{color:var(--accent)!important}

  /* SIGNAL CARD */
  .tb-signal-card{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:16px}
  .tb-signal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
  .tb-signal-coin{font-family:var(--display);font-size:18px;letter-spacing:2px}
  .tb-signal-dir{font-family:var(--display);font-size:13px;letter-spacing:2px;padding:4px 14px;border-radius:3px}
  .tb-signal-buy{background:rgba(0,255,163,.12);color:var(--green);border:1px solid rgba(0,255,163,.3)}
  .tb-signal-sell{background:rgba(255,59,31,.12);color:var(--accent);border:1px solid rgba(255,59,31,.3)}
  .tb-signal-neutral{background:var(--s2);color:var(--muted);border:1px solid var(--bd)}
  .tb-signal-summary{font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:12px;padding:8px 10px;background:var(--s2);border-radius:var(--r)}
  .tb-confluence{display:flex;align-items:center;gap:8px;margin-bottom:12px}
  .tb-conf-bar{flex:1;height:6px;background:var(--s3);border-radius:3px;overflow:hidden}
  .tb-conf-fill{height:100%;border-radius:3px;transition:width .5s ease}
  .tb-conf-lbl{font-family:var(--display);font-size:12px;letter-spacing:1px;flex-shrink:0}
  .tb-signal-grid{display:flex;flex-direction:column;gap:5px}
  .tb-signal-row{display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--s2);border-radius:4px}
  .tb-sig-name{font-family:var(--display);font-size:11px;letter-spacing:1.5px;color:var(--text);width:75px;flex-shrink:0}
  .tb-sig-dir{font-size:9px;font-family:var(--display);letter-spacing:1px;padding:2px 6px;border-radius:2px;width:44px;text-align:center;flex-shrink:0}
  .tb-sig-buy{background:rgba(0,255,163,.1);color:var(--green)}
  .tb-sig-sell{background:rgba(255,59,31,.1);color:var(--accent)}
  .tb-sig-neut{background:var(--s3);color:var(--dim)}
  .tb-sig-str{flex:1;display:flex;align-items:center;gap:6px}
  .tb-sig-bar{flex:1;height:3px;background:var(--s3);border-radius:2px;overflow:hidden}
  .tb-sig-bar-fill{height:100%;border-radius:2px;transition:width .3s}
  .tb-sig-val{font-size:10px;color:var(--muted);font-family:monospace;width:50px;text-align:right;flex-shrink:0}
  .tb-sig-detail{font-size:9px;color:var(--dim);width:110px;text-align:right;flex-shrink:0}
  .tb-trade-btn{width:100%;padding:12px;border:none;border-radius:var(--r);font-family:var(--display);font-size:15px;letter-spacing:2px;cursor:pointer;transition:all .15s;margin-top:10px}
  .tb-trade-btn:hover{transform:scale(1.02)}
  .tb-trade-btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
  .tb-trade-buy{background:var(--green);color:#000}
  .tb-trade-sell{background:var(--accent);color:#fff}

  /* POSITIONS */
  .tb-pos-card{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:14px}
  .tb-pos-row{display:flex;align-items:center;justify-content:space-between}
  .tb-pos-sym{font-family:var(--display);font-size:16px;letter-spacing:2px}
  .tb-pos-dir-badge{font-family:var(--display);font-size:9px;letter-spacing:1.5px;padding:2px 8px;border-radius:2px}
  .tb-pos-detail{display:flex;gap:14px;margin-top:10px;flex-wrap:wrap}
  .tb-pos-item{display:flex;flex-direction:column;gap:2px}
  .tb-pos-item-val{font-size:12px;color:var(--text);font-family:monospace}
  .tb-pos-item-lbl{font-size:8px;color:var(--dim);letter-spacing:1.5px;font-family:var(--display)}
  .tb-pos-close{background:var(--s3);border:1px solid var(--bd);border-radius:3px;padding:6px 12px;font-family:var(--display);font-size:10px;letter-spacing:1.5px;color:var(--accent);cursor:pointer;transition:all .15s}
  .tb-pos-close:hover{border-color:var(--accent);background:rgba(255,59,31,.08)}
  .tb-pos-signals{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px}
  .tb-pos-sig-tag{font-size:8px;font-family:var(--display);letter-spacing:1px;padding:2px 6px;background:var(--s3);border:1px solid var(--bd);border-radius:2px;color:var(--muted)}

  /* HISTORY */
  .tb-history-row{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:10px 12px;display:flex;align-items:center;gap:10px}
  .tb-hist-result{font-family:var(--display);font-size:10px;letter-spacing:1.5px;padding:3px 8px;border-radius:2px;flex-shrink:0}
  .tb-hist-win{background:rgba(0,255,163,.12);color:var(--green);border:1px solid rgba(0,255,163,.2)}
  .tb-hist-loss{background:rgba(255,59,31,.12);color:var(--accent);border:1px solid rgba(255,59,31,.2)}
  .tb-hist-info{flex:1;min-width:0}
  .tb-hist-pair{font-family:var(--display);font-size:12px;letter-spacing:1.5px;color:var(--text)}
  .tb-hist-meta{font-size:10px;color:var(--dim);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .tb-hist-pnl{font-family:var(--display);font-size:13px;letter-spacing:1px;flex-shrink:0}
  .tb-hist-reason{font-size:8px;color:var(--dim);font-family:var(--display);letter-spacing:1px;padding:2px 6px;background:var(--s3);border-radius:2px;flex-shrink:0}

  /* STATS */
  .tb-perf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
  .tb-perf-card{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:12px;text-align:center}
  .tb-perf-val{font-family:var(--display);font-size:18px;letter-spacing:1px;color:var(--text)}
  .tb-perf-lbl{font-size:8px;color:var(--dim);letter-spacing:1.5px;font-family:var(--display);margin-top:4px}
  .tb-strategy-info{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:16px;margin-top:8px}
  .tb-strategy-title{font-family:var(--display);font-size:12px;letter-spacing:2px;color:var(--muted);margin-bottom:10px}
  .tb-strategy-body{font-size:12px;color:var(--text);line-height:1.8}
  .tb-strategy-body strong{color:var(--green)}

  /* SETTINGS */
  .tb-settings-section{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:14px}
  .tb-settings-title{font-family:var(--display);font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:10px}
  .tb-settings-exchange{display:flex;align-items:center;gap:12px}
  .tb-settings-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--bd)}
  .tb-settings-row:last-child{border-bottom:none}
  .tb-settings-lbl{font-size:12px;color:var(--text)}
  .tb-settings-input-wrap{display:flex;align-items:center;gap:6px}
  .tb-settings-input{background:var(--s2);border:1px solid var(--bd);border-radius:4px;color:var(--text);font-family:var(--body);font-size:13px;padding:6px 10px;width:70px;text-align:center;outline:none}
  .tb-settings-input:focus{border-color:var(--green)}
  .tb-settings-unit{font-size:10px;color:var(--dim)}
  .tb-pair-grid{display:flex;flex-wrap:wrap;gap:6px}
  .tb-pair-btn{background:var(--s2);border:1px solid var(--bd);border-radius:3px;padding:6px 12px;font-family:var(--display);font-size:11px;letter-spacing:1.5px;color:var(--muted);cursor:pointer;transition:all .15s}
  .tb-pair-btn:hover{border-color:var(--green)}
  .tb-pair-on{background:rgba(0,255,163,.06)}

  /* SHARED */
  .tb-mini-chart{height:28px;display:flex;align-items:flex-end;gap:1px;margin-top:6px}
  .tb-mini-bar{flex:1;background:rgba(0,255,163,.35);border-radius:1px 1px 0 0;transition:height .3s}
  .tb-mini-bar-down{background:rgba(255,59,31,.35)}
  .tb-empty{text-align:center;padding:32px;color:var(--dim)}
  .tb-empty-icon{font-size:32px;margin-bottom:8px}
  .tb-empty-txt{font-family:var(--display);font-size:12px;letter-spacing:2px}
  .tb-loading{display:flex;align-items:center;justify-content:center;gap:8px;padding:40px 0}
  .tb-loading-txt{font-family:var(--display);font-size:11px;letter-spacing:2px;color:var(--muted)}
  .tb-spinner{width:16px;height:16px;border:2px solid var(--bd);border-top-color:var(--green);border-radius:50%;animation:tbSpin .8s linear infinite}
  @keyframes tbSpin{to{transform:rotate(360deg)}}
  .tb-reset-btn{background:none;border:1px solid rgba(255,59,31,.2);border-radius:var(--r);padding:10px;font-family:var(--display);font-size:11px;letter-spacing:2px;color:rgba(255,59,31,.4);cursor:pointer;transition:all .15s;width:100%;margin-top:8px}
  .tb-reset-btn:hover{border-color:var(--accent);color:var(--accent)}

  @media(max-width:380px){
    .tb-perf-grid{grid-template-columns:repeat(2,1fr)}
    .tb-sig-detail{display:none}
    .tb-sig-val{width:40px}
  }
`;

export default TRADING_STYLES;
