"use client";

import { useState } from "react";
import { Users, MessageSquare, ArrowBigUp, Facebook, Hash, Send } from "lucide-react";
import { useVertical } from "@/components/VerticalProvider";
import { isPageReady } from "@/lib/verticals";
import ComingSoonInline from "@/components/ComingSoonInline";

const CHANNELS = ["All", "Signals", "Market Cycle", "Deals", "Operations", "Intros"];

const SEED = [
  { id: 1, channel: "Signals", title: "Composite flipped to 60% bullish — anyone shifting acquisition pace?", author: "Marcus T.", replies: 14, votes: 23, time: "2h ago" },
  { id: 2, channel: "Market Cycle", title: "Are we early Expansion or late Recovery in the Sun Belt right now?", author: "Priya R.", replies: 9, votes: 17, time: "5h ago" },
  { id: 3, channel: "Deals", title: "Underwriting a 200-unit in Nashville — what cap-rate assumption are you using?", author: "Dan W.", replies: 21, votes: 12, time: "1d ago" },
  { id: 4, channel: "Operations", title: "Concessions creeping back in Austin Class A — what are you seeing on the ground?", author: "Lena K.", replies: 7, votes: 9, time: "1d ago" },
  { id: 5, channel: "Signals", title: "Debt maturity wall — building a shared watchlist of likely distressed sellers", author: "Carlos M.", replies: 18, votes: 31, time: "2d ago" },
  { id: 6, channel: "Intros", title: "New here — 1,200 units across TX/AZ, excited to compare notes on timing", author: "Sam P.", replies: 11, votes: 14, time: "3d ago" },
];

const ONLINE = [
  { name: "Marcus T." }, { name: "Priya R." }, { name: "Dan W." }, { name: "Lena K." },
  { name: "Carlos M." }, { name: "Sam P." }, { name: "Jordan B." }, { name: "Rae A." },
];

function initials(name) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function CommunityPage() {
  const vertical = useVertical();
  if (!isPageReady(vertical, "community")) return <ComingSoonInline vertical={vertical} title="Community" />;
  return <CommunityInner />;
}

function CommunityInner() {
  const [channel, setChannel] = useState("All");
  const [threads, setThreads] = useState(SEED);
  const [draft, setDraft] = useState("");

  const post = () => {
    const text = draft.trim();
    if (!text) return;
    setThreads((t) => [
      { id: Date.now(), channel: channel === "All" ? "Signals" : channel, title: text, author: "You", replies: 0, votes: 1, time: "just now" },
      ...t,
    ]);
    setDraft("");
  };

  const visible = channel === "All" ? threads : threads.filter((t) => t.channel === channel);

  return (
    <div className="pt-12 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker mb-3 flex items-center gap-2"><Users size={12} className="text-signal" /> Community</p>
          <h1 className="headline text-4xl text-ink md:text-5xl">The Cignal Room</h1>
          <p className="mt-3 max-w-2xl text-muted">Where members debate the signals, pressure-test reads, and compare notes on the cycle — on-platform, not lost in a Facebook feed.</p>
        </div>
        <span className="mono rounded-sm border border-signal/30 bg-signal/10 px-3 py-1.5 text-[11px] tracking-[0.06em] text-signal">Open to registered guests · members-only soon</span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* MAIN — discussion board */}
        <main>
          {/* channels */}
          <div className="mb-4 flex gap-1 overflow-x-auto">
            {CHANNELS.map((c) => (
              <button key={c} onClick={() => setChannel(c)}
                className={`mono shrink-0 rounded-md px-3 py-1.5 text-[12px] tracking-[0.04em] transition-colors ${channel === c ? "bg-signal/10 text-signal" : "text-muted hover:text-ink"}`}>
                {c !== "All" && <Hash size={11} className="mr-1 inline" />}{c}
              </button>
            ))}
          </div>

          {/* composer */}
          <div className="card mb-4 p-4">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Start a discussion${channel !== "All" ? ` in ${channel}` : ""}…`}
              rows={2}
              className="w-full resize-none bg-transparent text-sm text-ink placeholder:text-muted/60 outline-none"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="mono text-[10px] tracking-[0.06em] text-muted">Preview — posts last for this session</span>
              <button onClick={post} className="mono flex items-center gap-1.5 rounded-sm bg-signal px-4 py-2 text-[11px] tracking-[0.08em] text-bg hover:opacity-90">
                <Send size={12} /> POST
              </button>
            </div>
          </div>

          {/* threads */}
          <div className="space-y-3">
            {visible.map((t) => (
              <div key={t.id} className="card flex gap-4 p-5 transition-colors hover:border-[var(--line-strong)]">
                <div className="flex flex-col items-center pt-0.5">
                  <ArrowBigUp size={18} className="text-muted transition-colors hover:text-signal" />
                  <span className="mono text-[12px] text-ink">{t.votes}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="mono rounded bg-white/[0.04] px-2 py-0.5 text-[10px] tracking-wide text-muted">{t.channel}</span>
                    <span className="mono text-[11px] text-muted">{t.author} · {t.time}</span>
                  </div>
                  <h3 className="font-medium leading-snug text-ink">{t.title}</h3>
                  <div className="mono mt-2 flex items-center gap-1.5 text-[11px] tracking-wide text-muted">
                    <MessageSquare size={12} /> {t.replies} replies
                  </div>
                </div>
              </div>
            ))}
            {visible.length === 0 && <p className="mono py-8 text-center text-[12px] text-muted">No discussions in this channel yet — start one above.</p>}
          </div>
        </main>

        {/* SIDEBAR */}
        <aside>
          <div className="lg:sticky lg:top-24 space-y-6">
          {/* live members */}
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

          {/* community stats */}
          <div className="card grid grid-cols-3 divide-x divide-[var(--line)] p-0 text-center">
            {[["1,240", "MEMBERS"], ["14", "ONLINE"], ["86", "POSTS / WK"]].map(([n, l]) => (
              <div key={l} className="px-2 py-4">
                <div className="headline text-xl text-ink">{n}</div>
                <div className="mono text-[9px] tracking-[0.1em] text-muted">{l}</div>
              </div>
            ))}
          </div>

          {/* facebook group */}
          <div className="card p-5">
            <Facebook size={20} className="text-signal" strokeWidth={1.8} />
            <h2 className="mt-3 font-semibold text-ink">Also on Facebook</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">The Cignal Room lives here first — but our members-only Facebook group is open too, if that&apos;s where you already spend time.</p>
            <a href="#" className="mono mt-4 inline-flex items-center gap-2 rounded-sm border border-[var(--line-strong)] px-4 py-2.5 text-[11px] tracking-[0.08em] text-ink hover:bg-white/[0.04]">
              JOIN THE FB GROUP →
            </a>
          </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
