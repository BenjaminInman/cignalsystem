"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Users, Facebook, Send, Lock, CornerDownLeft } from "lucide-react";
import { useVertical } from "@/components/VerticalProvider";
import { isPageReady } from "@/lib/verticals";
import ComingSoonInline from "@/components/ComingSoonInline";
import { createClient } from "@/lib/supabase/client";

const ROOM = "cignal_room";
const FB_URL = "https://www.facebook.com/groups/cignalroom";

// Seeded sample conversation — shown only until real members start posting,
// so the room never looks empty pre-launch.
const SEED = [
  { id: "s1", display_name: "Marcus T.", body: "Composite just flipped to 60% bullish. Anyone actually shifting acquisition pace on that, or waiting for confirmation?", t: "9:02 AM" },
  { id: "s2", display_name: "Priya R.", body: "Still feels like late Recovery in most of the Sun Belt to me, not Expansion yet. Permits haven't turned.", t: "9:06 AM" },
  { id: "s3", display_name: "Dan W.", body: "Underwriting a 200-unit in Nashville this week — what cap rate are you all assuming on exit?", t: "9:11 AM" },
  { id: "s4", display_name: "Lena K.", body: "Seeing concessions creep back into Austin Class A. Two months free on lease-ups near the Domain.", t: "9:15 AM" },
  { id: "s5", display_name: "Carlos M.", body: "That tracks with the debt-maturity wall. Building a shared watchlist of likely distressed sellers if anyone wants in.", t: "9:18 AM" },
  { id: "s6", display_name: "Sam P.", body: "New here — 1,200 units across TX/AZ. Joined to compare notes on timing instead of guessing. 👋", t: "9:21 AM" },
];

const ONLINE = [
  { name: "Marcus T." }, { name: "Priya R." }, { name: "Dan W." }, { name: "Lena K." },
  { name: "Carlos M." }, { name: "Sam P." }, { name: "Jordan B." }, { name: "Rae A." },
];

function initials(name = "") {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}
function nameFromUser(user, fullName) {
  if (fullName && fullName.trim()) return fullName.trim();
  const email = user?.email || "";
  const base = email.split("@")[0] || "Member";
  return base.charAt(0).toUpperCase() + base.slice(1);
}
function clockTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch { return ""; }
}

export default function CommunityPage() {
  const vertical = useVertical();
  if (!isPageReady(vertical, "community")) return <ComingSoonInline vertical={vertical} title="Community" />;
  return <CignalRoom />;
}

function CignalRoom() {
  const [me, setMe] = useState(null);          // { id, name }
  const [messages, setMessages] = useState([]); // real messages from DB
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const scrollRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
  }, []);

  // identify the member + load history
  useEffect(() => {
    const supabase = createClient();
    let active = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (active && user) {
        const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        if (active) setMe({ id: user.id, name: nameFromUser(user, prof?.full_name) });
      }
      const { data: rows } = await supabase
        .from("community_messages")
        .select("id, user_id, display_name, body, created_at")
        .eq("room", ROOM)
        .order("created_at", { ascending: true })
        .limit(200);
      if (active && rows) { setMessages(rows); scrollToBottom(); }
    })();

    // live updates
    const channel = supabase
      .channel("cignal_room_feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages", filter: `room=eq.${ROOM}` },
        (payload) => {
          setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
          scrollToBottom();
        })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [scrollToBottom]);

  async function send() {
    const body = draft.trim();
    if (!body || !me || sending) return;
    setSending(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("community_messages")
      .insert({ user_id: me.id, display_name: me.name, body, room: ROOM })
      .select("id, user_id, display_name, body, created_at")
      .single();
    setSending(false);
    if (!error && data) {
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
      setDraft("");
      scrollToBottom();
    }
  }

  const showSeed = messages.length === 0;
  const feed = showSeed
    ? SEED.map((s) => ({ ...s, user_id: "seed", _time: s.t }))
    : messages.map((m) => ({ ...m, _time: clockTime(m.created_at) }));

  return (
    <div className="pt-12 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker mb-3 flex items-center gap-2"><Users size={12} className="text-signal" /> Community</p>
          <h1 className="headline text-4xl text-ink md:text-5xl">The Cignal Room</h1>
          <p className="mt-3 max-w-2xl text-muted">Where members debate the signals in real time, pressure-test reads, and compare notes on the cycle — on-platform, not lost in a Facebook feed.</p>
        </div>
        <span className="mono rounded-sm border border-signal/30 bg-signal/10 px-3 py-1.5 text-[11px] tracking-[0.06em] text-signal">Live chat · members-only</span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* MAIN — live chat */}
        <main>
          <div className="card flex h-[620px] flex-col overflow-hidden">
            {/* room header */}
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-signal/10">
                  <span className="h-1.5 w-1.5 animate-flicker rounded-full bg-up" />
                </span>
                <div>
                  <div className="mono text-[12px] tracking-[0.08em] text-ink"># cignal-room</div>
                  <div className="mono text-[10px] tracking-[0.06em] text-muted">{ONLINE.length} members active</div>
                </div>
              </div>
              <span className="mono text-[10px] tracking-[0.1em] text-muted">ENCRYPTED · MEMBERS</span>
            </div>

            {/* message feed */}
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {showSeed && (
                <div className="mono mx-auto mb-2 w-fit rounded-full border border-[var(--line)] bg-bg2 px-3 py-1 text-[10px] tracking-[0.1em] text-muted">
                  SAMPLE CONVERSATION · BE THE FIRST TO POST
                </div>
              )}
              {feed.map((m) => {
                const mine = me && m.user_id === me.id;
                return (
                  <div key={m.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border mono text-[10px] ${mine ? "border-signal/40 bg-signal/15 text-signal" : "border-[var(--line-strong)] bg-bg2 text-ink"}`}>
                      {initials(m.display_name)}
                    </div>
                    <div className={`min-w-0 max-w-[78%] ${mine ? "items-end text-right" : ""} flex flex-col`}>
                      <div className={`mb-1 flex items-center gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                        <span className="mono text-[11px] tracking-[0.04em] text-ink">{mine ? "You" : m.display_name}</span>
                        <span className="mono text-[10px] text-muted">{m._time}</span>
                      </div>
                      <div className={`inline-block rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${mine ? "bg-signal/15 text-ink" : "border border-[var(--line)] bg-bg text-ink"} ${showSeed ? "opacity-70" : ""}`}>
                        {m.body}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            {/* composer */}
            <div className="border-t border-[var(--line)] p-3.5">
              {me ? (
                <div className="flex items-end gap-2 rounded-md border border-[var(--line-strong)] bg-bg px-3 py-2 focus-within:border-signal/50">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Message The Cignal Room…"
                    rows={1}
                    className="max-h-28 flex-1 resize-none bg-transparent py-1 text-sm text-ink placeholder:text-muted/60 outline-none"
                  />
                  <button onClick={send} disabled={sending || !draft.trim()}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-signal text-bg transition-opacity hover:opacity-90 disabled:opacity-40">
                    <Send size={15} />
                  </button>
                </div>
              ) : (
                <a href="/login" className="flex items-center justify-center gap-2 rounded-md border border-signal/40 bg-signal/10 px-4 py-3 text-[12px] mono tracking-[0.06em] text-signal transition-colors hover:bg-signal hover:text-bg">
                  <Lock size={13} /> SIGN IN TO JOIN THE CIGNAL ROOM
                </a>
              )}
              {me && (
                <p className="mono mt-1.5 flex items-center gap-1.5 px-1 text-[10px] tracking-[0.04em] text-muted">
                  <CornerDownLeft size={10} /> Enter to send · Shift+Enter for a new line
                </p>
              )}
            </div>
          </div>
        </main>

        {/* SIDEBAR — placeholders kept */}
        <aside>
          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="mono text-[11px] tracking-[0.12em] text-muted">LIVE NOW</h2>
                <span className="flex items-center gap-1.5 text-[12px] text-ink">
                  <span className="h-1.5 w-1.5 animate-flicker rounded-full bg-up" /> {ONLINE.length} online
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ONLINE.map((m) => (
                  <div key={m.name} title={m.name} className="relative">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line-strong)] bg-bg2 mono text-[11px] text-ink">
                      {initials(m.name)}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg bg-up" />
                  </div>
                ))}
              </div>
            </div>

            <div className="card grid grid-cols-3 divide-x divide-[var(--line)] p-0 text-center">
              {[["1,240", "MEMBERS"], ["14", "ONLINE"], ["86", "POSTS / WK"]].map(([n, l]) => (
                <div key={l} className="px-2 py-4">
                  <div className="headline text-xl text-ink">{n}</div>
                  <div className="mono text-[9px] tracking-[0.1em] text-muted">{l}</div>
                </div>
              ))}
            </div>

            <div className="card p-5">
              <Facebook size={20} className="text-signal" strokeWidth={1.8} />
              <h2 className="mt-3 font-semibold text-ink">Also on Facebook</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">The Cignal Room lives here first — but our members-only Facebook group is open too, if that&apos;s where you already spend time.</p>
              <a href={FB_URL} target="_blank" rel="noopener noreferrer" className="mono mt-4 inline-flex items-center gap-2 rounded-sm border border-[var(--line-strong)] px-4 py-2.5 text-[11px] tracking-[0.08em] text-ink hover:bg-white/[0.04]">
                JOIN THE FB GROUP →
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
