import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://tgzfokaztzwracldnhae.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnemZva2F6dHp3cmFjbGRuaGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNzY1NDMsImV4cCI6MjA5NDc1MjU0M30.lf2nZ4PmSXR4KsOi8EtAoH3G7Fby3qhdIKrW-OHt1eg";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATS = [
  { id:"all",     label:"ALL",     emoji:"🌐" },
  { id:"work",    label:"WORK",    emoji:"💼" },
  { id:"people",  label:"PEOPLE",  emoji:"🙄" },
  { id:"life",    label:"LIFE",    emoji:"🌀" },
  { id:"tech",    label:"TECH",    emoji:"💻" },
  { id:"traffic", label:"TRAFFIC", emoji:"🚗" },
  { id:"other",   label:"OTHER",   emoji:"🔥" },
];
const NON_ALL_CATS = CATS.slice(1);

const TABS = [
  { id:"feed",          icon:"🔥", label:"FEED"      },
  { id:"following",     icon:"👥", label:"FOLLOWING"  },
  { id:"trending",      icon:"📈", label:"HOT"        },
  { id:"notifications", icon:"🔔", label:"ALERTS"    },
  { id:"profile",       icon:"👤", label:"ME"         },
];

const REACTIONS = [
  { id:"heat",   emoji:"🔥", label:"FELT THIS",  color:"#ff8c00" },
  { id:"same",   emoji:"😭", label:"SAME",        color:"#6366f1" },
  { id:"brutal", emoji:"💀", label:"BRUTAL",      color:"#ef4444" },
  { id:"legend", emoji:"👑", label:"LEGEND",      color:"#c9a84c" },
];

const DAILY_PROMPTS = [
  "what nearly broke you this week?",
  "what's the one thing that always gets you?",
  "who had the audacity today?",
  "what should have been an email?",
  "what rule exists that makes zero sense?",
  "what small thing ruined your day?",
  "who let you down recently?",
  "what did someone say that still has you fuming?",
  "what's the most overrated thing in your life right now?",
  "what would you fix first if you ran the world?",
  "what noise should be illegal?",
  "who gets paid too much for too little?",
];

const PASS_PERKS = [
  { icon:"🎙", text:"Voice rants up to 5 minutes" },
  { icon:"⚡", text:"Unlimited Boosts" },
  { icon:"🪙", text:"100 Rant Coins per month" },
  { icon:"🔒", text:"Private rant mode" },
  { icon:"📊", text:"Full Stats & Rant Wrapped" },
  { icon:"✦",  text:"Verified Ranter badge" },
  { icon:"🤖", text:"Unlimited AI Validations" },
];

const FREE_REACTIONS_PER_DAY = 5;
const FREE_VOICE_LIMIT = 60;
const PASS_VOICE_LIMIT = 300;
const MAX_CHARS = 280;
const FREE_AI_PER_DAY = 3;
const COIN_COST_BOOST = 50;
const COINS_PER_RANT = 10;
const COINS_PER_HEAT_MILESTONE = 25;

const fmt = s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;
const ago = ts=>{
  const d=(Date.now()-new Date(ts).getTime())/1000;
  if(d<60) return "just now";
  if(d<3600) return `${Math.floor(d/60)}m ago`;
  if(d<86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
};
const velocity = r=>r.heat/Math.max(1,(Date.now()-new Date(r.created_at).getTime())/60000);
const randBars = (n=32)=>Array.from({length:n},()=>Math.floor(Math.random()*14)+3);
const getDailyPrompt = ()=>DAILY_PROMPTS[new Date().getDay() % DAILY_PROMPTS.length];
const isFlipTheVoidDay = ()=>new Date().getDay()===0; // Sunday
const todayStr = ()=>new Date().toDateString();

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const LS={
  get:(k,fb=null)=>{try{const v=localStorage.getItem(k);return v!==null?JSON.parse(v):fb}catch{return fb}},
  set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}},
};

// coin helpers
const getCoins = (username)=>LS.get(`coins_${username}`,0);
const setCoins = (username,n)=>LS.set(`coins_${username}`,n);
const addCoins = (username,n)=>setCoins(username,getCoins(username)+n);
const spendCoins = (username,n)=>{const c=getCoins(username);if(c<n)return false;setCoins(username,c-n);return true;};

// reaction quota
const getReactionCount = (username)=>LS.get(`reactions_${username}_${todayStr()}`,0);
const incReactionCount = (username)=>LS.set(`reactions_${username}_${todayStr()}`,getReactionCount(username)+1);
const canReact = (username,isPass)=>isPass||getReactionCount(username)<FREE_REACTIONS_PER_DAY;

// AI quota
const getAICount = (username)=>LS.get(`ai_${username}_${todayStr()}`,0);
const incAICount = (username)=>LS.set(`ai_${username}_${todayStr()}`,getAICount(username)+1);
const canUseAI = (username,isPass)=>isPass||(getAICount(username)<FREE_AI_PER_DAY);
const aiRemaining = (username)=>Math.max(0,FREE_AI_PER_DAY-getAICount(username));

// ─── AI VALIDATION ────────────────────────────────────────────────────────────
async function getAIValidation(rantText, category) {
  const catLabel = CATS.find(c=>c.id===category)?.label||"LIFE";
  const isFlip = isFlipTheVoidDay();
  const prompt = isFlip
    ? `You are THE VOID in the Rant app. Today is Flip the Void Sunday — instead of validating rants, you respond with an anonymous compliment. Someone shared: "${rantText}". Give them a warm, genuine, specific compliment in 2-3 sentences. NO emojis. Never start with "I". Make them feel seen.`
    : `You are THE VOID — brutally honest, darkly funny, surprisingly empathetic AI in the Rant app. Someone ranted: "${rantText}" (category: ${catLabel}). Validate them hard in 2-4 sentences. Be specific, match their energy, end making them feel legendary. NO emojis. Never start with "I".`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]}),
    });
    const data = await res.json();
    return data.content?.map(b=>b.type==="text"?b.text:"").join("").trim()||null;
  } catch { return null; }
}

// ─── AI CATEGORY DETECTOR ─────────────────────────────────────────────────────
async function detectCategory(rantText) {
  if(!rantText||rantText.length<10) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"claude-sonnet-4-20250514",
        max_tokens:1000,
        messages:[{role:"user",content:`Classify this rant into exactly one category. Reply with ONLY the category id, nothing else.\nCategories: work, people, life, tech, traffic, other\nRant: "${rantText}"\nCategory:`}],
      }),
    });
    const data = await res.json();
    const cat = data.content?.map(b=>b.type==="text"?b.text:"").join("").trim().toLowerCase();
    const valid = ["work","people","life","tech","traffic","other"];
    return valid.includes(cat) ? cat : null;
  } catch { return null; }
}

// ─── AI HEAT PREDICTOR ────────────────────────────────────────────────────────
async function predictHeat(rantText) {
  if(!rantText||rantText.length<20) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"claude-sonnet-4-20250514",
        max_tokens:1000,
        messages:[{role:"user",content:`You are THE VOID, an AI in a ranting app. Rate this rant's viral potential from 1-10 and give ONE specific reason why in max 12 words. Format: exactly "X/10 — reason" with nothing else.\nRant: "${rantText}"`}],
      }),
    });
    const data = await res.json();
    return data.content?.map(b=>b.type==="text"?b.text:"").join("").trim()||null;
  } catch { return null; }
}

// ─── AI RANT SUMMARISER ───────────────────────────────────────────────────────
async function summariseThread(rant) {
  const replies = (rant.replies||[]).map(r=>r.text||"🎙 voice rant").join(" | ");
  const threadText = `Original: "${rant.text||"🎙 voice rant"}" — Replies: ${replies||"none"}`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"claude-sonnet-4-20250514",
        max_tokens:1000,
        messages:[{role:"user",content:`You are THE VOID. Summarise this rant thread in ONE darkly funny sentence (max 20 words). Be savage but accurate. No emojis. Thread: ${threadText}`}],
      }),
    });
    const data = await res.json();
    return data.content?.map(b=>b.type==="text"?b.text:"").join("").trim()||null;
  } catch { return null; }
}

// ─── AI TRENDING INSIGHTS ─────────────────────────────────────────────────────
async function getTrendingInsight(rants) {
  const topRants = rants.slice(0,10).map(r=>r.text||"voice rant").join(" | ");
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"claude-sonnet-4-20250514",
        max_tokens:1000,
        messages:[{role:"user",content:`You are THE VOID. Based on these top rants today, write a darkly funny 2-sentence summary of what humanity is angry about right now. Be specific and savage. No emojis. Rants: ${topRants}`}],
      }),
    });
    const data = await res.json();
    return data.content?.map(b=>b.type==="text"?b.text:"").join("").trim()||null;
  } catch { return null; }
}

// ─── AI WEEKLY WRAPPED SUMMARY ────────────────────────────────────────────────
async function getWrappedSummary(username, rants, streak) {
  const topRant = rants.sort((a,b)=>b.heat-a.heat)[0];
  const cats = rants.map(r=>r.category);
  const topCat = cats.sort((a,b)=>cats.filter(c=>c===b).length-cats.filter(c=>c===a).length)[0]||"life";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"claude-sonnet-4-20250514",
        max_tokens:1000,
        messages:[{role:"user",content:`You are THE VOID. Write a personalised 3-sentence Rant Wrapped summary for @${username}. Facts: ${rants.length} rants this period, mostly about ${topCat}, ${streak} day streak, top rant: "${topRant?.text?.slice(0,80)||"voice rant"}" with ${topRant?.heat||0} heat. Be darkly funny, specific, and make them feel like a legend. No emojis.`}],
      }),
    });
    const data = await res.json();
    return data.content?.map(b=>b.type==="text"?b.text:"").join("").trim()||null;
  } catch { return null; }
}

// ─── AI VOID REPLY (occasional thread reply) ──────────────────────────────────
async function getVoidReply(replyText, originalRant) {
  // Only fires 30% of the time to keep it special
  if(Math.random()>0.3) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"claude-sonnet-4-20250514",
        max_tokens:1000,
        messages:[{role:"user",content:`You are THE VOID dropping into a rant thread. Original rant: "${originalRant?.text||"voice rant"}". Someone replied: "${replyText}". Drop a single punchy one-liner reaction (max 12 words). Be darkly funny. No emojis. Never start with "I".`}],
      }),
    });
    const data = await res.json();
    return data.content?.map(b=>b.type==="text"?b.text:"").join("").trim()||null;
  } catch { return null; }
}

// ─── DB HELPERS ───────────────────────────────────────────────────────────────
async function fetchFollowing(userId) {
  const {data} = await sb.from("follows").select("following_id").eq("follower_id",userId);
  return (data||[]).map(f=>f.following_id);
}

async function followUser(followerId, followingId) {
  await sb.from("follows").insert({follower_id:followerId, following_id:followingId});
}

async function unfollowUser(followerId, followingId) {
  await sb.from("follows").delete().eq("follower_id",followerId).eq("following_id",followingId);
}

async function fetchSuggestedRanters(currentUserId, followingIds, rants) {
  // Find top ranters by heat that user isn't already following
  const authorMap = {};
  rants.forEach(r=>{
    if(r.author_id&&r.author_id!==currentUserId&&!followingIds.includes(r.author_id)){
      if(!authorMap[r.author_id]) authorMap[r.author_id]={id:r.author_id,username:r.author,heat:0,rants:0};
      authorMap[r.author_id].heat+=r.heat;
      authorMap[r.author_id].rants+=1;
    }
  });
  return Object.values(authorMap).sort((a,b)=>b.heat-a.heat).slice(0,5);
}

async function fetchRants(catFilter="all") {
  let q = sb.from("rants")
    .select(`*, profiles(username,is_pass), reactions(user_id,type), replies:rants!parent_id(*, profiles(username,is_pass), reactions(user_id,type))`)
    .is("parent_id",null).eq("reported",false)
    .order("boosted",{ascending:false}).order("created_at",{ascending:false}).limit(60);
  if(catFilter!=="all") q=q.eq("category",catFilter);
  const {data} = await q;
  return data||[];
}

async function insertRant(rant) {
  const {data} = await sb.from("rants").insert(rant).select().single();
  return data;
}

async function toggleReaction(rantId, userId, type, currentlyReacted) {
  if(currentlyReacted){
    await sb.from("reactions").delete().eq("rant_id",rantId).eq("user_id",userId).eq("type",type);
    await sb.rpc("update_heat",{p_rant_id:rantId,p_delta:-1});
  } else {
    await sb.from("reactions").insert({rant_id:rantId,user_id:userId,type});
    await sb.rpc("update_heat",{p_rant_id:rantId,p_delta:1});
  }
}

async function boostRant(rantId) {
  await sb.from("rants").update({boosted:true,boost_expires_at:new Date(Date.now()+3600000).toISOString()}).eq("id",rantId);
}

async function saveValidation(rantId, validation) {
  await sb.from("rants").update({validation}).eq("id",rantId);
}

async function fetchNotifications(userId) {
  const {data} = await sb.from("notifications").select("*").eq("user_id",userId).order("created_at",{ascending:false}).limit(50);
  return data||[];
}

async function pushNotification(userId, icon, message) {
  if(!userId) return;
  await sb.from("notifications").insert({user_id:userId,icon,message});
}

async function updateProfile(userId, patch) {
  await sb.from("profiles").update(patch).eq("id",userId);
}

function normalizeRant(r, currentUserId) {
  const myReactions = (r.reactions||[]).filter(rx=>rx.user_id===currentUserId).map(rx=>rx.type);
  const reactionCounts = {};
  REACTIONS.forEach(({id})=>{ reactionCounts[id]=(r.reactions||[]).filter(rx=>rx.type===id).length; });
  return {
    ...r,
    author: r.profiles?.username||"anonymous",
    isPass: r.profiles?.is_pass||false,
    myReactions,
    reactionCounts,
    userReacted: myReactions.includes("heat"),
    replies: (r.replies||[]).map(rep=>normalizeRant(rep,currentUserId)),
    audioBars: r.audio_bars||randBars(),
    audioUrl: r.audio_url,
  };
}

// ─── AI TRENDING INSIGHTS BANNER ─────────────────────────────────────────────
function TrendingInsightBanner({rants}) {
  const [insight,setInsight] = useState(null);
  const [loading,setLoading] = useState(true);
  const cacheKey = `trending_insight_${new Date().toDateString()}`;
  useEffect(()=>{
    const cached = LS.get(cacheKey);
    if(cached){setInsight(cached);setLoading(false);return;}
    if(rants.length>0){
      getTrendingInsight(rants).then(v=>{
        if(v){setInsight(v);LS.set(cacheKey,v);}
        setLoading(false);
      });
    } else setLoading(false);
  },[rants.length]);
  return(
    <div className="insight-banner">
      <div className="insight-header">
        <span className="insight-eye">👁</span>
        <div><p className="insight-title">THE VOID OBSERVES</p><p className="insight-sub">what humanity is angry about today</p></div>
      </div>
      {loading
        ?<div className="void-typing" style={{padding:"4px 0"}}><span className="typing-dot" style={{"--d":"0s"}}/><span className="typing-dot" style={{"--d":".2s"}}/><span className="typing-dot" style={{"--d":".4s"}}/></div>
        :<p className="insight-text">{insight||"The void is watching. Keep ranting."}</p>}
    </div>
  );
}

// ─── THREAD SUMMARISER ────────────────────────────────────────────────────────
function ThreadSummariser({rant}) {
  const [summary,setSummary] = useState(null);
  const [loading,setLoading] = useState(false);
  const [shown,setShown] = useState(false);
  if(!rant.replies||rant.replies.length<2) return null;
  const fetch = async()=>{
    setLoading(true);setShown(true);
    const s = await summariseThread(rant);
    setSummary(s);setLoading(false);
  };
  return(
    <div className="thread-summariser">
      {!shown
        ?<button className="summarise-btn" onClick={fetch}>👁 SUMMARISE THE VOID ({rant.replies.length} replies)</button>
        :loading
          ?<div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0"}}><span style={{fontSize:16}}>👁</span><div className="void-typing"><span className="typing-dot" style={{"--d":"0s"}}/><span className="typing-dot" style={{"--d":".2s"}}/><span className="typing-dot" style={{"--d":".4s"}}/></div></div>
          :<div className="summary-result"><span style={{fontSize:14}}>👁</span><p className="summary-text">{summary||"The void refuses to summarise this chaos."}</p></div>}
    </div>
  );
}

// ─── RANT OF THE DAY ──────────────────────────────────────────────────────────
function RantOfTheDay({rant, onReact, onShare, currentUserId}) {
  if(!rant) return null;
  const cat = CATS.find(c=>c.id===rant.category);
  return(
    <div className="rotd">
      <div className="rotd-header">
        <span className="rotd-crown">👑</span>
        <div>
          <p className="rotd-title">RANT OF THE DAY</p>
          <p className="rotd-sub">highest heat in the last 24 hours</p>
        </div>
      </div>
      <div className="rotd-card">
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <span className="card-cat">{cat?.emoji} {cat?.label}</span>
          <span className="card-time">{ago(rant.created_at)}</span>
        </div>
        {rant.type==="voice"
          ?<p style={{fontSize:14,color:"var(--muted)",fontStyle:"italic"}}>🎙 Voice rant · {fmt(rant.duration||0)}</p>
          :<p className="rotd-text">"{rant.text?.slice(0,200)}{rant.text?.length>200?"…":""}"</p>}
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:12}}>
          <span className="rotd-heat">🔥 {rant.heat.toLocaleString()} heat</span>
          <button className="icon-btn" onClick={()=>onShare(rant)}>📤</button>
        </div>
      </div>
    </div>
  );
}

// ─── DAILY PROMPT ─────────────────────────────────────────────────────────────
function DailyPrompt({onRantAboutIt, isFlip}) {
  const prompt = getDailyPrompt();
  return(
    <div className={`daily-prompt${isFlip?" daily-flip":""}`}>
      <div className="dp-header">
        <span className="dp-icon">{isFlip?"💝":"💭"}</span>
        <div>
          <p className="dp-title">{isFlip?"FLIP THE VOID SUNDAY":"TODAY'S VOID PROMPT"}</p>
          <p className="dp-sub">{isFlip?"spread something good today":"everyone's ranting about this"}</p>
        </div>
      </div>
      <p className="dp-prompt">{isFlip?"share something kind — anonymously":"'"+prompt+"'"}</p>
      <button className="dp-btn" onClick={()=>onRantAboutIt(isFlip?"compliment someone anonymously":prompt)}>
        {isFlip?"💝 SPREAD KINDNESS":"💢 RANT ABOUT THIS"}
      </button>
    </div>
  );
}

// ─── REACTION BAR ─────────────────────────────────────────────────────────────
function ReactionBar({rant, onReact, currentUsername, isPass}) {
  const [showAll, setShowAll] = useState(false);
  const reacted = rant.myReactions||[];
  const counts = rant.reactionCounts||{};
  const totalReactions = Object.values(counts).reduce((s,n)=>s+n,0);
  const canR = canReact(currentUsername,isPass);

  return(
    <div className="reaction-bar">
      {REACTIONS.map(r=>{
        const isOn = reacted.includes(r.id);
        const count = counts[r.id]||0;
        return(
          <button key={r.id} className={`reaction-btn${isOn?" reaction-on":""}`}
            style={isOn?{borderColor:r.color,color:r.color,background:`${r.color}18`}:{}}
            onClick={()=>{if(canR||isOn)onReact(rant,r.id);}}
            title={!canR&&!isOn?"daily reaction limit reached":r.label}>
            <span>{r.emoji}</span>
            {count>0&&<span className="reaction-count">{count}</span>}
          </button>
        );
      })}
      {!isPass&&!canR&&(
        <span style={{fontSize:10,color:"var(--dim)",letterSpacing:1,alignSelf:"center"}}>
          {FREE_REACTIONS_PER_DAY} free/day
        </span>
      )}
    </div>
  );
}

// ─── COIN DISPLAY ─────────────────────────────────────────────────────────────
function CoinBadge({username}) {
  const coins = getCoins(username);
  return(
    <div className="coin-badge">
      <span>🪙</span>
      <span className="coin-amount">{coins}</span>
    </div>
  );
}

// ─── VOICE PLAYER ─────────────────────────────────────────────────────────────
function VoicePlayer({bars,duration,audioUrl}){
  const [playing,setPlaying]=useState(false);
  const [prog,setProg]=useState(0);
  const aRef=useRef(null),ivRef=useRef(null);
  const toggle=()=>{
    if(audioUrl){
      if(!aRef.current)aRef.current=new Audio(audioUrl);
      if(playing){aRef.current.pause();clearInterval(ivRef.current);setPlaying(false);}
      else{aRef.current.play();setPlaying(true);ivRef.current=setInterval(()=>{const p=aRef.current.currentTime/aRef.current.duration;setProg(isNaN(p)?0:p);if(aRef.current.ended){clearInterval(ivRef.current);setPlaying(false);setProg(0);}},80);}
    } else {
      if(playing){clearInterval(ivRef.current);setPlaying(false);setProg(0);}
      else{setPlaying(true);const t0=Date.now();ivRef.current=setInterval(()=>{const p=Math.min((Date.now()-t0)/(duration*1000),1);setProg(p);if(p>=1){clearInterval(ivRef.current);setPlaying(false);setProg(0);}},80);}
    }
  };
  useEffect(()=>()=>{clearInterval(ivRef.current);aRef.current?.pause();},[]);
  const filled=Math.floor(prog*(bars||[]).length);
  return(
    <div className="vp">
      <button className="vp-play" onClick={toggle}>{playing?"⏸":"▶"}</button>
      <div className="vp-bars">{(bars||[]).map((h,i)=><div key={i} className={`vp-bar${i<filled?" f":""}${playing&&i===filled?" a":""}`} style={{height:Math.max(4,h*2.4)+"px"}}/>)}</div>
      <span className="vp-dur">{playing?fmt(Math.round(prog*(duration||0))):fmt(duration||0)}</span>
    </div>
  );
}

// ─── LIVE WAVEFORM ────────────────────────────────────────────────────────────
function LiveWaveform({analyser}){
  const ref=useRef(null),raf=useRef(null);
  useEffect(()=>{
    if(!analyser)return;
    const data=new Uint8Array(analyser.frequencyBinCount);
    const draw=()=>{
      analyser.getByteFrequencyData(data);
      const c=ref.current;if(!c)return;
      const ctx=c.getContext("2d"),W=c.width,H=c.height;
      ctx.clearRect(0,0,W,H);
      const n=40,bw=W/n-1,sl=Math.floor(data.length/n);
      for(let i=0;i<n;i++){
        const h=Math.max(4,(data[i*sl]/255)*(H-8));
        const g=ctx.createLinearGradient(0,H/2-h/2,0,H/2+h/2);
        g.addColorStop(0,"#ff3b1f");g.addColorStop(1,"#ff8c00");
        ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(i*(bw+1),H/2-h/2,bw,h,2);ctx.fill();
      }
      raf.current=requestAnimationFrame(draw);
    };
    draw();return()=>cancelAnimationFrame(raf.current);
  },[analyser]);
  return <canvas ref={ref} width={300} height={60} style={{width:"100%",maxWidth:300,borderRadius:4}}/>;
}

// ─── VOICE RECORDER ──────────────────────────────────────────────────────────
function VoiceRecorder({onComplete,limit}){
  const [state,setState]=useState("idle");
  const [sec,setSec]=useState(0);
  const [an,setAn]=useState(null);
  const [result,setResult]=useState(null);
  const [uploading,setUploading]=useState(false);
  const mr=useRef(null),chunks=useRef([]),timer=useRef(null),stream=useRef(null),secRef=useRef(0);
  const start=async()=>{
    try{
      const s=await navigator.mediaDevices.getUserMedia({audio:true});
      stream.current=s;
      const ctx=new AudioContext(),src=ctx.createMediaStreamSource(s);
      const a=ctx.createAnalyser();a.fftSize=256;src.connect(a);setAn(a);
      const m=new MediaRecorder(s);mr.current=m;chunks.current=[];
      m.ondataavailable=e=>chunks.current.push(e.data);
      m.onstop=()=>{
        const blob=new Blob(chunks.current,{type:"audio/webm"});
        setResult({blob,audioUrl:URL.createObjectURL(blob),audioBars:randBars(Math.max(24,Math.min(52,secRef.current*2))),duration:secRef.current});
        setState("preview");
      };
      m.start();setState("recording");setSec(0);secRef.current=0;
      timer.current=setInterval(()=>{secRef.current++;setSec(s=>s+1);if(secRef.current>=limit)stop();},1000);
    }catch{alert("Mic access needed.");}
  };
  const stop=()=>{clearInterval(timer.current);stream.current?.getTracks().forEach(t=>t.stop());mr.current?.stop();setAn(null);};
  const release=async()=>{
    if(!result)return;
    setUploading(true);
    try{
      const filename=`${Date.now()}.webm`;
      const {data,error}=await sb.storage.from("voice-rants").upload(filename,result.blob,{contentType:"audio/webm"});
      if(error)throw error;
      const publicUrl=`https://tgzfokaztzwracldnhae.supabase.co/storage/v1/object/public/voice-rants/${filename}`;
      onComplete({...result,audioUrl:publicUrl});
    }catch(e){
      console.error("Upload failed",e);
      // fallback to blob url if upload fails
      onComplete(result);
    }
    setUploading(false);
  };
  useEffect(()=>()=>{clearInterval(timer.current);stream.current?.getTracks().forEach(t=>t.stop());},[]);
  return(
    <div className="vr-wrap">
      {state==="idle"&&<div className="vr-idle"><div className="mic-ring" onClick={start}>🎙</div><p className="vr-hint">TAP TO RECORD</p><p className="vr-sub">up to {fmt(limit)}</p></div>}
      {state==="recording"&&(
        <div className="vr-rec">
          <div className="rec-row"><span className="rec-dot"/><span className="rec-lbl">RECORDING</span><span className="rec-time">{fmt(sec)}</span></div>
          <div className="limit-bar"><div className="limit-fill" style={{width:`${(sec/limit)*100}%`,background:sec/limit>.8?"var(--accent)":"var(--orange)"}}/></div>
          <LiveWaveform analyser={an}/>
          <button className="stop-btn" onClick={stop}>⏹ STOP</button>
        </div>
      )}
      {state==="preview"&&result&&(
        <div className="vr-preview">
          <p className="preview-lbl">LISTEN BACK</p>
          <audio src={result.audioUrl} controls style={{width:"100%",borderRadius:4}}/>
          <div style={{display:"flex",gap:10}}><button className="ghost-btn" onClick={()=>{setResult(null);setSec(0);setState("idle");}}>↺ RETAKE</button><button className="post-btn" onClick={release} disabled={uploading}>{uploading?"UPLOADING…":"RELEASE 🔥"}</button></div>
        </div>
      )}
    </div>
  );
}

// ─── FOLLOW BUTTON ────────────────────────────────────────────────────────────
function FollowButton({targetId, targetUsername, currentUserId, followingIds, onFollow, onUnfollow, small=false}) {
  if(!currentUserId||targetId===currentUserId) return null;
  const isFollowing = followingIds.includes(targetId);
  return(
    <button
      className={`follow-btn${isFollowing?" follow-btn-on":""}${small?" follow-btn-sm":""}`}
      onClick={e=>{e.stopPropagation();isFollowing?onUnfollow(targetId,targetUsername):onFollow(targetId,targetUsername);}}
    >
      {isFollowing?"✓ FOLLOWING":"+ FOLLOW"}
    </button>
  );
}

// ─── SUGGESTED RANTERS ────────────────────────────────────────────────────────
function SuggestedRanters({suggestions, currentUserId, followingIds, onFollow}) {
  if(!suggestions||suggestions.length===0) return null;
  return(
    <div className="suggested-card">
      <p className="suggested-title">👥 RANTERS YOU MIGHT LIKE</p>
      <div className="suggested-list">
        {suggestions.map(s=>(
          <div key={s.id} className="suggested-row">
            <div className="suggested-avatar">{s.username.slice(0,2).toUpperCase()}</div>
            <div className="suggested-info">
              <p className="suggested-username">@{s.username}</p>
              <p className="suggested-stats">🔥 {s.heat.toLocaleString()} heat · {s.rants} rant{s.rants!==1?"s":""}</p>
            </div>
            <FollowButton targetId={s.id} targetUsername={s.username} currentUserId={currentUserId} followingIds={followingIds} onFollow={onFollow} onUnfollow={()=>{}} small/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FOLLOWING FEED ───────────────────────────────────────────────────────────
function FollowingFeed({rants, followingIds, currentUserId, currentUsername, isPass, onFollow, onUnfollow, followingIdsSet, ...cardProps}) {
  const followingRants = useMemo(()=>
    rants.filter(r=>followingIds.includes(r.author_id)&&!r.reported)
      .slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)),
  [rants,followingIds]);

  if(followingIds.length===0) return(
    <div className="screen-pad">
      <div className="following-empty">
        <span style={{fontSize:48}}>👥</span>
        <p className="empty-txt">YOU'RE NOT FOLLOWING ANYONE</p>
        <p style={{color:"var(--dim)",fontSize:12,marginTop:6,textAlign:"center",lineHeight:1.6}}>Follow ranters from the feed to see their rants here. Look for the + FOLLOW button on any rant.</p>
      </div>
    </div>
  );

  if(followingRants.length===0) return(
    <div className="screen-pad">
      <div className="following-empty">
        <span style={{fontSize:48}}>🔔</span>
        <p className="empty-txt">NOTHING NEW YET</p>
        <p style={{color:"var(--dim)",fontSize:12,marginTop:6}}>the people you follow haven't ranted recently</p>
      </div>
    </div>
  );

  return(
    <div className="feed">
      <div className="following-header">
        <p className="following-header-txt">👥 {followingIds.length} ranter{followingIds.length!==1?"s":""} you follow</p>
      </div>
      {followingRants.map(r=>(
        <RantCard key={r.id} rant={r} currentUserId={currentUserId} currentUsername={currentUsername} isPass={isPass} {...cardProps}/>
      ))}
    </div>
  );
}

// ─── RANT CARD ────────────────────────────────────────────────────────────────
function RantCard({rant,onReact,onBoost,onReply,onReport,onShare,onFollow,onUnfollow,currentUserId,currentUsername,isPass,followingIds=[],depth=0}){
  const cat=CATS.find(c=>c.id===rant.category);
  const isOwn=rant.author_id===currentUserId;
  const canBoost=isPass&&isOwn&&!rant.boosted;
  const [menu,setMenu]=useState(false);
  const [showReplies,setShowReplies]=useState(false);
  const [showVoid,setShowVoid]=useState(false);
  const menuRef=useRef(null);
  useEffect(()=>{const h=e=>{if(menuRef.current&&!menuRef.current.contains(e.target))setMenu(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  if(rant.reported&&!isOwn)return null;

  const totalReactions=Object.values(rant.reactionCounts||{}).reduce((s,n)=>s+n,0);

  return(
    <div className={`card${rant.boosted?" card-boosted":""}${depth>0?" card-reply":""}`}>
      {rant.boosted&&<div className="boost-ribbon">⚡ BOOSTED</div>}
      <div className="card-meta">
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <span className="card-cat">{cat?.emoji} {cat?.label}</span>
          {rant.type==="voice"&&<span className="bdg bdg-voice">🎙 VOICE</span>}
          {rant.isPass&&<span className="bdg bdg-pass">✦</span>}
          {rant.is_prompt&&<span className="bdg bdg-prompt">💭 PROMPTED</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}} ref={menuRef}>
          <span className="card-time">{ago(rant.created_at)}</span>
          <button className="menu-btn" onClick={()=>setMenu(o=>!o)}>···</button>
          {menu&&<div className="card-menu">
            <button onClick={()=>{onShare(rant);setMenu(false);}}>📤 Share</button>
            {!isOwn&&<button onClick={()=>{onReport(rant);setMenu(false);}}>🚩 Report</button>}
            {canBoost&&<button onClick={()=>{onBoost(rant);setMenu(false);}}>⚡ Boost</button>}
          </div>}
        </div>
      </div>

      {/* AUTHOR ROW */}
      {depth===0&&!isOwn&&rant.author&&(
        <div className="author-row">
          <div className="author-avatar-sm">{rant.author.slice(0,2).toUpperCase()}</div>
          <span className="author-name">@{rant.author}</span>
          <FollowButton targetId={rant.author_id} targetUsername={rant.author} currentUserId={currentUserId} followingIds={followingIds} onFollow={onFollow} onUnfollow={onUnfollow} small/>
        </div>
      )}

      {rant.type==="voice"
        ?<VoicePlayer bars={rant.audioBars} duration={rant.duration} audioUrl={rant.audioUrl}/>
        :<p className="card-text">{rant.text}</p>}

      {rant.validation&&(
        <div className="card-validation">
          <button className="void-toggle" onClick={()=>setShowVoid(v=>!v)}>
            <span className="void-eye">👁</span><span>THE VOID SAYS</span><span className="void-arrow">{showVoid?"▲":"▼"}</span>
          </button>
          {showVoid&&<div className="void-inline"><p className="void-inline-text">{rant.validation}</p></div>}
        </div>
      )}

      {/* LIVE REACTION BAR */}
      <ReactionBar rant={rant} onReact={onReact} currentUsername={currentUsername} isPass={isPass}/>

      <div className="card-footer">
        {depth===0&&<button className="reply-btn" onClick={()=>onReply(rant)}>💬 {rant.replies?.length>0?rant.replies.length:"RANT BACK"}</button>}
        <button className="icon-btn" onClick={()=>onShare(rant)}>📤</button>
        {canBoost&&<button className="icon-btn boost-icon-btn" onClick={()=>onBoost(rant)}>⚡</button>}
        {totalReactions>0&&<span className="total-reactions">{totalReactions} felt this</span>}
      </div>

      {depth===0&&rant.replies?.length>0&&(
        <>
          <button className="show-replies-btn" onClick={()=>setShowReplies(r=>!r)}>{showReplies?"▲ hide":"▼"} {rant.replies.length} rant back{rant.replies.length>1?"s":""}</button>
          <ThreadSummariser rant={rant}/>
          {showReplies&&<div className="reply-chain">{rant.replies.map(r=><RantCard key={r.id} rant={normalizeRant(r,currentUserId)} onReact={onReact} onBoost={onBoost} onReply={onReply} onReport={onReport} onShare={onShare} currentUserId={currentUserId} currentUsername={currentUsername} isPass={isPass} depth={1}/>)}</div>}
        </>
      )}
    </div>
  );
}

// ─── VALIDATION SCREEN ────────────────────────────────────────────────────────
function ValidationScreen({rant,onDone,profile}){
  const [validation,setValidation]=useState(rant.validation||null);
  const [loading,setLoading]=useState(!rant.validation);
  const [error,setError]=useState(false);
  const [out,setOut]=useState(false);
  const isFlip=isFlipTheVoidDay();

  const fetch=useCallback(async()=>{
    setLoading(true);setError(false);
    const v=await getAIValidation(rant.text||"voice rant",rant.category);
    if(v){setValidation(v);incAICount(profile?.username||"anon");await saveValidation(rant.id,v);}
    else setError(true);
    setLoading(false);
  },[rant,profile]);

  useEffect(()=>{if(!rant.validation&&canUseAI(profile?.username||"anon",profile?.is_pass))fetch();else if(!rant.validation)setLoading(false);},[]);

  const done=()=>{setOut(true);setTimeout(onDone,300);};
  return(
    <div className={`vs-screen${out?" vs-out":""}`}>
      <div className="vs-bg"/>
      <div className="vs-content">
        <div className="vs-logo">RANT</div>
        <p className="vs-released">{isFlip?"KINDNESS SENT":"RANT RELEASED"}</p>
        <p className="vs-sub">{isFlip?"the void smiles":"the void heard you"}</p>
        <div className="vs-rant-preview">
          {rant.type==="voice"?<p className="vs-rant-text">🎙 Voice rant · {fmt(rant.duration||0)}</p>:<p className="vs-rant-text">"{rant.text?.slice(0,140)}{rant.text?.length>140?"…":""}"</p>}
        </div>
        <div className="vs-divider"><span className="vs-divider-label">{isFlip?"THE VOID SMILES BACK":"THE VOID RESPONDS"}</span></div>
        {loading&&<div className="void-bubble void-loading"><span className="void-avatar">{isFlip?"💝":"👁"}</span><div className="void-body"><span className="void-name">THE VOID</span><div className="void-typing"><span className="typing-dot" style={{"--d":"0s"}}/><span className="typing-dot" style={{"--d":".2s"}}/><span className="typing-dot" style={{"--d":".4s"}}/></div></div></div>}
        {!loading&&validation&&<div className="void-bubble void-bubble--in"><span className="void-avatar">{isFlip?"💝":"👁"}</span><div className="void-body"><span className="void-name">THE VOID</span><p className="void-text">{validation}</p></div></div>}
        {!loading&&error&&<div className="void-bubble void-error"><span className="void-avatar">👁</span><div className="void-body"><span className="void-name">THE VOID</span><p className="void-text" style={{color:"var(--muted)"}}>The void is silent right now.</p></div></div>}
        <button className="vs-done-btn" onClick={done} disabled={loading}>{loading?"THE VOID IS THINKING…":"BACK TO THE FEED"}</button>
        {!profile?.is_pass&&<p className="vs-remaining">{aiRemaining(profile?.username||"anon")} free validation{aiRemaining(profile?.username||"anon")!==1?"s":""} remaining today</p>}
      </div>
    </div>
  );
}

// ─── COMPOSE SHEET ────────────────────────────────────────────────────────────
function ComposeSheet({onClose,onPost,profile,onOpenPass,replyingTo,prefillText}){
  const [mode,setMode]=useState("text");
  const [text,setText]=useState(prefillText||"");
  const [cat,setCat]=useState("life");
  const [voiceData,setVoiceData]=useState(null);
  const [heatScore,setHeatScore]=useState(null);
  const [heatLoading,setHeatLoading]=useState(false);
  const [aiCat,setAiCat]=useState(null);
  const ref=useRef(null);
  const charsLeft=MAX_CHARS-text.length;
  const limit=profile?.is_pass?PASS_VOICE_LIMIT:FREE_VOICE_LIMIT;
  const isFlip=isFlipTheVoidDay();
  const heatTimer=useRef(null);

  useEffect(()=>{if(mode==="text"&&ref.current)ref.current.focus();},[mode]);

  // auto-detect category as user types
  useEffect(()=>{
    if(text.length<30) return;
    clearTimeout(heatTimer.current);
    heatTimer.current=setTimeout(async()=>{
      const detectedCat = await detectCategory(text);
      if(detectedCat) setAiCat(detectedCat);
    },1500);
    return()=>clearTimeout(heatTimer.current);
  },[text]);

  const handlePredictHeat = async()=>{
    if(!text.trim()||heatLoading) return;
    setHeatLoading(true);
    const score = await predictHeat(text);
    setHeatScore(score);
    setHeatLoading(false);
  };
  const submit=()=>{
    const finalCat = aiCat||cat;
    if(voiceData)onPost({type:"voice",...voiceData,category:replyingTo?.category||finalCat,is_prompt:!!prefillText});
    else if(text.trim()&&charsLeft>=0)onPost({type:"text",text:text.trim(),category:replyingTo?.category||finalCat,is_prompt:!!prefillText});
  };
  return(
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bottom-sheet compose-sheet-inner">
        <SheetHandle/>
        <div className="sheet-hdr">
          <span className="sheet-title">{replyingTo?"RANT BACK":isFlip?"SPREAD KINDNESS":"LET IT OUT"}</span>
          <button className="x-btn-inline" onClick={onClose}>×</button>
        </div>
        {replyingTo&&<div className="replying-to"><span style={{color:"var(--muted)",fontSize:11}}>↩ replying to: </span><span style={{color:"var(--text)",fontSize:12}}>{replyingTo.type==="voice"?"🎙 voice rant":`"${replyingTo.text?.slice(0,50)}…"`}</span></div>}
        {prefillText&&<div className="prompt-pill">💭 {prefillText}</div>}
        <div className="mode-sw">
          <button className={`mode-btn${mode==="text"?" m-on":""}`} onClick={()=>setMode("text")}>✍️ TYPE</button>
          <button className={`mode-btn${mode==="voice"?" m-on":""}`} onClick={()=>setMode("voice")}>🎙 VOICE {!profile?.is_pass&&<span style={{fontSize:9,opacity:.6}}>· 1 MIN FREE</span>}</button>
        </div>
        {!replyingTo&&(
          <div>
            <div className="cat-picker">{NON_ALL_CATS.map(c=><button key={c.id} className={`cat-btn${(aiCat||cat)===c.id?" cat-on":""}`} onClick={()=>{setCat(c.id);setAiCat(null);}}>{c.emoji} {c.label}</button>)}</div>
            {aiCat&&<p className="ai-cat-hint">👁 void detected: <strong>{CATS.find(c=>c.id===aiCat)?.emoji} {CATS.find(c=>c.id===aiCat)?.label}</strong> <button onClick={()=>setAiCat(null)} style={{background:"none",border:"none",color:"var(--dim)",cursor:"pointer",fontSize:11}}>× change</button></p>}
          </div>
        )}
        {mode==="text"?(
          <>
            <textarea ref={ref} className="rant-input" placeholder={isFlip?"say something kind, anonymously...":replyingTo?"respond with your own rant...":"what's got you fuming? don't hold back..."} value={text} onChange={e=>setText(e.target.value)} maxLength={MAX_CHARS+50}/>
            {heatScore&&<div className="heat-score"><span className="heat-score-icon">🔥</span><span className="heat-score-text">{heatScore}</span></div>}
            <div className="compose-footer">
              <span className={`char-count${charsLeft<=30&&charsLeft>0?" warn":""}${charsLeft<0?" over":""}`}>{charsLeft}</span>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                {text.length>20&&<button className="predict-btn" onClick={handlePredictHeat} disabled={heatLoading}>{heatLoading?"…":"🔥 PREDICT"}</button>}
                <button className="post-btn" onClick={submit} disabled={!text.trim()||charsLeft<0}>RELEASE</button>
              </div>
            </div>
          </>
        ):(
          <>
            <VoiceRecorder onComplete={d=>setVoiceData(d)} limit={limit}/>
            {voiceData&&<div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><button className="post-btn" onClick={submit}>RELEASE 🔥</button></div>}
            {!profile?.is_pass&&<button className="upsell-strip" onClick={()=>{onClose();onOpenPass();}}>✦ Get Rant Pass for 5-min voice rants →</button>}
          </>
        )}
      </div>
    </div>
  );
}

// ─── SHARE CARD ───────────────────────────────────────────────────────────────
function ShareCard({rant,onClose}){
  const cat=CATS.find(c=>c.id===rant.category);
  const [copied,setCopied]=useState(false);
  const totalR=Object.values(rant.reactionCounts||{}).reduce((s,n)=>s+n,0);
  const txt=`${rant.type==="voice"?"🎙 Voice rant":rant.text}\n\n🔥 ${rant.heat} heat · ${totalR} reactions\n\nRant on RANT — scream into the void`;
  const copy=()=>navigator.clipboard?.writeText(txt).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  return(
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bottom-sheet">
        <SheetHandle/><button className="x-btn" onClick={onClose}>×</button>
        <p className="sheet-label">SHARE THIS RANT</p>
        <div className="share-preview">
          <div className="sc-logo">RANT</div>
          <div className="sc-cat">{cat?.emoji} {cat?.label}</div>
          <p className="sc-text">{rant.type==="voice"?"🎙 Voice rant":`"${rant.text?.slice(0,120)}…"`}</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
            {REACTIONS.map(r=>{const c=rant.reactionCounts?.[r.id]||0;return c>0?<span key={r.id} style={{fontSize:12,color:"var(--muted)"}}>{r.emoji} {c}</span>:null;})}
          </div>
          <div className="sc-foot">rant.app · scream into the void</div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button className="share-action-btn" onClick={copy}>{copied?"✓ COPIED":"📋 COPY"}</button>
          <button className="share-action-btn" onClick={()=>navigator.share?navigator.share({text:txt}):copy()}>📤 SHARE</button>
        </div>
      </div>
    </div>
  );
}

// ─── REPORT / BOOST / PASS MODALS ─────────────────────────────────────────────
function ReportModal({onConfirm,onClose}){
  const [reason,setReason]=useState("");
  const reasons=["Harassment","Hate speech","Spam","Personal info","Threatening","Other"];
  return(
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bottom-sheet">
        <SheetHandle/><button className="x-btn" onClick={onClose}>×</button>
        <p className="report-title">REPORT RANT</p>
        <div className="report-reasons">{reasons.map(r=><button key={r} className={`reason-btn${reason===r?" reason-on":""}`} onClick={()=>setReason(r)}>{r}</button>)}</div>
        <button className="post-btn" style={{width:"100%"}} disabled={!reason} onClick={()=>onConfirm(reason)}>SUBMIT</button>
      </div>
    </div>
  );
}

function BoostModal({rant,onConfirm,onClose,profile}){
  const coins=getCoins(profile?.username||"");
  const canAfford=coins>=COIN_COST_BOOST||profile?.is_pass;
  return(
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bottom-sheet" style={{alignItems:"center",textAlign:"center",gap:12}}>
        <SheetHandle/><button className="x-btn" onClick={onClose}>×</button>
        <div style={{fontSize:40}}>⚡</div>
        <h2 className="boost-title">BOOST THIS RANT</h2>
        <p className="boost-sub">Pin to the top for 1 hour.</p>
        {!profile?.is_pass&&<p style={{fontSize:13,color:"var(--muted)"}}>Cost: <span style={{color:"var(--gold)"}}>🪙 {COIN_COST_BOOST} coins</span> · You have: <span style={{color:"var(--gold)"}}>🪙 {coins}</span></p>}
        {profile?.is_pass&&<p style={{fontSize:13,color:"var(--gold)"}}>Free with Rant Pass ✦</p>}
        <div style={{display:"flex",gap:10}}>
          <button className="ghost-btn" onClick={onClose}>CANCEL</button>
          <button className="post-btn" onClick={onConfirm} disabled={!canAfford}>{canAfford?"⚡ BOOST IT":"NOT ENOUGH COINS"}</button>
        </div>
      </div>
    </div>
  );
}

function PassModal({onClose,onActivate}){
  const [plan,setPlan]=useState("yearly");
  const [processing,setProcessing]=useState(false);
  const [success,setSuccess]=useState(false);
  const plans=[{id:"monthly",label:"MONTHLY",price:"$3.99",period:"/mo"},{id:"yearly",label:"YEARLY",price:"$29.99",period:"/yr",badge:"BEST VALUE"}];
  const go=()=>{setProcessing(true);setTimeout(()=>{setProcessing(false);setSuccess(true);setTimeout(onActivate,1400);},1800);};
  return(
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bottom-sheet pass-sheet">
        <SheetHandle/><button className="x-btn" onClick={onClose}>×</button>
        {success?(<div className="pass-success"><span className="ps-icon">✦</span><p className="ps-title">WELCOME TO RANT PASS</p><p className="ps-sub">you're now a verified ranter</p></div>):(
          <>
            <div className="pass-hdr"><span className="pass-crown">✦</span><h2 className="pass-title">RANT PASS</h2><p className="pass-sub-txt">for those who rant seriously</p></div>
            <div className="pass-perks">{PASS_PERKS.map((p,i)=><div key={i} className="perk-row"><span className="perk-icon">{p.icon}</span><span className="perk-text">{p.text}</span></div>)}</div>
            <div className="pass-plans">{plans.map(pl=>(
              <button key={pl.id} className={`plan-btn${plan===pl.id?" plan-on":""}`} onClick={()=>setPlan(pl.id)}>
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><div className={`plan-radio${plan===pl.id?" pr-on":""}`}/><span className="plan-lbl">{pl.label}</span>{pl.badge&&<span className="plan-badge">{pl.badge}</span>}</div>
                <span className="plan-price">{pl.price}<span className="plan-period">{pl.period}</span></span>
              </button>
            ))}</div>
            <button className="pass-cta" onClick={go} disabled={processing}>{processing?<span className="spinner">◌</span>:"ACTIVATE RANT PASS"}</button>
            <p className="pass-legal">Cancel anytime · No hidden fees</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── TRENDING ─────────────────────────────────────────────────────────────────
function TrendingScreen({rants,...cardProps}){
  const trending=useMemo(()=>[...rants].filter(r=>!r.reported).sort((a,b)=>velocity(b)-velocity(a)).slice(0,10),[rants]);
  const catStats=useMemo(()=>NON_ALL_CATS.map(c=>({...c,count:rants.filter(r=>r.category===c.id).length,heat:rants.filter(r=>r.category===c.id).reduce((s,r)=>s+r.heat,0)})).sort((a,b)=>b.heat-a.heat),[rants]);
  return(
    <div className="screen-pad">
      <TrendingInsightBanner rants={rants}/>
      <p className="section-title">🌋 TRENDING NOW</p><p className="section-sub">ranked by heat per minute</p>
      {trending.map((r,i)=><div key={r.id}><div className="trend-rank">#{i+1}</div><RantCard rant={r} {...cardProps} depth={0}/></div>)}
      <p className="section-title" style={{marginTop:24}}>🌡 CATEGORY HEAT</p>
      <div className="cat-heat-grid">{catStats.map(c=><div key={c.id} className="cat-heat-card"><span style={{fontSize:24}}>{c.emoji}</span><span className="cat-heat-lbl">{c.label}</span><span className="cat-heat-val">🔥 {c.heat.toLocaleString()}</span></div>)}</div>
    </div>
  );
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
function NotificationsScreen({notifs,onClear}){
  if(!notifs.length)return<div className="empty-state"><span style={{fontSize:48}}>🔔</span><p className="empty-txt">NO ALERTS YET</p></div>;
  return(
    <div className="screen-pad">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><p className="section-title">ALERTS</p><button className="ghost-btn-sm" onClick={onClear}>CLEAR ALL</button></div>
      {notifs.map(n=><div key={n.id} className={`notif-row${n.unread?" notif-unread":""}`}><span style={{fontSize:22,flexShrink:0}}>{n.icon}</span><div><p className="notif-msg">{n.message}</p><p className="notif-time">{ago(n.created_at)}</p></div></div>)}
    </div>
  );
}

// ─── STREAK BADGE ─────────────────────────────────────────────────────────────
function StreakBadge({streak}){
  if(!streak||streak<2)return null;
  const milestones=[3,7,14,30,60,100];
  const next=milestones.find(m=>m>streak)||streak+1;
  return<div className="streak-badge"><span style={{fontSize:22}}>🔥</span><div><span className="streak-num">{streak}</span><span className="streak-lbl"> DAY STREAK</span></div><span className="streak-next">{next-streak} to {next}</span></div>;
}

// ─── PROFILE ─────────────────────────────────────────────────────────────────
function ProfileScreen({profile,myRants,onOpenPass,onLogout}){
  const joined=new Date(profile.created_at||Date.now()).toLocaleDateString("en-US",{month:"long",year:"numeric"});
  const heat=myRants.reduce((s,r)=>s+r.heat,0);
  const voices=myRants.filter(r=>r.type==="voice").length;
  const coins=getCoins(profile.username||"");
  const [wrappedSummary,setWrappedSummary]=useState(null);
  const [wrappedLoading,setWrappedLoading]=useState(false);
  const stats=[{val:myRants.length,lbl:"RANTS"},{val:voices,lbl:"VOICE"},{val:heat.toLocaleString(),lbl:"🔥 HEAT"},{val:profile.streak||0,lbl:"🔥 STREAK"},{val:profile.follower_count||0,lbl:"👥 FOLLOWERS"},{val:profile.following_count||0,lbl:"FOLLOWING"}];

  const fetchWrapped=async()=>{
    setWrappedLoading(true);
    const s=await getWrappedSummary(profile.username,myRants,profile.streak||0);
    setWrappedSummary(s);setWrappedLoading(false);
  };
  return(
    <div className="screen-pad">
      <div className="profile-header">
        <div className="profile-avatar">{(profile.username||"?").slice(0,2).toUpperCase()}</div>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><p className="profile-name">@{profile.username}</p>{profile.is_pass&&<span className="bdg bdg-pass-lg">✦ PASS</span>}</div>
          <p className="profile-joined">ranting since {joined}</p>
        </div>
      </div>
      <StreakBadge streak={profile.streak}/>
      <div className="stats-grid">{stats.map((s,i)=><div key={i} className="stat-box"><span className="stat-val">{s.val}</span><span className="stat-lbl">{s.lbl}</span></div>)}</div>

      {/* AI WRAPPED SUMMARY */}
      {myRants.length>0&&(
        <div className="wrapped-ai-card">
          {!wrappedSummary&&!wrappedLoading&&(
            <button className="wrapped-ai-btn" onClick={fetchWrapped}>👁 GET MY VOID WRAPPED SUMMARY</button>
          )}
          {wrappedLoading&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"4px 0"}}><span style={{fontSize:18}}>👁</span><div className="void-typing"><span className="typing-dot" style={{"--d":"0s"}}/><span className="typing-dot" style={{"--d":".2s"}}/><span className="typing-dot" style={{"--d":".4s"}}/></div></div>}
          {wrappedSummary&&(
            <div>
              <p className="wrapped-ai-label">👁 THE VOID ON YOUR RANT HISTORY</p>
              <p className="wrapped-ai-text">{wrappedSummary}</p>
            </div>
          )}
        </div>
      )}

      {!profile.is_pass?(
        <button className="pass-upsell-card" onClick={onOpenPass}>
          <span style={{fontSize:22,color:"var(--gold)"}}>✦</span>
          <div style={{flex:1}}><p className="upsell-title">UPGRADE TO RANT PASS</p><p className="upsell-sub">100 coins/mo, unlimited AI, 5-min voice & more from $3.99/mo</p></div>
          <span style={{color:"var(--gold)",fontSize:20}}>›</span>
        </button>
      ):(
        <div className="pass-active-card"><span style={{fontSize:20,color:"var(--gold)"}}>✦</span><div><p style={{fontFamily:"var(--display)",fontSize:14,letterSpacing:2,color:"var(--gold)"}}>RANT PASS ACTIVE</p><p style={{fontSize:11,color:"var(--muted)",marginTop:2}}>All perks unlocked</p></div></div>
      )}
      <div className="coin-info">
        <p className="coin-info-title">🪙 RANT COINS</p>
        <p className="coin-info-sub">Earn coins by posting rants and hitting heat milestones. Spend them on Boosts.</p>
        <div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap"}}>
          <span style={{fontSize:12,color:"var(--muted)"}}>Post a rant → +{COINS_PER_RANT} coins</span>
          <span style={{fontSize:12,color:"var(--muted)"}}>Hit heat milestone → +{COINS_PER_HEAT_MILESTONE} coins</span>
          <span style={{fontSize:12,color:"var(--muted)"}}>Boost a rant → -{COIN_COST_BOOST} coins</span>
        </div>
      </div>
      <p className="section-title" style={{marginTop:8}}>MY RANTS</p>
      {myRants.length===0?<p style={{color:"var(--dim)",fontSize:13,padding:"14px 0"}}>nothing yet. let it rip.</p>
        :myRants.slice(0,20).map(r=>(
          <div key={r.id} className="my-rant-row">
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:10,color:"var(--accent)",fontFamily:"var(--display)",letterSpacing:1}}>{CATS.find(c=>c.id===r.category)?.emoji} {ago(r.created_at)}{r.boosted?" ⚡":""}</span>
              <span style={{fontSize:11,color:"var(--muted)"}}>🔥 {r.heat}</span>
            </div>
            <p style={{fontSize:13,color:"var(--text)",lineHeight:1.5}}>{r.type==="voice"?`🎙 Voice rant (${fmt(r.duration||0)})`:r.text?.slice(0,100)+(r.text?.length>100?"…":"")}</p>
          </div>
        ))}
      <button className="logout-btn" onClick={onLogout}>SIGN OUT</button>
    </div>
  );
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function AuthScreen({onAuth}){
  const [mode,setMode]=useState("login");
  const [username,setUsername]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState("");
  const [error,setError]=useState(""),[shake,setShake]=useState(false),[loading,setLoad]=useState(false);
  const err=msg=>{setError(msg);setShake(true);setTimeout(()=>setShake(false),500);};
  const submit=async()=>{
    if(loading)return;
    if(!username.trim()||!password.trim())return err("fill in all fields.");
    if(mode==="signup"&&username.length<3)return err("username must be 3+ chars.");
    if(password.length<6)return err("password must be 6+ chars.");
    setLoad(true);setError("");
    try{
      if(mode==="signup"){
        const {data:existing}=await sb.from("profiles").select("id").ilike("username",username).maybeSingle();
        if(existing)return err("username already taken.");
        const signupEmail=email.trim()||`${username.toLowerCase()}@rant.void`;
        const {data,error:e}=await sb.auth.signUp({email:signupEmail,password,options:{data:{username:username.toLowerCase()}}});
        if(e)return err(e.message);
        if(data.user){
          await new Promise(r=>setTimeout(r,1000));
          const {data:prof}=await sb.from("profiles").select("*").eq("id",data.user.id).single();
          onAuth(data.user,prof||{id:data.user.id,username:username.toLowerCase(),is_pass:false,streak:1});
        }
      } else {
        const {data:prof}=await sb.from("profiles").select("id,username").ilike("username",username).maybeSingle();
        if(!prof)return err("username not found.");
        const signupEmail=`${username.toLowerCase()}@rant.void`;
        const {data,error:e}=await sb.auth.signInWithPassword({email:signupEmail,password});
        if(e)return err("wrong username or password.");
        const {data:fullProf}=await sb.from("profiles").select("*").eq("id",data.user.id).single();
        onAuth(data.user,fullProf);
      }
    }finally{setLoad(false);}
  };
  return(
    <div className="auth-screen">
      <div className="auth-glow"/>
      <div className="auth-card">
        <div className="auth-logo">RANT</div>
        <p className="auth-tagline">scream into the void</p>
        <div className="auth-tabs">
          <button className={`atab${mode==="login"?" atab-on":""}`} onClick={()=>{setMode("login");setError("");}}>LOGIN</button>
          <button className={`atab${mode==="signup"?" atab-on":""}`} onClick={()=>{setMode("signup");setError("");}}>SIGN UP</button>
        </div>
        <div className={`auth-form${shake?" shake":""}`}>
          <div className="auth-field"><label className="auth-lbl">USERNAME</label><input className="auth-inp" placeholder="yourname" value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} autoCapitalize="none" autoCorrect="off"/></div>
          {mode==="signup"&&<div className="auth-field"><label className="auth-lbl">EMAIL <span style={{color:"var(--dim)"}}>(optional)</span></label><input className="auth-inp" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} type="email"/></div>}
          <div className="auth-field"><label className="auth-lbl">PASSWORD</label><input className="auth-inp" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} type="password" onKeyDown={e=>e.key==="Enter"&&submit()}/></div>
          {error&&<p className="auth-error">⚠ {error}</p>}
          <button className="auth-submit" onClick={submit} disabled={loading}>{loading?<span className="spinner">◌</span>:mode==="login"?"ENTER THE VOID":"START RANTING"}</button>
        </div>
        <p className="auth-footer">anonymous by default · no judgment here</p>
      </div>
    </div>
  );
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────
async function searchRants(query) {
  if(!query||query.length<2) return [];
  const {data} = await sb.from("rants")
    .select("*, profiles(username,is_pass), reactions(user_id,type)")
    .ilike("text", `%${query}%`)
    .eq("reported", false)
    .is("parent_id", null)
    .order("heat", {ascending:false})
    .limit(20);
  return data||[];
}

async function searchPeople(query) {
  if(!query||query.length<2) return [];
  const {data} = await sb.from("profiles")
    .select("*")
    .ilike("username", `%${query}%`)
    .limit(20);
  return data||[];
}

function SheetHandle(){return<div style={{width:36,height:4,background:"var(--bd)",borderRadius:2,margin:"0 auto 18px",flexShrink:0}}/>;}

// ─── INLINE SEARCH ────────────────────────────────────────────────────────────
function InlineSearch({currentUserId, currentUsername, isPass, followingIds, onFollow, onUnfollow, onReact, onShare, onReport, onBoost}) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("rants");
  const [rantResults, setRantResults] = useState([]);
  const [peopleResults, setPeopleResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(()=>{if(inputRef.current)inputRef.current.focus();},[]);

  useEffect(()=>{
    clearTimeout(debounceRef.current);
    if(query.length<2){setRantResults([]);setPeopleResults([]);return;}
    debounceRef.current=setTimeout(async()=>{
      setLoading(true);
      const [rants,people]=await Promise.all([searchRants(query),searchPeople(query)]);
      setRantResults(rants.map(r=>normalizeRant(r,currentUserId)));
      setPeopleResults(people);
      setLoading(false);
    },500);
    return()=>clearTimeout(debounceRef.current);
  },[query]);

  const cardProps={onReact,onBoost,onReply:()=>{},onReport,onShare,onFollow,onUnfollow,currentUserId,currentUsername,isPass,followingIds};

  return(
    <div className="inline-search">
      {/* SEARCH INPUT */}
      <div className="isearch-input-wrap">
        <span className="isearch-icon">🔍</span>
        <input ref={inputRef} className="isearch-input" placeholder="search the void..." value={query} onChange={e=>setQuery(e.target.value)} autoCapitalize="none" autoCorrect="off"/>
        {query&&<button className="isearch-clear" onClick={()=>setQuery("")}>×</button>}
      </div>

      {/* TABS */}
      <div className="isearch-tabs">
        <button className={`isearch-tab${activeTab==="rants"?" isearch-tab-on":""}`} onClick={()=>setActiveTab("rants")}>🔥 RANTS</button>
        <button className={`isearch-tab${activeTab==="people"?" isearch-tab-on":""}`} onClick={()=>setActiveTab("people")}>👥 PEOPLE</button>
      </div>

      {/* RESULTS */}
      <div className="isearch-results">
        {loading&&(
          <div className="isearch-loading">
            <div className="void-typing"><span className="typing-dot" style={{"--d":"0s"}}/><span className="typing-dot" style={{"--d":".2s"}}/><span className="typing-dot" style={{"--d":".4s"}}/></div>
            <span style={{color:"var(--muted)",fontFamily:"var(--display)",fontSize:11,letterSpacing:2}}>SEARCHING THE VOID</span>
          </div>
        )}
        {!loading&&query.length>=2&&activeTab==="rants"&&(
          rantResults.length===0
            ?<div className="isearch-empty"><span style={{fontSize:36}}>👁</span><p className="isearch-empty-txt">THE VOID HAS NOTHING ON THIS</p></div>
            :<div style={{display:"flex",flexDirection:"column",gap:10}}>{rantResults.map(r=><RantCard key={r.id} rant={r} {...cardProps} depth={0}/>)}</div>
        )}
        {!loading&&query.length>=2&&activeTab==="people"&&(
          peopleResults.length===0
            ?<div className="isearch-empty"><span style={{fontSize:36}}>👁</span><p className="isearch-empty-txt">THE VOID HAS NOTHING ON THIS</p></div>
            :<div style={{display:"flex",flexDirection:"column",gap:8}}>
              {peopleResults.map(p=>(
                <div key={p.id} className="people-result">
                  <div className="people-avatar">{p.username.slice(0,2).toUpperCase()}</div>
                  <div className="people-info">
                    <p className="people-username">@{p.username}</p>
                    <p className="people-meta">{p.follower_count||0} followers{p.is_pass?" · ✦ Pass":""}</p>
                  </div>
                  <FollowButton targetId={p.id} targetUsername={p.username} currentUserId={currentUserId} followingIds={followingIds} onFollow={onFollow} onUnfollow={onUnfollow} small/>
                </div>
              ))}
            </div>
        )}
        {!loading&&query.length<2&&(
          <div className="isearch-hint">
            <span style={{fontSize:36,filter:"drop-shadow(0 0 8px rgba(124,58,237,.4))"}}>👁</span>
            <p className="isearch-hint-title">WHAT ARE YOU LOOKING FOR?</p>
            <p className="isearch-hint-sub">search rants by content · find people by username</p>
          </div>
        )}
      </div>
    </div>
  );
}
export default function App(){
  const [authUser,setAuthUser]=useState(null);
  const [profile,setProfile]=useState(null);
  const [authed,setAuthed]=useState(false);
  const [loading,setLoading]=useState(true);
  const [rants,setRants]=useState([]);
  const [rantsLoading,setRantsLoading]=useState(false);
  const [notifs,setNotifs]=useState([]);
  const unread=useMemo(()=>notifs.filter(n=>n.unread).length,[notifs]);

  const [tab,setTab]=useState("feed");
  const [showSearch,setShowSearch]=useState(false);
  const [followingIds,setFollowingIds]=useState([]);
  const [suggestions,setSuggestions]=useState([]);
  const [catFilter,setCatFilter]=useState("all");
  const [showCompose,setShowCompose]=useState(false);
  const [replyingTo,setReplyingTo]=useState(null);
  const [prefillText,setPrefillText]=useState("");
  const [showPass,setShowPass]=useState(false);
  const [boostTarget,setBoostTarget]=useState(null);
  const [reportTarget,setReportTarget]=useState(null);
  const [shareTarget,setShareTarget]=useState(null);
  const [validationRant,setValidationRant]=useState(null);

  const isFlip=isFlipTheVoidDay();

  // session restore
  useEffect(()=>{
    sb.auth.getSession().then(({data:{session}})=>{
      if(session?.user){
        setAuthUser(session.user);
        sb.from("profiles").select("*").eq("id",session.user.id).single().then(({data})=>{if(data){setProfile(data);setAuthed(true);}});
      }
      setLoading(false);
    });
    const {data:{subscription}}=sb.auth.onAuthStateChange((_,session)=>{if(!session){setAuthUser(null);setProfile(null);setAuthed(false);}});
    return()=>subscription.unsubscribe();
  },[]);

  const loadRants=useCallback(async()=>{
    setRantsLoading(true);
    const data=await fetchRants(catFilter);
    setRants(data.map(r=>normalizeRant(r,authUser?.id)));
    setRantsLoading(false);
  },[catFilter,authUser?.id]);

  useEffect(()=>{if(authed)loadRants();},[authed,catFilter]);

  // load follows
  useEffect(()=>{
    if(!authUser?.id) return;
    fetchFollowing(authUser.id).then(ids=>{
      setFollowingIds(ids);
    });
  },[authUser?.id]);

  // update suggestions when rants or followingIds change
  useEffect(()=>{
    if(!authUser?.id||rants.length===0) return;
    fetchSuggestedRanters(authUser.id, followingIds, rants).then(setSuggestions);
  },[rants.length, followingIds.length, authUser?.id]);

  // real-time
  useEffect(()=>{
    if(!authed)return;
    const ch=sb.channel("rants-live")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"rants"},payload=>{
        if(!payload.new.parent_id){
          const nr=normalizeRant({...payload.new,profiles:{username:"anon",is_pass:false},reactions:[],replies:[]},authUser?.id);
          setRants(prev=>[nr,...prev.filter(r=>r.id!==nr.id)]);
        }
      })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"rants"},payload=>{
        setRants(prev=>prev.map(r=>r.id===payload.new.id?{...r,...normalizeRant({...r,...payload.new},authUser?.id)}:r));
      })
      .subscribe();
    return()=>sb.removeChannel(ch);
  },[authed,authUser?.id]);

  // notifications
  useEffect(()=>{
    if(!authUser?.id)return;
    fetchNotifications(authUser.id).then(setNotifs);
    const ch=sb.channel("notifs-live").on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:`user_id=eq.${authUser.id}`},payload=>{setNotifs(prev=>[payload.new,...prev]);}).subscribe();
    return()=>sb.removeChannel(ch);
  },[authUser?.id]);

  const handleAuth=useCallback((user,prof)=>{setAuthUser(user);setProfile(prof);setAuthed(true);},[]);
  const handleLogout=useCallback(async()=>{await sb.auth.signOut();setAuthUser(null);setProfile(null);setAuthed(false);setRants([]);setTab("feed");},[]);
  const handleActivatePass=useCallback(async()=>{await updateProfile(authUser.id,{is_pass:true});setProfile(p=>({...p,is_pass:true}));setShowPass(false);await pushNotification(authUser.id,"✦","Rant Pass activated!");addCoins(profile.username,100);},[authUser,profile]);

  const handlePost=useCallback(async(data)=>{
    if(!authUser||!profile)return;
    // streak
    const today=todayStr();
    const yesterday=new Date(Date.now()-86400000).toDateString();
    const last=profile.last_rant_date;
    const newStreak=last===yesterday?(profile.streak||1)+1:last===today?(profile.streak||1):1;
    if(newStreak!==profile.streak||last!==today){await updateProfile(authUser.id,{streak:newStreak,last_rant_date:today});setProfile(p=>({...p,streak:newStreak,last_rant_date:today}));}

    const rantRow={author_id:authUser.id,type:data.type,text:data.text||null,category:replyingTo?.category||data.category||"other",is_pass:profile.is_pass||false,parent_id:replyingTo?.id||null,audio_bars:data.audioBars||null,audio_url:data.audioUrl||null,duration:data.duration||null,is_prompt:data.is_prompt||false};
    const inserted=await insertRant(rantRow);
    if(!inserted)return;

    // earn coins
    addCoins(profile.username, COINS_PER_RANT);

    if(replyingTo){
      setRants(prev=>prev.map(r=>r.id===replyingTo.id?{...r,replies:[...r.replies,normalizeRant({...inserted,profiles:{username:profile.username,is_pass:profile.is_pass},reactions:[],replies:[]},authUser.id)]}:r));
      setReplyingTo(null);setPrefillText("");setShowCompose(false);
      await pushNotification(authUser.id,"💬","Your rant back is live! +🪙10 coins earned.");
    } else {
      const nr=normalizeRant({...inserted,profiles:{username:profile.username,is_pass:profile.is_pass},reactions:[],replies:[]},authUser.id);
      setRants(prev=>[nr,...prev]);
      setPrefillText("");setShowCompose(false);
      if(canUseAI(profile.username,profile.is_pass))setValidationRant(nr);
      else await pushNotification(authUser.id,"🎯","Rant posted! +🪙10 coins earned.");
    }
  },[authUser,profile,replyingTo]);

  const handleValidationDone=useCallback(async()=>{
    if(validationRant)await pushNotification(authUser.id,"🎯","Rant released! +🪙10 coins earned.");
    setValidationRant(null);
  },[validationRant,authUser]);

  const handleReact=useCallback(async(rant,reactionType="heat")=>{
    if(!authUser||!profile)return;
    const wasReacted=rant.myReactions?.includes(reactionType);
    if(!wasReacted&&!canReact(profile.username,profile.is_pass)){
      await pushNotification(authUser.id,"⚠️",`Daily reaction limit reached. Upgrade to Rant Pass for unlimited reactions.`);
      return;
    }
    // optimistic
    setRants(prev=>prev.map(r=>{
      const update=(rx)=>{
        const myR=rx.myReactions||[];
        const newMyR=wasReacted?myR.filter(t=>t!==reactionType):[...myR,reactionType];
        const counts={...rx.reactionCounts};
        counts[reactionType]=(counts[reactionType]||0)+(wasReacted?-1:1);
        return{...rx,myReactions:newMyR,reactionCounts:counts,heat:rx.heat+(wasReacted?-1:1),userReacted:newMyR.includes("heat")};
      };
      if(r.id===rant.id)return update(r);
      return{...r,replies:(r.replies||[]).map(rep=>rep.id===rant.id?update(rep):rep)};
    }));
    if(!wasReacted)incReactionCount(profile.username);
    await toggleReaction(rant.id,authUser.id,reactionType,wasReacted);

    // heat milestone notifications + coins
    if(!wasReacted&&rant.author_id!==authUser.id){
      const milestones=[10,50,100,500,1000,5000];
      const newHeat=rant.heat+1;
      milestones.forEach(async m=>{
        if(newHeat>=m&&rant.heat<m){
          await pushNotification(rant.author_id,"🔥",`Your rant hit ${m.toLocaleString()} heat! +🪙${COINS_PER_HEAT_MILESTONE} coins`);
          const {data:ranter}=await sb.from("profiles").select("username").eq("id",rant.author_id).single();
          if(ranter)addCoins(ranter.username,COINS_PER_HEAT_MILESTONE);
        }
      });
    }
  },[authUser,profile]);

  const handleFollow=useCallback(async(targetId,targetUsername)=>{
    if(!authUser) return;
    setFollowingIds(prev=>[...prev,targetId]);
    await followUser(authUser.id, targetId);
    await pushNotification(targetId,"👥",`@${profile?.username} started following you!`);
    await pushNotification(authUser.id,"👥",`You're now following @${targetUsername}`);
  },[authUser,profile]);

  const handleUnfollow=useCallback(async(targetId,targetUsername)=>{
    if(!authUser) return;
    setFollowingIds(prev=>prev.filter(id=>id!==targetId));
    await unfollowUser(authUser.id, targetId);
  },[authUser]);

  const confirmBoost=useCallback(async()=>{
    if(!profile)return;
    if(!profile.is_pass){
      const spent=spendCoins(profile.username,COIN_COST_BOOST);
      if(!spent){setBoostTarget(null);return;}
    }
    await boostRant(boostTarget.id);
    setRants(prev=>prev.map(r=>r.id===boostTarget.id?{...r,boosted:true}:r));
    await pushNotification(authUser.id,"⚡","Rant boosted! Pinned for 1 hour.");
    setBoostTarget(null);
  },[boostTarget,authUser,profile]);

  const confirmReport=useCallback(async()=>{
    await sb.from("reports").insert({rant_id:reportTarget.id,user_id:authUser.id,reason:"reported"});
    await sb.from("rants").update({reported:true}).eq("id",reportTarget.id);
    setRants(prev=>prev.filter(r=>r.id!==reportTarget.id));
    setReportTarget(null);
  },[reportTarget,authUser]);

  // rant of the day — highest heat in last 24h
  const rantOfTheDay=useMemo(()=>{
    const cutoff=Date.now()-86400000;
    return rants.filter(r=>new Date(r.created_at).getTime()>cutoff&&!r.reported).sort((a,b)=>b.heat-a.heat)[0]||null;
  },[rants]);

  const myRants=useMemo(()=>rants.filter(r=>r.author_id===authUser?.id),[rants,authUser]);
  const filtered=useMemo(()=>rants.slice().sort((a,b)=>(b.boosted?1:0)-(a.boosted?1:0)||new Date(b.created_at)-new Date(a.created_at)),[rants]);

  const cardProps={onReact:handleReact,onBoost:setBoostTarget,onReply:r=>{setReplyingTo(r);setPrefillText("");setShowCompose(true);},onReport:setReportTarget,onShare:setShareTarget,onFollow:handleFollow,onUnfollow:handleUnfollow,currentUserId:authUser?.id,currentUsername:profile?.username,isPass:profile?.is_pass||false,followingIds};

  if(loading)return<><CSS/><div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)"}}><div style={{fontFamily:"var(--display)",fontSize:60,background:"linear-gradient(135deg,#ff3b1f,#ff8c00)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>RANT</div></div></>;
  if(!authed)return<><CSS/><AuthScreen onAuth={handleAuth}/></>;
  if(validationRant)return<><CSS/><ValidationScreen rant={validationRant} onDone={handleValidationDone} profile={profile}/></>;

  return(
    <>
      <CSS/>
      <div className="app">
        <header className="header">
          <div className="header-top">
            <div><div className="logo">{isFlip?"💝 RANT":"RANT"}</div><div className="logo-sub">{isFlip?"flip the void sunday":"scream into the void"}</div></div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {(profile?.streak||0)>1&&<div className="header-streak">🔥 {profile.streak}</div>}
              <CoinBadge username={profile?.username||""}/>
              <button className="search-icon-btn" onClick={()=>setShowSearch(s=>!s)}>
                {showSearch?"✕":"🔍"}
              </button>
            </div>
          </div>
          {tab==="feed"&&!showSearch&&(
            <div className="filter-bar">
              {CATS.map(c=><button key={c.id} className={`fbtn${catFilter===c.id?" fbtn-on":""}`} onClick={()=>setCatFilter(c.id)}>{c.emoji} {c.label}</button>)}
            </div>
          )}
        </header>

        <main className="main-content">
          {tab==="feed"&&showSearch&&(
            <InlineSearch currentUserId={authUser?.id} currentUsername={profile?.username} isPass={profile?.is_pass||false} followingIds={followingIds} onFollow={handleFollow} onUnfollow={handleUnfollow} onReact={handleReact} onShare={setShareTarget} onReport={setReportTarget} onBoost={setBoostTarget}/>
          )}
          {tab==="feed"&&!showSearch&&(
            <div className="feed">
              <DailyPrompt onRantAboutIt={t=>{setPrefillText(t);setReplyingTo(null);setShowCompose(true);}} isFlip={isFlip}/>
              <RantOfTheDay rant={rantOfTheDay} onShare={setShareTarget} currentUserId={authUser?.id}/>
              <SuggestedRanters suggestions={suggestions} currentUserId={authUser?.id} followingIds={followingIds} onFollow={handleFollow}/>
              {rantsLoading?<div style={{textAlign:"center",padding:"40px 0",color:"var(--muted)",fontFamily:"var(--display)",letterSpacing:2}}>LOADING THE VOID…</div>
                :filtered.length===0?<div className="empty-state"><span style={{fontSize:48}}>😶</span><p className="empty-txt">NOTHING HERE YET</p><p style={{color:"var(--dim)",fontSize:12,marginTop:4}}>be the first to rant</p></div>
                :filtered.map(r=><RantCard key={r.id} rant={r} {...cardProps}/>)}
            </div>
          )}
          {tab==="following"&&<FollowingFeed rants={rants} followingIds={followingIds} currentUserId={authUser?.id} currentUsername={profile?.username} isPass={profile?.is_pass||false} onFollow={handleFollow} onUnfollow={handleUnfollow} {...cardProps}/>}
          {tab==="trending"&&<TrendingScreen rants={rants} {...cardProps}/>}
          {tab==="notifications"&&<NotificationsScreen notifs={notifs} onClear={async()=>{await sb.from("notifications").delete().eq("user_id",authUser.id);setNotifs([]);}}/>}
          {tab==="profile"&&<ProfileScreen profile={profile} myRants={myRants} onOpenPass={()=>setShowPass(true)} onLogout={handleLogout}/>}
        </main>

        <nav className="bottom-nav">
          {TABS.map(t=>(
            <button key={t.id} className={`nav-btn${tab===t.id?" nav-on":""}`} onClick={async()=>{setTab(t.id);if(t.id==="notifications"){await sb.from("notifications").update({unread:false}).eq("user_id",authUser.id);setNotifs(p=>p.map(n=>({...n,unread:false})));}}}>
              <span className="nav-icon-wrap">{t.icon}{t.id==="notifications"&&unread>0&&<span className="notif-dot">{unread>9?"9+":unread}</span>}</span>
              <span className="nav-lbl">{t.label}</span>
            </button>
          ))}
          <button className="nav-compose" onClick={()=>{setReplyingTo(null);setPrefillText("");setShowCompose(true);}}>
            <span style={{fontSize:22}}>{isFlip?"💝":"💢"}</span>
          </button>
        </nav>

        {showCompose&&<ComposeSheet onClose={()=>{setShowCompose(false);setReplyingTo(null);setPrefillText("");}} onPost={handlePost} profile={profile} onOpenPass={()=>setShowPass(true)} replyingTo={replyingTo} prefillText={prefillText}/>}
        {showPass&&<PassModal onClose={()=>setShowPass(false)} onActivate={handleActivatePass}/>}
        {boostTarget&&<BoostModal rant={boostTarget} onConfirm={confirmBoost} onClose={()=>setBoostTarget(null)} profile={profile}/>}
        {reportTarget&&<ReportModal onConfirm={confirmReport} onClose={()=>setReportTarget(null)}/>}
        {shareTarget&&<ShareCard rant={shareTarget} onClose={()=>setShareTarget(null)}/>}
      </div>
    </>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
function CSS(){return(
  <style>{`
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
    .nav-btn{flex:1;background:none;border:none;color:var(--muted);cursor:pointer;padding:9px 4px 5px;display:flex;flex-direction:column;align-items:center;gap:3p
    .isearch-hint-title{font-family:var(--display);font-size:14px;letter-spacing:2px;color:var(--muted)}
    .isearch-hint-sub{font-size:11px;color:var(--dim);letter-spacing:1px;line-height:1.6}
    .people-result{display:flex;align-items:center;gap:12px;background:var(--s2);border:1px solid var(--bd);border-radius:var(--r);padding:12px}
    .people-avatar{width:40px;height:40px;border-radius:50%;background:var(--bd);display:flex;align-items:center;justify-content:center;font-family:var(--display);font-size:13px;letter-spacing:1px;color:var(--muted);flex-shrink:0}
    .people-info{flex:1}
    .people-username{font-family:var(--display);font-size:14px;letter-spacing:2px;color:var(--text)}
    .people-meta{font-size:10px;color:var(--dim);margin-top:3px;letter-spacing:1px}
    ::-webkit-scrollbar{width:3px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:var(--bd);border-radius:2px}
  `}</style>
);} 