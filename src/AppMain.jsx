import{useState,useEffect,useCallback,useMemo}from"react";
import{sb,CATS,TABS,COINS_PER_RANT,COINS_PER_HEAT_MILESTONE,COIN_COST_BOOST,FREE_VOICE_LIMIT,PASS_VOICE_LIMIT,isFlipTheVoidDay,todayStr,canReact,canUseAI,incReactionCount,addCoins,spendCoins}from"./constants.jsx";
import{AuthScreen,ValidationScreen,RantCard,DailyPrompt,RantOfTheDay,SuggestedRanters,ComposeSheet,PassModal,BoostModal,ReportModal,ShareCard,TrendingScreen,NotificationsScreen,ProfileScreen,FollowingFeed,InlineSearch,CoinBadge,CSS}from"./App.jsx";
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
  },[authUser?.id,profile?.username]);

  const handleUnfollow=useCallback(async(targetId,targetUsername)=>{
    if(!authUser) return;
    setFollowingIds(prev=>prev.filter(id=>id!==targetId));
    await unfollowUser(authUser.id, targetId);
  },[authUser?.id]);

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
