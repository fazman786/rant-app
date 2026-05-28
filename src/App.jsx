import { useState, useEffect } from "react";

/* ═══════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════ */
const C = {
  bg:        "#070C16",
  surf:      "#0D1422",
  surf2:     "#131D30",
  surf3:     "#192240",
  border:    "#1A2840",
  accent:    "#E9A84C",
  accentBg:  "rgba(233,168,76,0.10)",
  text:      "#EDE8DF",
  text2:     "#7B8FA8",
  text3:     "#3A4E64",
  success:   "#3EBF8A",
  danger:    "#E8574A",
  warning:   "#F0A500",
};

const SERIF = "'Cormorant Garamond', Georgia, serif";
const SANS  = "'Plus Jakarta Sans', system-ui, sans-serif";

/* ═══════════════════════════════════════════════════════
   CATEGORIES
═══════════════════════════════════════════════════════ */
const CATS = [
  { id:"debt",       label:"Debt & Bills",        emoji:"💳", color:"#E8574A", hint:"e.g. I've received a final demand letter for £1,200 from a debt collector and I don't know what to do…" },
  { id:"legal",      label:"Legal Letters",        emoji:"⚖️", color:"#8B7EE8", hint:"e.g. I've been served a court claim form and I've never dealt with anything like this before…"         },
  { id:"contract",   label:"Contracts",            emoji:"📋", color:"#E9A84C", hint:"e.g. My landlord wants me to sign a new tenancy agreement with extra clauses I don't understand…"      },
  { id:"tax",        label:"Tax & HMRC",           emoji:"🧾", color:"#3EBF8A", hint:"e.g. I received an HMRC investigation notice and I'm self-employed, I'm worried what happens next…"   },
  { id:"benefits",   label:"Benefits & Housing",   emoji:"🏠", color:"#4BA3E8", hint:"e.g. My Universal Credit has been stopped without any explanation and I'm struggling to pay rent…"    },
  { id:"employment", label:"Employment",           emoji:"💼", color:"#E87B4B", hint:"e.g. My employer is asking me to sign a settlement agreement after they made my role redundant…"      },
];

const FREE_LIMIT = 3;
const MODEL = "claude-sonnet-4-20250514";

/* ═══════════════════════════════════════════════════════
   STORAGE HELPERS  (window.storage — artifact API)
═══════════════════════════════════════════════════════ */
const S = {
  async get(k) {
    try { const r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; }
    catch { return null; }
  },
  async set(k, v) { try { await window.storage.set(k, JSON.stringify(v)); } catch {} },
  async del(k)    { try { await window.storage.delete(k); }               catch {} },
};

const monthKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}`; };

/* ═══════════════════════════════════════════════════════
   CLAUDE API
═══════════════════════════════════════════════════════ */
async function getGuidance(catId, situation) {
  const cat = CATS.find(c => c.id === catId);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      messages: [{
        role: "user",
        content:
`You are Lantern — a calm, clear guide helping people through overwhelming ${cat.label} situations in the UK.
The user's situation: "${situation}"

Respond ONLY with valid JSON (no markdown fences, no preamble), exactly this shape:
{
  "summary": "2–3 sentence plain-English explanation of what this situation means and how serious it is",
  "urgency": "low",
  "urgencyText": "one short sentence about why this urgency level applies",
  "actionSteps": ["step 1", "step 2", "step 3", "step 4"],
  "professionalQuestions": ["question 1", "question 2", "question 3"],
  "commonMistakes": ["mistake 1", "mistake 2", "mistake 3"],
  "encouragement": "one warm empowering sentence to help the user feel capable of handling this"
}
urgency must be exactly one of: "low" | "medium" | "high"`
      }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const d = await res.json();
  const raw = d.content.map(b => b.text || "").join("").replace(/```json|```/g, "").trim();
  return JSON.parse(raw);
}

/* ═══════════════════════════════════════════════════════
   LANTERN SVG ICON
═══════════════════════════════════════════════════════ */
function Lantern({ size = 48, glow = false }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {glow && (
        <div style={{
          position: "absolute",
          inset: -size * 0.35,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(233,168,76,0.22) 0%, transparent 68%)",
          animation: "pulse 2.4s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      )}
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Top hook */}
        <path d="M24 6 L24 12" stroke="#E9A84C" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M21 8.5 C21 7 22 6 24 6 C26 6 27 7 27 8.5" stroke="#E9A84C" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        {/* Top cap */}
        <path d="M17 14 Q24 11 31 14" stroke="#E9A84C" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        {/* Body frame */}
        <rect x="15" y="14" width="18" height="22" rx="3" fill="rgba(233,168,76,0.07)" stroke="#E9A84C" strokeWidth="1.4"/>
        {/* Vertical bars */}
        <line x1="15" y1="21" x2="15" y2="29" stroke="#E9A84C" strokeWidth="1" opacity="0.45"/>
        <line x1="33" y1="21" x2="33" y2="29" stroke="#E9A84C" strokeWidth="1" opacity="0.45"/>
        {/* Cross bar */}
        <line x1="15" y1="25" x2="33" y2="25" stroke="#E9A84C" strokeWidth="0.6" opacity="0.2"/>
        {/* Flame outer */}
        <ellipse cx="24" cy="26" rx="4.5" ry="6" fill="rgba(233,168,76,0.45)"/>
        {/* Flame mid */}
        <ellipse cx="24" cy="24.5" rx="2.8" ry="4" fill="rgba(255,220,140,0.75)"/>
        {/* Flame core */}
        <ellipse cx="24" cy="23" rx="1.4" ry="2.2" fill="rgba(255,250,230,0.92)"/>
        {/* Bottom cap */}
        <path d="M17 36 Q24 39 31 36" stroke="#E9A84C" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6"/>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ACCORDION
═══════════════════════════════════════════════════════ */
function Accordion({ title, emoji, items, color }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: C.surf, border: `1px solid ${C.border}`,
      borderRadius: 14, overflow: "hidden", marginBottom: 10,
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "16px 18px",
          background: "none", border: "none", cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>{emoji}</span>
          <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.text }}>{title}</span>
        </div>
        <span style={{
          color: C.text2, fontSize: 16,
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.25s ease", display: "inline-block",
        }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: "0 18px 16px", borderTop: `1px solid ${C.border}` }}>
          {items.map((item, i) => (
            <div key={i} style={{
              display: "flex", gap: 12, padding: "10px 0",
              borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: color + "22", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color }}>{i + 1}</span>
              </div>
              <span style={{ fontFamily: SANS, fontSize: 14, color: C.text, lineHeight: 1.65 }}>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   URGENCY HELPERS
═══════════════════════════════════════════════════════ */
function urgencyColor(u) {
  return u === "high" ? C.danger : u === "medium" ? C.warning : C.success;
}
function urgencyEmoji(u) {
  return u === "high" ? "🔴" : u === "medium" ? "🟡" : "🟢";
}

/* ═══════════════════════════════════════════════════════
   SPLASH SCREEN
═══════════════════════════════════════════════════════ */
function SplashScreen({ onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", inset: 0, background: C.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 22,
      animation: "fadeIn 0.6s ease",
    }}>
      <Lantern size={88} glow />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: SERIF, fontSize: 40, color: C.accent, letterSpacing: 3, fontWeight: 600 }}>
          Lantern
        </div>
        <div style={{ fontFamily: SANS, fontSize: 13, color: C.text2, marginTop: 6, letterSpacing: 0.5 }}>
          Your guide through the overwhelming
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: "50%", background: C.accent,
            animation: `dotPulse 1.4s ease-in-out ${i * 0.22}s infinite`,
            opacity: 0.7,
          }}/>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ONBOARDING
═══════════════════════════════════════════════════════ */
const OB_SLIDES = [
  {
    visual: <Lantern size={80} glow />,
    title: "Light in the dark",
    body: "Lantern turns confusing legal, financial, and employment situations into clear, calm guidance you can actually act on.",
  },
  {
    visual: (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {CATS.map(c => (
          <div key={c.id} style={{
            background: C.surf, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "10px 8px", textAlign: "center",
          }}>
            <div style={{ fontSize: 22 }}>{c.emoji}</div>
            <div style={{ fontFamily: SANS, fontSize: 10, color: C.text2, marginTop: 4, lineHeight: 1.3 }}>
              {c.label}
            </div>
          </div>
        ))}
      </div>
    ),
    title: "Six situations covered",
    body: "Debt · Legal · Contracts · Tax · Benefits · Employment. Plain English every time, no jargon.",
  },
  {
    visual: (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 72, lineHeight: 1 }}>🔓</div>
        <div style={{
          fontFamily: SANS, fontSize: 28, fontWeight: 700, color: C.accent,
          marginTop: 12, letterSpacing: -0.5,
        }}>Free to start</div>
      </div>
    ),
    title: "Start free today",
    body: "3 free guidance sessions every month. Upgrade to Pro for unlimited access at just £6.99/month.",
  },
];

function OnboardingScreen({ onDone }) {
  const [slide, setSlide] = useState(0);
  const last = slide === OB_SLIDES.length - 1;
  const s = OB_SLIDES[slide];

  return (
    <div style={{
      position: "fixed", inset: 0, background: C.bg,
      display: "flex", flexDirection: "column",
      padding: "0 0 48px",
    }}>
      {/* Skip */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "56px 24px 0" }}>
        <button onClick={onDone} style={{
          background: "none", border: "none", color: C.text2,
          fontFamily: SANS, fontSize: 14, cursor: "pointer", padding: 4,
        }}>Skip</button>
      </div>

      {/* Slide content */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 32px", gap: 32, textAlign: "center",
        animation: "slideUp 0.35s ease",
        key: slide,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 140 }}>
          {s.visual}
        </div>
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 32, color: C.text, lineHeight: 1.15, marginBottom: 14, fontWeight: 600 }}>
            {s.title}
          </div>
          <div style={{ fontFamily: SANS, fontSize: 15, color: C.text2, lineHeight: 1.75, maxWidth: 290 }}>
            {s.body}
          </div>
        </div>
      </div>

      {/* Dots */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 28 }}>
        {OB_SLIDES.map((_, i) => (
          <div key={i} style={{
            height: 6, borderRadius: 3,
            width: i === slide ? 24 : 6,
            background: i === slide ? C.accent : C.text3,
            transition: "all 0.3s ease",
          }}/>
        ))}
      </div>

      {/* CTA */}
      <div style={{ padding: "0 24px" }}>
        <button
          onClick={last ? onDone : () => setSlide(s => s + 1)}
          style={{
            width: "100%", padding: "17px 0", borderRadius: 16,
            background: C.accent, border: "none", cursor: "pointer",
            fontFamily: SANS, fontSize: 16, fontWeight: 700, color: "#1A0E00",
            boxShadow: "0 4px 24px rgba(233,168,76,0.3)",
          }}
        >
          {last ? "Get Started →" : "Next →"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   BOTTOM NAV
═══════════════════════════════════════════════════════ */
function BottomNav({ tab, setTab }) {
  const items = [
    { id: "home",     emoji: "🏮", label: "Home"     },
    { id: "history",  emoji: "📖", label: "History"  },
    { id: "settings", emoji: "⚙️",  label: "Settings" },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: C.surf, borderTop: `1px solid ${C.border}`,
      display: "flex", padding: "8px 0 26px", zIndex: 200,
    }}>
      {items.map(it => (
        <button key={it.id} onClick={() => setTab(it.id)} style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", gap: 3,
          background: "none", border: "none", cursor: "pointer", padding: "4px 0",
        }}>
          <span style={{ fontSize: 22 }}>{it.emoji}</span>
          <span style={{
            fontFamily: SANS, fontSize: 10, fontWeight: 600, letterSpacing: 0.3,
            color: tab === it.id ? C.accent : C.text3,
            transition: "color 0.2s",
          }}>{it.label}</span>
          {tab === it.id && (
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.accent, marginTop: 1 }}/>
          )}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   HOME TAB
═══════════════════════════════════════════════════════ */
function HomeTab({ usage, onSelectCat, history, onHistItem }) {
  const used  = usage.count;
  const left  = Math.max(0, FREE_LIMIT - used);
  const pct   = Math.min((used / FREE_LIMIT) * 100, 100);

  return (
    <div style={{ padding: "0 20px 140px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 56, paddingBottom: 28 }}>
        <Lantern size={40} glow />
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 30, color: C.accent, letterSpacing: 2, fontWeight: 600 }}>
            Lantern
          </div>
          <div style={{ fontFamily: SANS, fontSize: 12, color: C.text2 }}>
            Your guide through the overwhelming
          </div>
        </div>
      </div>

      {/* Usage pill */}
      <div style={{
        background: C.surf, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: "16px 18px", marginBottom: 28,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontFamily: SANS, fontSize: 13, color: C.text2 }}>Free sessions this month</span>
          <span style={{
            fontFamily: SANS, fontSize: 13, fontWeight: 700,
            color: left === 0 ? C.danger : C.accent,
          }}>{used}/{FREE_LIMIT}</span>
        </div>
        <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 3, transition: "width 0.6s ease",
            width: `${pct}%`,
            background: left === 0
              ? C.danger
              : `linear-gradient(90deg, ${C.accent}, #F5C26B)`,
          }}/>
        </div>
        {left === 0 ? (
          <div style={{
            fontFamily: SANS, fontSize: 12, color: C.danger,
            marginTop: 10, lineHeight: 1.5,
          }}>
            Monthly limit reached — upgrade to Pro for unlimited access
          </div>
        ) : (
          <div style={{ fontFamily: SANS, fontSize: 12, color: C.text3, marginTop: 8 }}>
            {left} session{left !== 1 ? "s" : ""} remaining · resets next month
          </div>
        )}
      </div>

      {/* Category heading */}
      <div style={{ fontFamily: SERIF, fontSize: 22, color: C.text, marginBottom: 14, fontWeight: 400 }}>
        What's your situation?
      </div>

      {/* Category grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
        {CATS.map(cat => (
          <button
            key={cat.id}
            onClick={() => onSelectCat(cat.id)}
            style={{
              background: C.surf, border: `1px solid ${C.border}`,
              borderRadius: 16, padding: "18px 16px",
              cursor: "pointer", textAlign: "left",
              transition: "border-color 0.2s, background 0.2s",
              display: "flex", flexDirection: "column", gap: 8,
            }}
            onPointerDown={e => {
              e.currentTarget.style.background = C.surf2;
              e.currentTarget.style.borderColor = cat.color + "60";
            }}
            onPointerUp={e => {
              e.currentTarget.style.background = C.surf;
              e.currentTarget.style.borderColor = C.border;
            }}
          >
            <span style={{ fontSize: 28 }}>{cat.emoji}</span>
            <span style={{
              fontFamily: SANS, fontSize: 13, fontWeight: 600,
              color: C.text, lineHeight: 1.35,
            }}>{cat.label}</span>
            <div style={{
              width: 30, height: 3, borderRadius: 2,
              background: cat.color, opacity: 0.75,
            }}/>
          </button>
        ))}
      </div>

      {/* Recent history */}
      {history.length > 0 && (
        <div>
          <div style={{ fontFamily: SERIF, fontSize: 20, color: C.text, marginBottom: 14 }}>
            Recent
          </div>
          {history.slice(0, 3).map(item => {
            const cat = CATS.find(c => c.id === item.catId);
            const uc = urgencyColor(item.result.urgency);
            const date = new Date(item.savedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
            return (
              <div
                key={item.id}
                onClick={() => onHistItem(item)}
                style={{
                  background: C.surf, border: `1px solid ${C.border}`,
                  borderLeft: `3px solid ${cat?.color || C.border}`,
                  borderRadius: 12, padding: "14px 16px",
                  marginBottom: 10, cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: SANS, fontSize: 12, color: C.text2 }}>
                    {cat?.emoji} {cat?.label}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontFamily: SANS, fontSize: 10, fontWeight: 700,
                      color: uc, textTransform: "uppercase", letterSpacing: 0.5,
                    }}>{item.result.urgency}</span>
                    <span style={{ fontFamily: SANS, fontSize: 11, color: C.text3 }}>{date}</span>
                  </div>
                </div>
                <div style={{ fontFamily: SANS, fontSize: 13, color: C.text, lineHeight: 1.5 }}>
                  {item.situation.substring(0, 85)}{item.situation.length > 85 ? "…" : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CHAT SCREEN
═══════════════════════════════════════════════════════ */
function ChatScreen({ catId, usage, onBack, onResult, onPaywall }) {
  const cat = CATS.find(c => c.id === catId);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const MAX = 1000;
  const MIN = 20;

  async function handleSubmit() {
    if (text.trim().length < MIN) {
      setError(`Please describe your situation in at least ${MIN} characters so Lantern can help properly.`);
      return;
    }
    if (usage.count >= FREE_LIMIT) {
      onPaywall();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getGuidance(catId, text.trim());
      onResult(result, text.trim());
    } catch (e) {
      setError("Something went wrong. Please check your connection and try again.");
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: C.bg,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 24, padding: 40,
      }}>
        <Lantern size={80} glow />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: SERIF, fontSize: 24, color: C.text, marginBottom: 10 }}>
            Reading your situation…
          </div>
          <div style={{ fontFamily: SANS, fontSize: 14, color: C.text2, lineHeight: 1.65, maxWidth: 260 }}>
            Lantern is carefully working through what you've shared to give you the clearest guidance possible.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 9, height: 9, borderRadius: "50%", background: C.accent,
              animation: `dotPulse 1.3s ease-in-out ${i * 0.22}s infinite`,
            }}/>
          ))}
        </div>
      </div>
    );
  }

  const canSubmit = text.trim().length >= MIN;

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "54px 20px 18px",
        borderBottom: `1px solid ${C.border}`, background: C.surf,
      }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", color: C.text2,
          fontSize: 22, cursor: "pointer", padding: "4px 8px 4px 0",
        }}>←</button>
        <span style={{ fontSize: 24 }}>{cat.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: C.text }}>{cat.label}</div>
          <div style={{ fontFamily: SANS, fontSize: 11, color: C.text2 }}>Describe your situation</div>
        </div>
        <div style={{
          fontFamily: SANS, fontSize: 12, fontWeight: 700,
          color: usage.count >= FREE_LIMIT ? C.danger : C.text2,
          background: C.surf2, borderRadius: 8, padding: "4px 10px",
        }}>
          {FREE_LIMIT - usage.count} left
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "22px 20px 0" }}>
        <div style={{ fontFamily: SANS, fontSize: 14, color: C.text2, lineHeight: 1.7, marginBottom: 16 }}>
          Tell me what's happening. Don't worry about using the right words — just describe the situation as you understand it.
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value.slice(0, MAX))}
          placeholder={cat.hint}
          style={{
            width: "100%", minHeight: 210,
            background: C.surf, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: "16px", color: C.text,
            fontFamily: SANS, fontSize: 15, lineHeight: 1.65,
            resize: "none", boxSizing: "border-box", outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={e => e.target.style.borderColor = C.accent}
          onBlur={e => e.target.style.borderColor = C.border}
        />

        <div style={{
          display: "flex", justifyContent: "space-between",
          padding: "8px 2px", marginBottom: 16,
        }}>
          <span style={{ fontFamily: SANS, fontSize: 12, color: canSubmit ? C.success : C.text3 }}>
            {canSubmit ? "✓ Looks good" : `${MIN - text.trim().length} more characters needed`}
          </span>
          <span style={{ fontFamily: SANS, fontSize: 12, color: C.text3 }}>
            {text.length}/{MAX}
          </span>
        </div>

        {error && (
          <div style={{
            background: "rgba(232,87,74,0.1)", border: `1px solid rgba(232,87,74,0.4)`,
            borderRadius: 12, padding: "13px 16px", marginBottom: 16,
            fontFamily: SANS, fontSize: 13, color: C.danger, lineHeight: 1.5,
          }}>{error}</div>
        )}

        <div style={{
          background: C.surf, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: "12px 14px", marginBottom: 28,
          display: "flex", gap: 10, alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
          <span style={{ fontFamily: SANS, fontSize: 12, color: C.text3, lineHeight: 1.6 }}>
            Lantern provides educational guidance only — not legal or financial advice. For complex situations, always consult a qualified professional.
          </span>
        </div>
      </div>

      {/* Submit */}
      <div style={{ padding: "16px 20px 40px", background: C.surf, borderTop: `1px solid ${C.border}` }}>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: "100%", padding: "17px 0", borderRadius: 16, border: "none",
            cursor: canSubmit ? "pointer" : "not-allowed",
            background: canSubmit
              ? `linear-gradient(135deg, ${C.accent}, #F5C26B)`
              : C.surf2,
            fontFamily: SANS, fontSize: 16, fontWeight: 700,
            color: canSubmit ? "#1A0E00" : C.text3,
            boxShadow: canSubmit ? "0 4px 20px rgba(233,168,76,0.3)" : "none",
            transition: "all 0.2s",
          }}
        >
          Get Guidance 🔦
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   RESULT SCREEN
═══════════════════════════════════════════════════════ */
function ResultScreen({ catId, situation, result, onBack, onSave, saved }) {
  const cat = CATS.find(c => c.id === catId);
  const uc = urgencyColor(result.urgency);

  function copyAll() {
    const lines = [
      `LANTERN GUIDANCE — ${cat.label}`,
      ``,
      `Situation: ${situation}`,
      ``,
      `Summary:`,
      result.summary,
      ``,
      `Urgency: ${result.urgency.toUpperCase()} — ${result.urgencyText}`,
      ``,
      `What to do next:`,
      ...result.actionSteps.map((s, i) => `  ${i + 1}. ${s}`),
      ``,
      `Questions for a professional:`,
      ...result.professionalQuestions.map((q, i) => `  ${i + 1}. ${q}`),
      ``,
      `Common mistakes to avoid:`,
      ...result.commonMistakes.map((m, i) => `  ${i + 1}. ${m}`),
      ``,
      result.encouragement,
      ``,
      `— Lantern provides educational guidance only, not legal or financial advice.`,
    ].join("\n");
    navigator.clipboard.writeText(lines).catch(() => {});
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* Sticky header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "54px 20px 16px",
        borderBottom: `1px solid ${C.border}`, background: C.surf,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", color: C.text2,
          fontSize: 22, cursor: "pointer", padding: "4px 8px 4px 0",
        }}>←</button>
        <span style={{ fontSize: 20 }}>{cat.emoji}</span>
        <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: C.text, flex: 1 }}>
          {cat.label}
        </span>
        <button onClick={copyAll} style={{
          background: C.surf2, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "7px 13px",
          color: C.text2, fontFamily: SANS, fontSize: 12, cursor: "pointer",
        }}>Copy all</button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "22px 20px 140px" }}>
        {/* Urgency badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: uc + "1A", border: `1px solid ${uc}55`,
          borderRadius: 20, padding: "7px 16px", marginBottom: 8,
        }}>
          <span>{urgencyEmoji(result.urgency)}</span>
          <span style={{
            fontFamily: SANS, fontSize: 12, fontWeight: 700,
            color: uc, textTransform: "uppercase", letterSpacing: 0.8,
          }}>{result.urgency} urgency</span>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 13, color: C.text2, marginBottom: 22, lineHeight: 1.5 }}>
          {result.urgencyText}
        </div>

        {/* Summary card */}
        <div style={{
          background: C.surf,
          border: `1px solid ${C.border}`,
          borderLeft: `4px solid ${cat.color}`,
          borderRadius: 14, padding: "20px", marginBottom: 20,
        }}>
          <div style={{ fontFamily: SERIF, fontSize: 19, color: C.text, marginBottom: 10, fontWeight: 600 }}>
            What this means
          </div>
          <div style={{ fontFamily: SANS, fontSize: 14, color: C.text, lineHeight: 1.75 }}>
            {result.summary}
          </div>
        </div>

        {/* Accordions */}
        <Accordion title="What to do next"               emoji="✅" items={result.actionSteps}          color={cat.color} />
        <Accordion title="Questions for a professional"  emoji="🗣️" items={result.professionalQuestions} color={cat.color} />
        <Accordion title="Common mistakes to avoid"      emoji="⚠️" items={result.commonMistakes}        color={cat.color} />

        {/* Encouragement */}
        <div style={{
          background: C.accentBg, border: `1px solid rgba(233,168,76,0.3)`,
          borderRadius: 14, padding: "22px", marginBottom: 20,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center",
        }}>
          <Lantern size={36} glow />
          <div style={{ fontFamily: SERIF, fontSize: 17, color: C.accent, lineHeight: 1.65, fontStyle: "italic" }}>
            "{result.encouragement}"
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{
          fontFamily: SANS, fontSize: 11, color: C.text3,
          lineHeight: 1.65, textAlign: "center", marginBottom: 20,
        }}>
          Lantern provides educational guidance only — not legal or financial advice.
          Always consult a qualified professional for your specific situation.
        </div>

        {/* Save button */}
        <button
          onClick={onSave}
          disabled={saved}
          style={{
            width: "100%", padding: "17px 0", borderRadius: 16, border: "none",
            cursor: saved ? "default" : "pointer",
            background: saved ? C.surf2 : C.accent,
            fontFamily: SANS, fontSize: 15, fontWeight: 700,
            color: saved ? C.text2 : "#1A0E00",
            transition: "all 0.2s",
          }}
        >
          {saved ? "✓ Saved to history" : "Save to history"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAYWALL SCREEN
═══════════════════════════════════════════════════════ */
function PaywallScreen({ onBack }) {
  const rows = [
    { label: "Sessions per month",   free: "3",    pro: "Unlimited" },
    { label: "All 6 categories",     free: "✓",    pro: "✓"         },
    { label: "Save to history",      free: "✓",    pro: "✓"         },
    { label: "Priority guidance",    free: "✗",    pro: "✓"         },
    { label: "Offline access",       free: "✗",    pro: "✓"         },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        padding: "54px 20px 18px",
        borderBottom: `1px solid ${C.border}`, background: C.surf,
      }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", color: C.text2, fontSize: 22, cursor: "pointer",
        }}>←</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px 60px", textAlign: "center" }}>
        <Lantern size={72} glow />

        <div style={{ fontFamily: SERIF, fontSize: 34, color: C.accent, margin: "20px 0 8px", fontWeight: 600 }}>
          Upgrade to Pro
        </div>
        <div style={{ fontFamily: SANS, fontSize: 14, color: C.text2, lineHeight: 1.75, maxWidth: 280, margin: "0 auto 32px" }}>
          You've used your 3 free sessions this month. Upgrade for unlimited guidance whenever you need it.
        </div>

        {/* Comparison table */}
        <div style={{
          background: C.surf, border: `1px solid ${C.border}`,
          borderRadius: 16, overflow: "hidden", marginBottom: 28, textAlign: "left",
        }}>
          {/* Column headers */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 80px 80px",
            padding: "12px 18px", background: C.surf2,
            borderBottom: `1px solid ${C.border}`,
          }}>
            <span style={{ fontFamily: SANS, fontSize: 12, color: C.text3 }}>Feature</span>
            <span style={{ fontFamily: SANS, fontSize: 12, color: C.text3, textAlign: "center" }}>Free</span>
            <span style={{ fontFamily: SANS, fontSize: 12, color: C.accent, textAlign: "center", fontWeight: 700 }}>Pro</span>
          </div>
          {rows.map((row, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1fr 80px 80px",
              padding: "13px 18px",
              borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <span style={{ fontFamily: SANS, fontSize: 13, color: C.text }}>{row.label}</span>
              <span style={{
                fontFamily: SANS, fontSize: 13,
                color: row.free === "✗" ? C.text3 : C.text2,
                textAlign: "center",
              }}>{row.free}</span>
              <span style={{
                fontFamily: SANS, fontSize: 13,
                color: C.accent, fontWeight: 700, textAlign: "center",
              }}>{row.pro}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => alert("Payment integration coming soon!\nLantern Pro will be £6.99/month.")}
          style={{
            width: "100%", padding: "19px 0", borderRadius: 16, border: "none", cursor: "pointer",
            background: `linear-gradient(135deg, ${C.accent}, #F5C26B)`,
            fontFamily: SANS, fontSize: 17, fontWeight: 700, color: "#1A0E00",
            boxShadow: "0 6px 28px rgba(233,168,76,0.35)",
            marginBottom: 12,
          }}
        >
          Upgrade to Pro — £6.99/month
        </button>
        <div style={{ fontFamily: SANS, fontSize: 12, color: C.text3 }}>
          Cancel anytime · Secure payment · Instant access
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   HISTORY TAB
═══════════════════════════════════════════════════════ */
function HistoryTab({ history, onItem, onDelete, onClear }) {
  if (history.length === 0) {
    return (
      <div style={{
        minHeight: "80vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16, padding: 40,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 56 }}>📖</div>
        <div style={{ fontFamily: SERIF, fontSize: 24, color: C.text2, fontWeight: 400 }}>No history yet</div>
        <div style={{ fontFamily: SANS, fontSize: 14, color: C.text3, lineHeight: 1.7, maxWidth: 260 }}>
          Save guidance sessions and they'll appear here for easy reference whenever you need them.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 20px 140px" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingTop: 56, paddingBottom: 22,
      }}>
        <div style={{ fontFamily: SERIF, fontSize: 28, color: C.text, fontWeight: 400 }}>History</div>
        <button onClick={() => { if (window.confirm("Delete all saved history?")) onClear(); }} style={{
          background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "6px 12px", color: C.text3, fontFamily: SANS, fontSize: 12, cursor: "pointer",
        }}>Clear all</button>
      </div>

      {history.map(item => {
        const cat = CATS.find(c => c.id === item.catId);
        const uc = urgencyColor(item.result.urgency);
        const date = new Date(item.savedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
        return (
          <div
            key={item.id}
            style={{
              background: C.surf, border: `1px solid ${C.border}`,
              borderLeft: `3px solid ${cat?.color || C.border}`,
              borderRadius: 12, padding: "14px 16px",
              marginBottom: 10, display: "flex", alignItems: "flex-start", gap: 12,
            }}
          >
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => onItem(item)}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: SANS, fontSize: 12, color: C.text2 }}>
                  {cat?.emoji} {cat?.label}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontFamily: SANS, fontSize: 10, fontWeight: 700,
                    color: uc, textTransform: "uppercase",
                  }}>{item.result.urgency}</span>
                  <span style={{ fontFamily: SANS, fontSize: 11, color: C.text3 }}>{date}</span>
                </div>
              </div>
              <div style={{ fontFamily: SANS, fontSize: 13, color: C.text, lineHeight: 1.5 }}>
                {item.situation.substring(0, 95)}{item.situation.length > 95 ? "…" : ""}
              </div>
            </div>
            <button
              onClick={() => onDelete(item.id)}
              style={{
                background: "none", border: "none", color: C.text3,
                fontSize: 20, cursor: "pointer", padding: "0 2px",
                flexShrink: 0, lineHeight: 1,
              }}
            >×</button>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   HISTORY DETAIL OVERLAY
═══════════════════════════════════════════════════════ */
function HistoryDetail({ item, onBack, onDelete }) {
  const cat = CATS.find(c => c.id === item.catId);
  const uc = urgencyColor(item.result.urgency);
  const date = new Date(item.savedAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "54px 20px 16px",
        borderBottom: `1px solid ${C.border}`, background: C.surf,
      }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", color: C.text2,
          fontSize: 22, cursor: "pointer", padding: "4px 8px 4px 0",
        }}>←</button>
        <span style={{ fontSize: 20 }}>{cat?.emoji}</span>
        <span style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: C.text, flex: 1 }}>
          {cat?.label}
        </span>
        <button onClick={() => { onDelete(item.id); onBack(); }} style={{
          background: "none", border: `1px solid rgba(232,87,74,0.4)`, borderRadius: 8,
          padding: "6px 11px", color: C.danger, fontFamily: SANS, fontSize: 12, cursor: "pointer",
        }}>Delete</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "22px 20px 80px" }}>
        {/* Date + situation */}
        <div style={{ fontFamily: SANS, fontSize: 11, color: C.text3, marginBottom: 10 }}>{date}</div>
        <div style={{
          background: C.surf, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: "14px 16px", marginBottom: 20,
        }}>
          <div style={{ fontFamily: SANS, fontSize: 11, color: C.text3, marginBottom: 6 }}>Situation described</div>
          <div style={{ fontFamily: SANS, fontSize: 14, color: C.text, lineHeight: 1.65 }}>{item.situation}</div>
        </div>

        {/* Urgency badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: uc + "1A", border: `1px solid ${uc}55`,
          borderRadius: 20, padding: "7px 16px", marginBottom: 8,
        }}>
          <span>{urgencyEmoji(item.result.urgency)}</span>
          <span style={{
            fontFamily: SANS, fontSize: 12, fontWeight: 700,
            color: uc, textTransform: "uppercase", letterSpacing: 0.8,
          }}>{item.result.urgency} urgency</span>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 13, color: C.text2, marginBottom: 22, lineHeight: 1.5 }}>
          {item.result.urgencyText}
        </div>

        {/* Summary */}
        <div style={{
          background: C.surf, border: `1px solid ${C.border}`,
          borderLeft: `4px solid ${cat?.color || C.border}`,
          borderRadius: 14, padding: "20px", marginBottom: 20,
        }}>
          <div style={{ fontFamily: SERIF, fontSize: 19, color: C.text, marginBottom: 10, fontWeight: 600 }}>
            What this means
          </div>
          <div style={{ fontFamily: SANS, fontSize: 14, color: C.text, lineHeight: 1.75 }}>
            {item.result.summary}
          </div>
        </div>

        <Accordion title="What to do next"              emoji="✅" items={item.result.actionSteps}          color={cat?.color || C.accent} />
        <Accordion title="Questions for a professional" emoji="🗣️" items={item.result.professionalQuestions} color={cat?.color || C.accent} />
        <Accordion title="Common mistakes to avoid"     emoji="⚠️" items={item.result.commonMistakes}        color={cat?.color || C.accent} />

        <div style={{
          background: C.accentBg, border: `1px solid rgba(233,168,76,0.3)`,
          borderRadius: 14, padding: "20px", textAlign: "center",
        }}>
          <div style={{ fontFamily: SERIF, fontSize: 16, color: C.accent, lineHeight: 1.7, fontStyle: "italic" }}>
            "{item.result.encouragement}"
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SETTINGS TAB
═══════════════════════════════════════════════════════ */
function SettingsTab({ usage, onClearHistory, onResetUsage }) {
  const used = usage.count;
  const left = Math.max(0, FREE_LIMIT - used);
  const pct  = Math.min((used / FREE_LIMIT) * 100, 100);

  const rows = [
    { label: "Rate Lantern ⭐",     action: () => alert("App store rating coming soon — thank you!"),                                     color: C.text  },
    { label: "Privacy Policy",       action: () => alert("Privacy policy URL coming soon."),                                               color: C.text  },
    { label: "Terms of Service",     action: () => alert("Terms of service URL coming soon."),                                             color: C.text  },
    { label: "Contact Support",      action: () => alert("Support contact coming soon."),                                                  color: C.text  },
    { label: "Clear all history",    action: () => { if (window.confirm("Delete all saved history? This can't be undone.")) onClearHistory(); }, color: C.danger },
    { label: "Reset usage counter",  action: () => { if (window.confirm("Reset monthly usage count? (Testing only)")) onResetUsage(); },  color: C.text3 },
  ];

  return (
    <div style={{ padding: "0 20px 140px" }}>
      <div style={{ fontFamily: SERIF, fontSize: 28, color: C.text, paddingTop: 56, paddingBottom: 24, fontWeight: 400 }}>
        Settings
      </div>

      {/* Usage card */}
      <div style={{
        background: C.surf, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: "18px 18px", marginBottom: 20,
      }}>
        <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 14 }}>
          This month's usage
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontFamily: SANS, fontSize: 13, color: C.text2 }}>Free sessions used</span>
          <span style={{
            fontFamily: SANS, fontSize: 13, fontWeight: 700,
            color: left === 0 ? C.danger : C.accent,
          }}>{used}/{FREE_LIMIT}</span>
        </div>
        <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
          <div style={{
            height: "100%", borderRadius: 3, transition: "width 0.5s ease",
            width: `${pct}%`,
            background: left === 0 ? C.danger : `linear-gradient(90deg, ${C.accent}, #F5C26B)`,
          }}/>
        </div>
        {left === 0 ? (
          <button
            onClick={() => alert("Payment integration coming soon!\nLantern Pro — £6.99/month.")}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 10,
              background: C.accent, border: "none", cursor: "pointer",
              fontFamily: SANS, fontSize: 14, fontWeight: 700, color: "#1A0E00",
            }}
          >
            Upgrade to Pro — £6.99/month
          </button>
        ) : (
          <div style={{ fontFamily: SANS, fontSize: 12, color: C.text3 }}>
            {left} session{left !== 1 ? "s" : ""} remaining · resets next month
          </div>
        )}
      </div>

      {/* Action rows */}
      {rows.map((row, i) => (
        <div
          key={i}
          onClick={row.action}
          style={{
            background: C.surf, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "16px 18px", marginBottom: 10,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            cursor: "pointer",
          }}
        >
          <span style={{ fontFamily: SANS, fontSize: 14, color: row.color }}>{row.label}</span>
          <span style={{ color: C.text3, fontSize: 18 }}>›</span>
        </div>
      ))}

      <div style={{
        fontFamily: SANS, fontSize: 12, color: C.text3,
        textAlign: "center", marginTop: 28, lineHeight: 1.7,
      }}>
        Lantern v1.0.0{"\n"}
        Educational guidance only — not legal or financial advice
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════ */
export default function App() {
  const [ready,       setReady]       = useState(false);
  const [showSplash,  setShowSplash]  = useState(true);
  const [onboarded,   setOnboarded]   = useState(false);
  const [tab,         setTab]         = useState("home");
  const [overlay,     setOverlay]     = useState(null);   // 'chat' | 'result' | 'paywall' | 'hist-detail'
  const [selCat,      setSelCat]      = useState(null);
  const [situation,   setSituation]   = useState("");
  const [result,      setResult]      = useState(null);
  const [resultSaved, setResultSaved] = useState(false);
  const [usage,       setUsage]       = useState({ month: "", count: 0 });
  const [history,     setHistory]     = useState([]);
  const [histItem,    setHistItem]    = useState(null);

  /* Load persisted state */
  useEffect(() => {
    (async () => {
      const ob   = await S.get("lantern_ob");
      const use  = await S.get("lantern_use");
      const hist = await S.get("lantern_hist");
      if (ob)   setOnboarded(true);
      const m = monthKey();
      if (use && use.month === m) setUsage(use);
      else setUsage({ month: m, count: 0 });
      if (Array.isArray(hist)) setHistory(hist);
      setReady(true);
    })();
  }, []);

  /* Inject fonts + global CSS */
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      html, body { margin: 0; padding: 0; background: #070C16; overflow: hidden; height: 100%; }
      textarea::placeholder { color: #3A4E64; }
      ::-webkit-scrollbar { display: none; }
      @keyframes fadeIn    { from { opacity: 0; }                           to { opacity: 1; }                       }
      @keyframes slideUp   { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pulse     { 0%,100% { opacity: 0.35; transform: scale(0.94); } 50% { opacity: 1; transform: scale(1.06); } }
      @keyframes dotPulse  { 0%,80%,100% { transform: scale(0.55); opacity: 0.35; } 40% { transform: scale(1); opacity: 1; } }
    `;
    document.head.appendChild(style);
  }, []);

  /* ─── Event handlers ─── */
  async function markOnboarded() {
    await S.set("lantern_ob", true);
    setOnboarded(true);
  }

  function handleCatSelect(catId) {
    if (usage.count >= FREE_LIMIT) {
      setOverlay("paywall");
      return;
    }
    setSelCat(catId);
    setResult(null);
    setResultSaved(false);
    setOverlay("chat");
  }

  async function handleResult(res, sit) {
    const newUse = { month: monthKey(), count: usage.count + 1 };
    setUsage(newUse);
    await S.set("lantern_use", newUse);
    setSituation(sit);
    setResult(res);
    setResultSaved(false);
    setOverlay("result");
  }

  async function handleSave() {
    const item = {
      id: Date.now().toString(),
      catId: selCat,
      situation,
      result,
      savedAt: Date.now(),
    };
    const newHist = [item, ...history].slice(0, 50);
    setHistory(newHist);
    setResultSaved(true);
    await S.set("lantern_hist", newHist);
  }

  async function handleDeleteHist(id) {
    const newHist = history.filter(h => h.id !== id);
    setHistory(newHist);
    if (newHist.length > 0) await S.set("lantern_hist", newHist);
    else await S.del("lantern_hist");
  }

  async function handleClearHistory() {
    setHistory([]);
    await S.del("lantern_hist");
  }

  async function handleResetUsage() {
    const newUse = { month: monthKey(), count: 0 };
    setUsage(newUse);
    await S.set("lantern_use", newUse);
  }

  function openHistItem(item) {
    setHistItem(item);
    setOverlay("hist-detail");
  }

  /* ─── Render logic ─── */
  if (!ready || showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  if (!onboarded) {
    return <OnboardingScreen onDone={markOnboarded} />;
  }

  if (overlay === "chat") {
    return (
      <ChatScreen
        catId={selCat}
        usage={usage}
        onBack={() => setOverlay(null)}
        onResult={handleResult}
        onPaywall={() => setOverlay("paywall")}
      />
    );
  }

  if (overlay === "result" && result) {
    return (
      <ResultScreen
        catId={selCat}
        situation={situation}
        result={result}
        onBack={() => setOverlay(null)}
        onSave={handleSave}
        saved={resultSaved}
      />
    );
  }

  if (overlay === "paywall") {
    return <PaywallScreen onBack={() => setOverlay(null)} />;
  }

  if (overlay === "hist-detail" && histItem) {
    return (
      <HistoryDetail
        item={histItem}
        onBack={() => { setHistItem(null); setOverlay(null); }}
        onDelete={handleDeleteHist}
      />
    );
  }

  /* Main tab layout */
  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, overflowY: "auto" }}>
      {tab === "home" && (
        <HomeTab
          usage={usage}
          onSelectCat={handleCatSelect}
          history={history}
          onHistItem={openHistItem}
        />
      )}
      {tab === "history" && (
        <HistoryTab
          history={history}
          onItem={openHistItem}
          onDelete={handleDeleteHist}
          onClear={handleClearHistory}
        />
      )}
      {tab === "settings" && (
        <SettingsTab
          usage={usage}
          onClearHistory={handleClearHistory}
          onResetUsage={handleResetUsage}
        />
      )}
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}
