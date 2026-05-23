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

export{sb,CATS,NON_ALL_CATS,TABS,REACTIONS,DAILY_PROMPTS,PASS_PERKS,FREE_REACTIONS_PER_DAY,FREE_VOICE_LIMIT,PASS_VOICE_LIMIT,MAX_CHARS,FREE_AI_PER_DAY,COIN_COST_BOOST,COINS_PER_RANT,COINS_PER_HEAT_MILESTONE,LS,fmt,ago,velocity,randBars,getDailyPrompt,isFlipTheVoidDay,todayStr,getCoins,setCoins,addCoins,spendCoins,getReactionCount,incReactionCount,canReact,getAICount,incAICount,canUseAI,aiRemaining};
