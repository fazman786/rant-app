const STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#080808;--sf:#111;--s2:#181818;--s3:#1f1f1f;--bd:#262626;--accent:#ff3b1f;--orange:#ff8c00;--gold:#c9a84c;--void:#7c3aed;--indigo:#6366f1;--text:#ede9e1;--muted:#6b6560;--dim:#363230;--card:#101010;--display:'Bebas Neue',sans-serif;--body:'DM Sans',sans-serif;--r:4px;}
    body{background:var(--bg);color:var(--text);font-family:var(--body);min-height:100vh;overflow-x:hidden}
    .app{max-width:480px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column}

    .auth-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;overflow:hidden;position:relative}
    .auth-glow{position:fixed;inset:0;background:radial-gradient(ellipse 80% 50% at 50% -5%,rgba(255,59,31,.16) 0%,transparent 70%);pointer-events:none}
    .auth-card{width:100%;max-width:360px;background:var(--sf);border:1px solid var(--bd);border-radius:12px;padding:36px 28px;position:relative;z-index:1;box-shadow:0 32px 80px rgba(0,0,0,.6)}
    .auth-logo{font-family:var(--display);font-size:72px;line-height:1;background:linear-gradient(135deg,var(--accent),var(--orange));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-align:center;letter-spacing:4px}
    .auth-tagline{font-size:11px;color:var(--dim);letter-spacing:3px;text-transform:uppercase;text-align:center;margin-bottom:28px}
    .auth-tabs{display:flex;gap:3px;background:var(--s2);border:1px solid var(--bd);border-radius:4px;padding:3px;margin-bottom:22px}
    .atab{flex:1;background:transparent;border:none;color:var(--muted);font-family:var(--display);font-size:14px;letter-spacing:2px;padding:10px;border-radius:2px;cursor:pointer;transition:all .15s}
    .atab-on{background:var(--accent);color:#fff}
    .auth-form{display:flex;flex-direction:column;gap:14px}
    .auth-form.shake{animation:shake .4s ease}
    @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
    .auth-field{display:flex;flex-direction:column;gap:6px}
    .auth-lbl{font-family:var(--display);font-size:11px;letter-spacing:2px;color:var(--muted)}
    .auth-inp{background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);color:var(--text);font-family:var(--body);font-size:15px;padding:12px 14px;outline:none;transition:border-color .2s}
    .auth-inp:focus{border-color:var(--accent)}
    .auth-error{font-size:12px;color:var(--accent)}
    .auth-submit{background:var(--accent);border:none;color:#fff;font-family:var(--display);font-size:18px;letter-spacing:2px;padding:14px;border-radius:var(--r);cursor:pointer;transition:all .15s;margin-top:4px}
    .auth-submit:hover{transform:scale(1.02)}
    .auth-submit:disabled{opacity:.6;cursor:not-allowed;transform:none}
    .auth-footer{font-size:10px;color:var(--dim);text-align:center;margin-top:20px;letter-spacing:1.5px}

    .vs-screen{position:fixed;inset:0;z-index:200;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;animation:fadeIn .3s ease;max-width:480px;margin:0 auto}
    .vs-screen.vs-out{animation:fadeOut .3s ease forwards}
    @keyframes fadeOut{to{opacity:0;transform:scale(.98)}}
    .vs-bg{position:fixed;inset:0;background:radial-gradient(ellipse 100% 60% at 50% 0%,rgba(124,58,237,.12) 0%,transparent 70%);pointer-events:none;z-index:-1}
    .vs-content{width:100%;max-width:420px;display:flex;flex-direction:column;gap:20px}
    .vs-logo{font-family:var(--display);font-size:36px;letter-spacing:4px;background:linear-gradient(135deg,var(--accent),var(--orange));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-align:center}
    .vs-released{font-family:var(--display);font-size:42px;letter-spacing:5px;text-align:center;background:linear-gradient(135deg,var(--accent),var(--orange));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:popIn .5s cubic-bezier(.34,1.56,.64,1)}
    .vs-sub{font-size:11px;color:var(--muted);letter-spacing:4px;text-transform:uppercase;text-align:center;margin-top:-12px}
    .vs-rant-preview{background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:14px}
    .vs-rant-text{font-size:14px;color:var(--muted);font-style:italic;line-height:1.6}
    .vs-divider{display:flex;align-items:center;gap:10px}
    .vs-divider::before,.vs-divider::after{content:'';flex:1;height:1px;background:var(--bd)}
    .vs-divider-label{font-family:var(--display);font-size:10px;letter-spacing:3px;color:var(--void);flex-shrink:0}
    .void-bubble{display:flex;gap:12px;align-items:flex-start;background:rgba(124,58,237,.07);border:1px solid rgba(124,58,237,.25);border-radius:var(--r);padding:14px;animation:bubbleIn .4s cubic-bezier(.34,1.3,.64,1)}
    @keyframes bubbleIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    .void-loading{border-color:rgba(124,58,237,.15)}
    .void-error{border-color:rgba(255,59,31,.2);background:rgba(255,59,31,.04)}
    .void-avatar{font-size:24px;flex-shrink:0;filter:drop-shadow(0 0 6px rgba(124,58,237,.5))}
    .void-body{flex:1;display:flex;flex-direction:column;gap:6px}
    .void-name{font-family:var(--display);font-size:11px;letter-spacing:3px;color:var(--void)}
    .void-text{font-size:14px;color:var(--text);line-height:1.7;font-weight:300}
    .void-typing{display:flex;align-items:center;gap:5px;height:20px}
    .typing-dot{width:7px;height:7px;border-radius:50%;background:var(--void);animation:typingPulse 1.2s ease infinite;animation-delay:var(--d)}
    @keyframes typingPulse{0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
    .vs-done-btn{background:var(--accent);border:none;color:#fff;font-family:var(--display);font-size:18px;letter-spacing:2px;padding:14px;border-radius:var(--r);cursor:pointer;transition:all .15s;width:100%}
    .vs-done-btn:hover{transform:scale(1.02)}
    .vs-done-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
    .vs-remaining{font-size:11px;color:var(--dim);text-align:center;letter-spacing:1px}

    .header{padding:16px 20px 0;position:sticky;top:0;z-index:10;background:linear-gradient(to bottom,var(--bg) 82%,transparent)}
    .header-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}
    .logo{font-family:var(--display);font-size:46px;line-height:1;letter-spacing:3px;background:linear-gradient(135deg,var(--accent),var(--orange));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .logo-sub{font-size:9px;color:var(--dim);letter-spacing:3px;text-transform:uppercase}
    .header-streak{background:rgba(255,59,31,.1);border:1px solid rgba(255,59,31,.25);border-radius:20px;padding:5px 13px;font-family:var(--display);font-size:16px;color:var(--accent);letter-spacing:1px}
    .coin-badge{display:flex;align-items:center;gap:5px;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.25);border-radius:20px;padding:5px 12px}
    .coin-amount{font-family:var(--display);font-size:16px;color:var(--gold);letter-spacing:1px}

    .filter-bar{display:flex;gap:6px;overflow-x:auto;padding-bottom:13px;scrollbar-width:none}
    .filter-bar::-webkit-scrollbar{display:none}
    .fbtn{flex-shrink:0;background:var(--s2);border:1px solid var(--bd);color:var(--muted);font-family:var(--display);font-size:11px;letter-spacing:1.5px;padding:6px 11px;border-radius:2px;cursor:pointer;transition:all .15s}
    .fbtn:hover{border-color:var(--accent);color:var(--text)}
    .fbtn-on{background:var(--accent);border-color:var(--accent);color:#fff}

    .main-content{flex:1;overflow-y:auto;padding-bottom:78px}
    .feed{padding:8px 16px;display:flex;flex-direction:column;gap:10px}
    .screen-pad{padding:12px 16px;display:flex;flex-direction:column;gap:10px}

    /* DAILY PROMPT */
    .daily-prompt{background:linear-gradient(135deg,rgba(255,59,31,.08),rgba(255,140,0,.05));border:1px solid rgba(255,59,31,.25);border-radius:var(--r);padding:16px;margin-bottom:4px}
    .daily-flip{background:linear-gradient(135deg,rgba(99,102,241,.08),rgba(124,58,237,.05));border-color:rgba(99,102,241,.3)}
    .dp-header{display:flex;align-items:center;gap:10px;margin-bottom:10px}
    .dp-icon{font-size:24px}
    .dp-title{font-family:var(--display);font-size:13px;letter-spacing:2px;color:var(--accent)}
    .daily-flip .dp-title{color:var(--indigo)}
    .dp-sub{font-size:10px;color:var(--dim);letter-spacing:1px;margin-top:2px}
    .dp-prompt{font-size:14px;color:var(--text);line-height:1.5;font-style:italic;margin-bottom:12px}
    .dp-btn{background:var(--accent);border:none;color:#fff;font-family:var(--display);font-size:13px;letter-spacing:1.5px;padding:9px 16px;border-radius:2px;cursor:pointer;transition:all .15s}
    .daily-flip .dp-btn{background:var(--indigo)}
    .dp-btn:hover{transform:scale(1.03)}

    /* RANT OF THE DAY */
    .rotd{background:linear-gradient(135deg,rgba(201,168,76,.08),rgba(255,140,0,.05));border:1px solid rgba(201,168,76,.3);border-radius:var(--r);padding:16px;margin-bottom:4px}
    .rotd-header{display:flex;align-items:center;gap:10px;margin-bottom:12px}
    .rotd-crown{font-size:28px}
    .rotd-title{font-family:var(--display);font-size:14px;letter-spacing:2px;color:var(--gold)}
    .rotd-sub{font-size:10px;color:var(--dim);letter-spacing:1px;margin-top:2px}
    .rotd-card{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:14px}
    .rotd-text{font-size:14px;color:var(--text);line-height:1.6;font-style:italic}
    .rotd-heat{font-family:var(--display);font-size:16px;color:var(--orange);letter-spacing:1px}

    /* CARDS */
    .card{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:15px;transition:border-color .2s,transform .2s;position:relative;overflow:visible}
    .card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--accent);opacity:0;transition:opacity .2s;border-radius:2px 0 0 2px}
    .card:hover{border-color:#2e2e2e;transform:translateX(2px)}
    .card:hover::before{opacity:1}
    .card-boosted{border-color:rgba(255,140,0,.3);background:linear-gradient(160deg,var(--card),#150e00)}
    .card-boosted::before{background:var(--orange);opacity:1}
    .card-reply{margin-left:10px;border-left:2px solid var(--bd);border-radius:0 var(--r) var(--r) 0;background:var(--s2)}
    .boost-ribbon{position:absolute;top:8px;right:-1px;background:var(--orange);color:#000;font-family:var(--display);font-size:9px;letter-spacing:1.5px;padding:2px 8px 2px 7px;border-radius:2px 0 0 2px}
    .card-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;position:relative}
    .card-cat{font-family:var(--display);font-size:11px;letter-spacing:2px;color:var(--accent)}
    .card-time{font-size:9px;color:var(--dim);letter-spacing:1px;text-transform:uppercase}
    .card-text{font-size:14px;line-height:1.65;color:var(--text);font-weight:300;margin-bottom:13px}
    .card-footer{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:8px}
    .total-reactions{font-size:10px;color:var(--dim);letter-spacing:1px;margin-left:auto}
    .menu-btn{background:none;border:none;color:var(--muted);font-size:15px;cursor:pointer;padding:0 3px;letter-spacing:2px;line-height:1;transition:color .15s}
    .menu-btn:hover{color:var(--text)}
    .card-menu{position:absolute;right:0;top:24px;background:var(--s3);border:1px solid var(--bd);border-radius:var(--r);z-index:20;overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,.7);min-width:130px}
    .card-menu button{display:block;width:100%;background:none;border:none;color:var(--text);font-family:var(--body);font-size:13px;padding:10px 15px;cursor:pointer;text-align:left;transition:background .15s;white-space:nowrap}
    .card-menu button:hover{background:var(--bd)}
    .bdg{font-family:var(--display);font-size:9px;letter-spacing:1.5px;padding:2px 6px;border-radius:2px}
    .bdg-voice{color:var(--orange);background:rgba(255,140,0,.1);border:1px solid rgba(255,140,0,.25)}
    .bdg-pass{color:var(--gold);background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3)}
    .bdg-prompt{color:var(--indigo);background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.25)}
    .reply-chain{display:flex;flex-direction:column;gap:8px;margin-top:8px}
    .show-replies-btn{background:none;border:none;color:var(--muted);font-size:11px;cursor:pointer;padding:6px 0 0;letter-spacing:1px;transition:color .15s;text-align:left}
    .show-replies-btn:hover{color:var(--text)}
    .replying-to{background:var(--s2);border-left:2px solid var(--accent);padding:8px 12px;border-radius:0 var(--r) var(--r) 0;margin-bottom:13px}
    .prompt-pill{background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.25);border-radius:20px;padding:6px 14px;font-size:12px;color:var(--indigo);margin-bottom:14px;font-style:italic}

    /* REACTIONS */
    .reaction-bar{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px}
    .reaction-btn{display:flex;align-items:center;gap:5px;background:var(--s2);border:1px solid var(--bd);color:var(--muted);font-size:14px;padding:5px 10px;border-radius:20px;cursor:pointer;transition:all .15s}
    .reaction-btn:hover{border-color:var(--muted);color:var(--text)}
    .reaction-on{font-weight:500}
    .reaction-count{font-family:var(--display);font-size:12px;letter-spacing:1px}

    /* VOID ON CARD */
    .card-validation{margin:0 0 12px;border-top:1px solid var(--bd);padding-top:10px}
    .void-toggle{display:flex;align-items:center;gap:7px;background:none;border:none;color:var(--muted);font-family:var(--display);font-size:10px;letter-spacing:2px;cursor:pointer;padding:0;transition:color .15s;width:100%}
    .void-toggle:hover{color:var(--void)}
    .void-eye{font-size:14px;filter:drop-shadow(0 0 4px rgba(124,58,237,.4))}
    .void-arrow{margin-left:auto;font-size:9px}
    .void-inline{margin-top:8px;padding:10px 12px;background:rgba(124,58,237,.06);border:1px solid rgba(124,58,237,.2);border-radius:var(--r)}
    .void-inline-text{font-size:13px;color:var(--text);line-height:1.65;font-weight:300;font-style:italic}

    /* BUTTONS */
    .reply-btn{display:flex;align-items:center;gap:6px;background:var(--s2);border:1px solid var(--bd);color:var(--muted);font-family:var(--display);font-size:11px;letter-spacing:1.5px;padding:6px 11px;border-radius:2px;cursor:pointer;transition:all .15s}
    .reply-btn:hover{border-color:var(--accent);color:var(--accent)}
    .icon-btn{background:var(--s2);border:1px solid var(--bd);color:var(--muted);font-size:13px;width:30px;height:30px;border-radius:2px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
    .icon-btn:hover{color:var(--text)}
    .boost-icon-btn{color:var(--orange);border-color:rgba(255,140,0,.3);background:rgba(255,140,0,.06)}
    .post-btn{background:var(--accent);border:none;color:#fff;font-family:var(--display);font-size:16px;letter-spacing:2px;padding:11px 24px;border-radius:var(--r);cursor:pointer;transition:all .15s}
    .post-btn:hover{transform:scale(1.03)}
    .post-btn:disabled{opacity:.35;cursor:not-allowed;transform:none}
    .ghost-btn{background:var(--s2);border:1px solid var(--bd);color:var(--muted);font-family:var(--display);font-size:14px;letter-spacing:1.5px;padding:10px 18px;border-radius:var(--r);cursor:pointer;transition:all .15s}
    .ghost-btn:hover{color:var(--text)}
    .ghost-btn-sm{background:none;border:1px solid var(--bd);color:var(--muted);font-family:var(--display);font-size:11px;letter-spacing:2px;padding:4px 10px;border-radius:2px;cursor:pointer;transition:all .15s}
    .ghost-btn-sm:hover{border-color:var(--accent);color:var(--accent)}
    .stop-btn{background:var(--s2);border:1px solid var(--bd);color:var(--text);font-family:var(--display);font-size:14px;letter-spacing:2px;padding:10px 24px;border-radius:var(--r);cursor:pointer;transition:all .15s}
    .stop-btn:hover{border-color:var(--accent)}

    .vp{display:flex;align-items:center;gap:10px;background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:10px 12px;margin-bottom:12px}
    .vp-play{background:var(--accent);border:none;color:#fff;width:33px;height:33px;border-radius:50%;font-size:12px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:transform .1s}
    .vp-play:hover{transform:scale(1.1)}
    .vp-bars{flex:1;display:flex;align-items:center;gap:2px;height:36px}
    .vp-bar{flex:1;background:var(--bd);border-radius:1px;min-width:2px;transition:background .08s}
    .vp-bar.f{background:var(--accent)}
    .vp-bar.a{background:var(--orange);animation:barpulse .3s ease infinite alternate}
    @keyframes barpulse{from{transform:scaleY(1)}to{transform:scaleY(1.3)}}
    .vp-dur{font-family:var(--display);font-size:12px;color:var(--muted);flex-shrink:0;min-width:32px;text-align:right}

    .vr-wrap{min-height:180px;display:flex;align-items:center;justify-content:center;width:100%}
    .vr-idle{display:flex;flex-direction:column;align-items:center;gap:12px;padding:12px 0}
    .mic-ring{width:90px;height:90px;border-radius:50%;background:rgba(255,59,31,.1);border:2px solid rgba(255,59,31,.28);display:flex;align-items:center;justify-content:center;font-size:36px;cursor:pointer;transition:all .2s;position:relative}
    .mic-ring::before{content:'';position:absolute;inset:-8px;border-radius:50%;border:1px solid rgba(255,59,31,.14);animation:ripple 2s ease-out infinite}
    .mic-ring::after{content:'';position:absolute;inset:-18px;border-radius:50%;border:1px solid rgba(255,59,31,.06);animation:ripple 2s ease-out infinite .5s}
    .mic-ring:hover{background:rgba(255,59,31,.2);border-color:var(--accent);transform:scale(1.05)}
    @keyframes ripple{0%{transform:scale(1);opacity:1}100%{transform:scale(1.35);opacity:0}}
    .vr-hint{font-family:var(--display);font-size:16px;letter-spacing:2px;color:var(--muted)}
    .vr-sub{font-size:10px;color:var(--dim);letter-spacing:2px;text-transform:uppercase}
    .vr-rec{width:100%;display:flex;flex-direction:column;align-items:center;gap:13px;padding:8px 0}
    .rec-row{display:flex;align-items:center;gap:10px}
    .rec-dot{width:9px;height:9px;border-radius:50%;background:var(--accent);animation:blink 1s ease infinite}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:.1}}
    .rec-lbl{font-family:var(--display);font-size:12px;letter-spacing:3px;color:var(--accent)}
    .rec-time{font-family:var(--display);font-size:24px;color:var(--text);letter-spacing:2px;min-width:50px;text-align:right}
    .limit-bar{width:180px;height:3px;background:var(--bd);border-radius:2px;overflow:hidden}
    .limit-fill{height:100%;border-radius:2px;transition:width 1s linear,background .3s}
    .vr-preview{width:100%;display:flex;flex-direction:column;align-items:center;gap:13px;padding:8px 0}
    .preview-lbl{font-family:var(--display);font-size:11px;letter-spacing:3px;color:var(--muted)}
    .upsell-strip{width:100%;margin-top:11px;background:rgba(201,168,76,.07);border:1px solid rgba(201,168,76,.22);border-radius:var(--r);color:var(--gold);font-family:var(--display);font-size:11px;letter-spacing:1px;padding:10px;cursor:pointer;transition:all .15s}
    .upsell-strip:hover{background:rgba(201,168,76,.14)}

    .bottom-nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:var(--sf);border-top:1px solid var(--bd);display:flex;align-items:center;z-index:20;padding:0 8px 4px}
    .nav-btn{flex:1;background:none;border:none;color:var(--muted);cursor:pointer;padding:9px 4px 5px;display:flex;flex-direction:column;align-items:center;gap:3px;transition:color .15s}
    .nav-btn.nav-on{color:var(--accent)}
    .nav-icon-wrap{font-size:20px;position:relative;display:inline-block}
    .nav-lbl{font-family:var(--display);font-size:8px;letter-spacing:1.5px}
    .nav-compose{background:var(--accent);border:none;color:#fff;width:46px;height:46px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;margin:0 8px;flex-shrink:0;transition:transform .15s;box-shadow:0 0 22px rgba(255,59,31,.38)}
    .nav-compose:hover{transform:scale(1.08)}
    .notif-dot{position:absolute;top:-4px;right:-6px;background:var(--accent);color:#fff;font-size:7px;font-family:var(--display);min-width:15px;height:15px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 3px;line-height:1}

    .overlay{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;background:rgba(0,0,0,.88);backdrop-filter:blur(6px);animation:fadeIn .2s ease}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    .bottom-sheet{background:var(--sf);border-top:1px solid var(--bd);border-radius:14px 14px 0 0;padding:20px 20px 38px;animation:slideUp .3s cubic-bezier(.34,1.3,.64,1);max-height:92vh;overflow-y:auto;width:100%;max-width:480px;position:relative;display:flex;flex-direction:column;gap:0}
    @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
    /* PREMIUM COMPOSE SHEET */
    .compose-overlay{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;background:rgba(0,0,0,.85);backdrop-filter:blur(12px);animation:fadeIn .2s ease}
    .compose-sheet{background:linear-gradient(180deg,#141414 0%,#0f0f0f 100%);border-top:1px solid rgba(255,255,255,.08);border-radius:20px 20px 0 0;padding:0 0 40px;animation:slideUp .35s cubic-bezier(.34,1.2,.64,1);width:100%;max-width:480px;position:relative;display:flex;flex-direction:column;max-height:92vh;overflow-y:auto}
    .compose-handle{width:40px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;margin:14px auto 0;flex-shrink:0}
    .compose-hdr{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;flex-shrink:0}
    .compose-hdr-left{display:flex;flex-direction:column;gap:4px}
    .compose-title-wrap{display:flex;align-items:center;gap:10px}
    .compose-title{font-family:var(--display);font-size:24px;letter-spacing:2px;background:linear-gradient(135deg,#fff,rgba(255,255,255,.7));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .compose-active-cat{font-family:var(--display);font-size:11px;letter-spacing:2px;color:var(--accent);background:rgba(255,59,31,.1);border:1px solid rgba(255,59,31,.2);padding:3px 8px;border-radius:20px}
    .compose-replying{display:flex;align-items:center;gap:6px}
    .compose-replying-icon{color:var(--accent);font-size:14px}
    .compose-replying-txt{font-size:12px;color:var(--muted);font-style:italic}
    .compose-close{background:rgba(255,255,255,.08);border:none;color:rgba(255,255,255,.5);width:30px;height:30px;border-radius:50%;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0}
    .compose-close:hover{background:rgba(255,59,31,.2);color:var(--accent)}
    .compose-prompt-pill{display:flex;align-items:center;gap:8px;margin:0 20px 12px;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.2);border-radius:10px;padding:10px 14px;font-size:13px;color:rgba(99,102,241,.9);font-style:italic}
    .compose-mode-toggle{display:flex;gap:8px;padding:0 20px 16px;flex-shrink:0}
    .cmt-btn{flex:1;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.4);border-radius:12px;padding:12px 8px;cursor:pointer;transition:all .2s;display:flex;flex-direction:column;align-items:center;gap:5px;position:relative}
    .cmt-btn:hover{background:rgba(255,255,255,.08);color:rgba(255,255,255,.6)}
    .cmt-on{background:rgba(255,59,31,.12)!important;border-color:rgba(255,59,31,.4)!important;color:var(--accent)!important}
    .cmt-voice.cmt-on{background:rgba(255,140,0,.1)!important;border-color:rgba(255,140,0,.35)!important;color:var(--orange)!important}
    .cmt-icon{font-size:20px}
    .cmt-lbl{font-family:var(--display);font-size:11px;letter-spacing:2px}
    .cmt-badge{position:absolute;top:-6px;right:-6px;background:var(--orange);color:#000;font-family:var(--display);font-size:7px;letter-spacing:1px;padding:2px 5px;border-radius:8px;white-space:nowrap}
    .compose-cats{display:flex;gap:6px;padding:0 20px 14px;flex-wrap:wrap;flex-shrink:0}
    .cc-btn{display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:20px;padding:6px 12px;cursor:pointer;transition:all .2s;flex-shrink:0}
    .cc-btn:hover{background:rgba(255,255,255,.08)}
    .cc-on{background:rgba(255,59,31,.12)!important;border-color:rgba(255,59,31,.35)!important}
    .cc-emoji{font-size:13px}
    .cc-label{font-family:var(--display);font-size:10px;letter-spacing:1.5px;color:rgba(255,255,255,.5)}
    .cc-on .cc-label{color:var(--accent)}
    .compose-ai-cat{font-size:11px;color:var(--void);margin:-4px 20px 12px;letter-spacing:.5px}
    .compose-ai-cat strong{color:var(--text)}
    .compose-text-area{display:flex;flex-direction:column;padding:0 20px;flex:1}
    .compose-textarea{width:100%;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;color:var(--text);font-family:var(--body);font-size:16px;font-weight:300;line-height:1.7;padding:16px;resize:none;min-height:130px;outline:none;transition:border-color .2s;margin-bottom:12px}
    .compose-textarea::placeholder{color:rgba(255,255,255,.2);font-style:italic}
    .compose-textarea:focus{border-color:rgba(255,59,31,.3);background:rgba(255,59,31,.03)}
    .compose-heat-score{display:flex;align-items:center;gap:10px;background:rgba(255,140,0,.07);border:1px solid rgba(255,140,0,.2);border-radius:10px;padding:10px 14px;margin-bottom:12px;animation:bubbleIn .3s ease}
    .compose-heat-text{font-size:13px;color:var(--orange);font-weight:400;line-height:1.4}
    .compose-footer-bar{display:flex;justify-content:space-between;align-items:center;padding-bottom:4px}
    .compose-char-wrap{position:relative;display:flex;align-items:center;justify-content:center;width:28px;height:28px}
    .compose-char-num{position:absolute;font-family:var(--display);font-size:9px;letter-spacing:0}
    .compose-predict-btn{background:rgba(255,140,0,.08);border:1px solid rgba(255,140,0,.2);color:var(--orange);font-family:var(--display);font-size:11px;letter-spacing:1.5px;padding:8px 14px;border-radius:8px;cursor:pointer;transition:all .15s}
    .compose-predict-btn:hover{background:rgba(255,140,0,.15)}
    .compose-predict-btn:disabled{opacity:.4;cursor:not-allowed}
    .compose-release-btn{display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,var(--accent),#ff6b3d);border:none;color:#fff;font-family:var(--display);font-size:16px;letter-spacing:2px;padding:12px 24px;border-radius:12px;cursor:pointer;transition:all .2s;box-shadow:0 4px 20px rgba(255,59,31,.3)}
    .compose-release-btn:hover{transform:scale(1.03);box-shadow:0 6px 28px rgba(255,59,31,.45)}
    .compose-release-btn:disabled{opacity:.35;cursor:not-allowed;transform:none;box-shadow:none}
    .compose-release-arrow{font-size:16px;transition:transform .15s}
    .compose-release-btn:hover .compose-release-arrow{transform:translateX(3px)}
    .compose-voice-area{padding:0 20px;display:flex;flex-direction:column;gap:12px}
    .compose-pass-strip{width:100%;background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.18);border-radius:10px;color:rgba(201,168,76,.8);font-family:var(--display);font-size:11px;letter-spacing:1px;padding:12px 16px;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:space-between;gap:8px}
    .compose-pass-strip:hover{background:rgba(201,168,76,.1)}
    .x-btn{position:absolute;top:16px;right:16px;background:var(--s2);border:1px solid var(--bd);color:var(--muted);width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;z-index:1}
    .x-btn:hover{border-color:var(--accent);color:var(--text)}
    .x-btn-inline{background:var(--s2);border:1px solid var(--bd);color:var(--muted);width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0}
    .x-btn-inline:hover{border-color:var(--accent);color:var(--text)}
    .sheet-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px}
    .sheet-title{font-family:var(--display);font-size:22px;letter-spacing:2px}
    .sheet-label{font-family:var(--display);font-size:13px;letter-spacing:3px;color:var(--muted);text-align:center;margin-bottom:14px}
    .mode-sw{display:flex;background:var(--s2);border:1px solid var(--bd);border-radius:3px;padding:3px;margin-bottom:14px;gap:3px}
    .mode-btn{flex:1;background:transparent;border:none;color:var(--muted);font-family:var(--display);font-size:12px;letter-spacing:1.5px;padding:8px;border-radius:2px;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:5px}
    .mode-btn.m-on{background:var(--accent);color:#fff}
    .cat-picker{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:14px}
    .cat-btn{background:var(--s2);border:1px solid var(--bd);color:var(--muted);font-family:var(--display);font-size:10px;letter-spacing:1.5px;padding:5px 10px;border-radius:2px;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:4px}
    .cat-btn.cat-on{background:rgba(255,59,31,.14);border-color:var(--accent);color:var(--accent)}
    .rant-input{width:100%;background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);color:var(--text);font-family:var(--body);font-size:14px;font-weight:300;line-height:1.65;padding:13px;resize:none;min-height:115px;outline:none;transition:border-color .2s;margin-bottom:11px}
    .rant-input::placeholder{color:var(--dim);font-style:italic}
    .rant-input:focus{border-color:var(--accent)}
    .compose-footer{display:flex;justify-content:space-between;align-items:center}
    .char-count{font-family:var(--display);font-size:16px;color:var(--muted)}
    .char-count.warn{color:var(--orange)}
    .char-count.over{color:var(--accent)}

    .share-preview{background:linear-gradient(135deg,#0e0e0e,#180800);border:1px solid rgba(255,59,31,.25);border-radius:8px;padding:20px;margin-bottom:16px}
    .sc-logo{font-family:var(--display);font-size:26px;letter-spacing:4px;background:linear-gradient(135deg,var(--accent),var(--orange));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:7px}
    .sc-cat{font-family:var(--display);font-size:10px;letter-spacing:2px;color:var(--accent);margin-bottom:11px}
    .sc-text{font-size:14px;color:var(--text);line-height:1.6;font-weight:300;margin-bottom:14px;font-style:italic}
    .sc-foot{font-size:9px;color:var(--dim);letter-spacing:2px;text-transform:uppercase}
    .share-action-btn{flex:1;background:var(--s2);border:1px solid var(--bd);color:var(--text);font-family:var(--display);font-size:13px;letter-spacing:1.5px;padding:11px;border-radius:var(--r);cursor:pointer;transition:all .15s}
    .share-action-btn:hover{border-color:var(--accent)}

    .report-title{font-family:var(--display);font-size:21px;letter-spacing:2px;margin-bottom:16px}
    .report-reasons{display:flex;flex-direction:column;gap:7px;margin-bottom:18px}
    .reason-btn{background:var(--s2);border:1px solid var(--bd);color:var(--muted);font-family:var(--body);font-size:13px;padding:11px 13px;border-radius:var(--r);cursor:pointer;text-align:left;transition:all .15s}
    .reason-btn.reason-on{border-color:var(--accent);color:var(--text);background:rgba(255,59,31,.07)}

    .boost-title{font-family:var(--display);font-size:24px;letter-spacing:3px;color:var(--orange)}
    .boost-sub{font-size:12px;color:var(--muted);line-height:1.6;max-width:270px}

    .pass-sheet{gap:0}
    .pass-hdr{text-align:center;margin-bottom:20px;padding-top:4px}
    .pass-crown{font-size:28px;color:var(--gold);display:block;margin-bottom:7px}
    .pass-title{font-family:var(--display);font-size:32px;letter-spacing:4px;background:linear-gradient(135deg,var(--gold),#f0d080);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .pass-sub-txt{font-size:11px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-top:3px}
    .pass-perks{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}
    .perk-row{display:flex;align-items:center;gap:11px}
    .perk-icon{font-size:18px;flex-shrink:0;width:28px;text-align:center}
    .perk-text{font-size:13px;color:var(--text);line-height:1.4}
    .pass-plans{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
    .plan-btn{background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:12px 14px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;transition:all .15s;text-align:left;gap:10px}
    .plan-btn.plan-on{border-color:var(--gold);background:rgba(201,168,76,.07)}
    .plan-radio{width:16px;height:16px;border-radius:50%;border:2px solid var(--bd);flex-shrink:0;transition:all .15s}
    .plan-radio.pr-on{border-color:var(--gold);background:var(--gold)}
    .plan-lbl{font-family:var(--display);font-size:14px;letter-spacing:2px;color:var(--text)}
    .plan-badge{background:var(--gold);color:#000;font-family:var(--display);font-size:8px;letter-spacing:1px;padding:2px 6px;border-radius:2px}
    .plan-price{font-family:var(--display);font-size:20px;color:var(--gold);flex-shrink:0}
    .plan-period{font-size:11px;color:var(--muted)}
    .pass-cta{width:100%;background:linear-gradient(135deg,var(--gold),#e0b840);border:none;color:#000;font-family:var(--display);font-size:18px;letter-spacing:2px;padding:14px;border-radius:var(--r);cursor:pointer;transition:all .15s}
    .pass-cta:hover{transform:scale(1.02)}
    .pass-cta:disabled{opacity:.6;cursor:not-allowed;transform:none}
    .spinner{animation:spin .8s linear infinite;display:inline-block}
    @keyframes spin{to{transform:rotate(360deg)}}
    .pass-legal{font-size:10px;color:var(--dim);text-align:center;margin-top:10px}
    .pass-success{display:flex;flex-direction:column;align-items:center;gap:12px;padding:36px 0}
    .ps-icon{font-size:48px;color:var(--gold);animation:popIn .4s cubic-bezier(.34,1.56,.64,1)}
    .ps-title{font-family:var(--display);font-size:24px;letter-spacing:3px;color:var(--gold)}
    .ps-sub{font-size:11px;color:var(--muted);letter-spacing:2px;text-transform:uppercase}
    @keyframes popIn{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:scale(1)}}

    .trend-rank{font-family:var(--display);font-size:10px;letter-spacing:2px;color:var(--dim);margin-bottom:4px;padding-left:2px}
    .cat-heat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px}
    .cat-heat-card{background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:13px;display:flex;flex-direction:column;gap:4px}
    .cat-heat-lbl{font-family:var(--display);font-size:13px;letter-spacing:2px;color:var(--text)}
    .cat-heat-val{font-size:12px;color:var(--muted)}

    .notif-row{display:flex;align-items:flex-start;gap:11px;padding:13px;background:var(--s2);border:1px solid var(--bd);border-radius:var(--r)}
    .notif-row.notif-unread{border-color:rgba(255,59,31,.28);background:rgba(255,59,31,.035)}
    .notif-msg{font-size:13px;color:var(--text);line-height:1.4}
    .notif-time{font-size:10px;color:var(--dim);margin-top:3px;letter-spacing:1px}

    .profile-header{display:flex;align-items:center;gap:13px;margin-bottom:18px}
    .profile-avatar{width:56px;height:56px;border-radius:50%;background:var(--s2);border:1px solid var(--bd);display:flex;align-items:center;justify-content:center;font-family:var(--display);font-size:20px;letter-spacing:1px;flex-shrink:0}
    .profile-name{font-family:var(--display);font-size:20px;letter-spacing:2px}
    .profile-joined{font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-top:3px}
    .bdg-pass-lg{font-family:var(--display);font-size:9px;letter-spacing:2px;color:var(--gold);background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);padding:2px 8px;border-radius:2px}
    .streak-badge{display:flex;align-items:center;gap:10px;background:rgba(255,59,31,.07);border:1px solid rgba(255,59,31,.22);border-radius:var(--r);padding:10px 13px;margin-bottom:13px}
    .streak-num{font-family:var(--display);font-size:26px;color:var(--accent)}
    .streak-lbl{font-family:var(--display);font-size:13px;letter-spacing:2px;color:var(--accent)}
    .streak-next{font-size:10px;color:var(--muted);margin-left:auto;letter-spacing:1px}
    .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:16px}
    .stat-box{background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:12px 7px;text-align:center}
    .stat-val{font-family:var(--display);font-size:22px;display:block;color:var(--text)}
    .stat-lbl{font-family:var(--display);font-size:8px;letter-spacing:2px;color:var(--muted);margin-top:2px;display:block}
    .pass-upsell-card{width:100%;background:rgba(201,168,76,.05);border:1px solid rgba(201,168,76,.22);border-radius:var(--r);padding:13px;display:flex;align-items:center;gap:11px;cursor:pointer;transition:all .2s;margin-bottom:16px;text-align:left}
    .pass-upsell-card:hover{background:rgba(201,168,76,.11)}
    .upsell-title{font-family:var(--display);font-size:14px;letter-spacing:2px;color:var(--gold)}
    .upsell-sub{font-size:10px;color:var(--muted);margin-top:2px;line-height:1.4}
    .pass-active-card{background:rgba(201,168,76,.05);border:1px solid rgba(201,168,76,.22);border-radius:var(--r);padding:12px 14px;display:flex;align-items:center;gap:11px;margin-bottom:16px}
    .coin-info{background:rgba(201,168,76,.05);border:1px solid rgba(201,168,76,.15);border-radius:var(--r);padding:14px;margin-bottom:16px}
    .coin-info-title{font-family:var(--display);font-size:14px;letter-spacing:2px;color:var(--gold);margin-bottom:6px}
    .coin-info-sub{font-size:12px;color:var(--muted);line-height:1.5}
    .section-title{font-family:var(--display);font-size:12px;letter-spacing:3px;color:var(--muted);margin-bottom:8px}
    .section-sub{font-size:10px;color:var(--dim);letter-spacing:1px;margin-top:-4px;margin-bottom:8px}
    .my-rant-row{background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:11px;margin-bottom:7px}
    .logout-btn{width:100%;background:transparent;border:1px solid var(--bd);color:var(--muted);font-family:var(--display);font-size:12px;letter-spacing:2px;padding:11px;border-radius:var(--r);cursor:pointer;margin-top:8px;transition:all .15s}
    .logout-btn:hover{border-color:var(--accent);color:var(--accent)}

    /* FOLLOW */
    .follow-btn{background:var(--s2);border:1px solid var(--accent);color:var(--accent);font-family:var(--display);font-size:11px;letter-spacing:1.5px;padding:5px 12px;border-radius:20px;cursor:pointer;transition:all .15s;white-space:nowrap}
    .follow-btn:hover{background:var(--accent);color:#fff}
    .follow-btn-on{background:rgba(255,59,31,.1);border-color:var(--muted);color:var(--muted)}
    .follow-btn-on:hover{background:rgba(255,59,31,.08);border-color:var(--accent);color:var(--accent)}
    .follow-btn-sm{font-size:9px;padding:3px 9px}
    .author-row{display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:6px 10px;background:var(--s2);border-radius:var(--r)}
    .author-avatar-sm{width:24px;height:24px;border-radius:50%;background:var(--bd);display:flex;align-items:center;justify-content:center;font-family:var(--display);font-size:9px;letter-spacing:1px;color:var(--muted);flex-shrink:0}
    .author-name{font-family:var(--display);font-size:11px;letter-spacing:1.5px;color:var(--muted);flex:1}

    /* SUGGESTED RANTERS */
    .suggested-card{background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:14px;margin-bottom:4px}
    .suggested-title{font-family:var(--display);font-size:11px;letter-spacing:2px;color:var(--muted);margin-bottom:12px}
    .suggested-list{display:flex;flex-direction:column;gap:10px}
    .suggested-row{display:flex;align-items:center;gap:10px}
    .suggested-avatar{width:36px;height:36px;border-radius:50%;background:var(--bd);display:flex;align-items:center;justify-content:center;font-family:var(--display);font-size:12px;letter-spacing:1px;color:var(--muted);flex-shrink:0}
    .suggested-info{flex:1}
    .suggested-username{font-family:var(--display);font-size:13px;letter-spacing:1.5px;color:var(--text)}
    .suggested-stats{font-size:10px;color:var(--dim);margin-top:2px}

    /* FOLLOWING FEED */
    .following-empty{display:flex;flex-direction:column;align-items:center;gap:12px;padding:50px 20px;text-align:center}
    .following-header{padding:8px 0 4px;margin-bottom:4px}
    .following-header-txt{font-family:var(--display);font-size:11px;letter-spacing:2px;color:var(--muted)}

    /* EXISTING STYLES BELOW */
    /* INLINE SEARCH */
    .search-icon-btn{background:var(--s2);border:1px solid var(--bd);color:var(--muted);width:34px;height:34px;border-radius:50%;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0}
    .search-icon-btn:hover{border-color:var(--accent);color:var(--text)}
    .inline-search{display:flex;flex-direction:column;height:100%}
    .isearch-input-wrap{display:flex;align-items:center;gap:10px;background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:12px 16px;margin:12px 16px 0;transition:border-color .2s}
    .isearch-input-wrap:focus-within{border-color:var(--accent)}
    .isearch-icon{font-size:16px;flex-shrink:0;opacity:.6}
    .isearch-input{flex:1;background:none;border:none;color:var(--text);font-family:var(--body);font-size:15px;outline:none}
    .isearch-input::placeholder{color:var(--dim);font-style:italic}
    .isearch-clear{background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer;padding:0;line-height:1;flex-shrink:0;transition:color .15s}
    .isearch-clear:hover{color:var(--accent)}
    .isearch-tabs{display:flex;gap:6px;padding:12px 16px 0}
    .isearch-tab{flex:1;background:var(--s2);border:1px solid var(--bd);color:var(--muted);font-family:var(--display);font-size:11px;letter-spacing:2px;padding:9px;border-radius:2px;cursor:pointer;transition:all .2s}
    .isearch-tab-on{background:var(--accent);border-color:var(--accent);color:#fff}
    .isearch-results{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:10px}
    .isearch-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:40px 0}
    .isearch-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:50px 20px;text-align:center}
    .isearch-empty-txt{font-family:var(--display);font-size:13px;letter-spacing:2px;color:var(--muted)}
    .isearch-hint{display:flex;flex-direction:column;align-items:center;gap:12px;padding:50px 20px;text-align:center}
    .isearch-hint-title{font-family:var(--display);font-size:14px;letter-spacing:2px;color:var(--muted)}
    .isearch-hint-sub{font-size:11px;color:var(--dim);letter-spacing:1px;line-height:1.6}
    .people-result{display:flex;align-items:center;gap:12px;background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:12px}
    .people-avatar{width:40px;height:40px;border-radius:50%;background:var(--bd);display:flex;align-items:center;justify-content:center;font-family:var(--display);font-size:13px;letter-spacing:1px;color:var(--muted);flex-shrink:0}
    .people-info{flex:1}
    .people-username{font-family:var(--display);font-size:14px;letter-spacing:2px;color:var(--text)}
    .people-meta{font-size:10px;color:var(--dim);margin-top:3px;letter-spacing:1px}

    .empty-state{display:flex;flex-direction:column;align-items:center;gap:12px;padding:60px 20px;text-align:center}
    .empty-txt{font-family:var(--display);font-size:16px;letter-spacing:2px;color:var(--muted)}

    /* AI TRENDING INSIGHT */
    .insight-banner{background:rgba(124,58,237,.07);border:1px solid rgba(124,58,237,.25);border-radius:var(--r);padding:14px;margin-bottom:14px}
    .insight-header{display:flex;align-items:center;gap:10px;margin-bottom:10px}
    .insight-eye{font-size:22px;filter:drop-shadow(0 0 6px rgba(124,58,237,.5))}
    .insight-title{font-family:var(--display);font-size:12px;letter-spacing:3px;color:var(--void)}
    .insight-sub{font-size:10px;color:var(--dim);letter-spacing:1px;margin-top:2px}
    .insight-text{font-size:13px;color:var(--text);line-height:1.65;font-style:italic;font-weight:300}

    /* THREAD SUMMARISER */
    .thread-summariser{margin-top:8px;padding-top:8px;border-top:1px solid var(--bd)}
    .summarise-btn{background:none;border:1px solid rgba(124,58,237,.3);color:var(--void);font-family:var(--display);font-size:10px;letter-spacing:2px;padding:6px 12px;border-radius:2px;cursor:pointer;transition:all .15s}
    .summarise-btn:hover{background:rgba(124,58,237,.08)}
    .summary-result{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;background:rgba(124,58,237,.06);border:1px solid rgba(124,58,237,.2);border-radius:var(--r)}
    .summary-text{font-size:12px;color:var(--text);line-height:1.5;font-style:italic;font-weight:300}

    /* HEAT PREDICTOR */
    .heat-score{display:flex;align-items:center;gap:8px;background:rgba(255,140,0,.07);border:1px solid rgba(255,140,0,.25);border-radius:var(--r);padding:10px 12px;margin-bottom:10px;animation:bubbleIn .3s ease}
    .heat-score-icon{font-size:18px}
    .heat-score-text{font-size:13px;color:var(--orange);font-weight:500}
    .predict-btn{background:var(--s2);border:1px solid var(--bd);color:var(--muted);font-family:var(--display);font-size:11px;letter-spacing:1.5px;padding:8px 14px;border-radius:2px;cursor:pointer;transition:all .15s}
    .predict-btn:hover{border-color:var(--orange);color:var(--orange)}
    .predict-btn:disabled{opacity:.5;cursor:not-allowed}

    /* AI CATEGORY HINT */
    .ai-cat-hint{font-size:11px;color:var(--void);margin-top:-8px;margin-bottom:10px;letter-spacing:.5px}
    .ai-cat-hint strong{color:var(--text)}

    /* WRAPPED AI */
    .wrapped-ai-card{background:rgba(124,58,237,.06);border:1px solid rgba(124,58,237,.2);border-radius:var(--r);padding:14px;margin-bottom:16px}
    .wrapped-ai-btn{width:100%;background:none;border:1px solid rgba(124,58,237,.3);color:var(--void);font-family:var(--display);font-size:12px;letter-spacing:2px;padding:11px;border-radius:2px;cursor:pointer;transition:all .15s}
    .wrapped-ai-btn:hover{background:rgba(124,58,237,.08)}
    .wrapped-ai-label{font-family:var(--display);font-size:10px;letter-spacing:3px;color:var(--void);margin-bottom:8px}
    .wrapped-ai-text{font-size:13px;color:var(--text);line-height:1.7;font-style:italic;font-weight:300}

    /* USER PROFILE SCREEN */
    .user-profile-screen{position:fixed;inset:0;z-index:80;background:var(--bg);display:flex;flex-direction:column;max-width:480px;margin:0 auto;overflow-y:auto}
    .up-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--bd);position:sticky;top:0;background:var(--bg);z-index:1;backdrop-filter:blur(10px)}
    .up-back{background:none;border:none;color:var(--accent);font-family:var(--display);font-size:13px;letter-spacing:1.5px;cursor:pointer;display:flex;align-items:center;gap:6px;padding:6px 0}
    .up-title{font-family:var(--display);font-size:15px;letter-spacing:2px;color:var(--muted)}
    .up-content{display:flex;flex-direction:column}
    .up-hero{display:flex;flex-direction:column;align-items:center;padding:32px 20px 24px;border-bottom:1px solid var(--bd);background:linear-gradient(180deg,rgba(255,59,31,.04) 0%,transparent 100%)}
    .up-hero-avatar{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--s2),var(--bd));border:2px solid var(--bd);display:flex;align-items:center;justify-content:center;font-family:var(--display);font-size:24px;letter-spacing:2px;color:var(--text);margin-bottom:12px}
    .up-hero-name{font-family:var(--display);font-size:22px;letter-spacing:3px;color:var(--text)}
    .up-pass-badge{font-family:var(--display);font-size:10px;letter-spacing:2px;color:var(--gold);background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);padding:3px 10px;border-radius:20px;margin-top:6px}
    .up-stats-row{display:flex;align-items:center;padding:16px 0;border-bottom:1px solid var(--bd)}
    .up-stat{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
    .up-stat-val{font-family:var(--display);font-size:22px;color:var(--text)}
    .up-stat-lbl{font-family:var(--display);font-size:9px;letter-spacing:2px;color:var(--muted)}
    .up-stat-divider{width:1px;height:30px;background:var(--bd)}

    ::-webkit-scrollbar{width:3px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:var(--bd);border-radius:2px}
`;
export default STYLES;
