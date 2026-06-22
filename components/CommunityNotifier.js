"use client";

// Site-wide notification for new Cignal Room messages.
// Mounted once in the root layout, so a logged-in member sees a macOS-style
// toast slide in from the top-right no matter what page they're on — unless
// they're already in the room (where they'd see the message live anyway).
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ROOM = "cignal_room";
const AUTO_DISMISS_MS = 7000;
const MAX_VISIBLE = 3;

function initials(name = "") {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}

// soft, short two-tone chime via WebAudio (no asset needed). Guarded — browsers
// block audio until the user has interacted, so failures are swallowed silently.
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [[880, 0], [1320, 0.09]].forEach(([freq, at]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.06, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.24);
    });
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch { /* audio blocked — ignore */ }
}

export default function CommunityNotifier() {
  const router = useRouter();
  const pathname = usePathname();
  const [toasts, setToasts] = useState([]);
  const meRef = useRef(null);        // current user id
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => { if (active) meRef.current = data.user?.id || null; });
    const { data: authSub } = supabase.auth.onAuthStateChange((_e, session) => {
      meRef.current = session?.user?.id || null;
    });

    const channel = supabase
      .channel("cignal_room_notify")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages", filter: `room=eq.${ROOM}` },
        (payload) => {
          const msg = payload.new;
          // only notify logged-in members, never for your own message,
          // and not while you're already looking at the room.
          if (!meRef.current) return;
          if (msg.user_id === meRef.current) return;
          if (pathRef.current?.startsWith("/community")) return;

          const id = `${msg.id}-${Date.now()}`;
          setToasts((prev) => [{ id, name: msg.display_name, body: msg.body }, ...prev].slice(0, MAX_VISIBLE));
          playChime();
          setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
        })
      .subscribe();

    return () => { active = false; authSub.subscription.unsubscribe(); supabase.removeChannel(channel); };
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[200] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2.5">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => { dismiss(t.id); router.push("/community"); }}
          className={`pointer-events-auto group flex w-full items-start gap-3 rounded-2xl border border-white/10 bg-bg2/85 p-3.5 text-left shadow-2xl shadow-black/60 backdrop-blur-xl transition-transform hover:scale-[1.015] ${t.leaving ? "notif-out" : "notif-in"}`}
        >
          {/* app icon — Cignal radar mark */}
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signal/15">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="2.4" fill="#F5B544" />
              <circle cx="11" cy="11" r="6" stroke="#F5B544" strokeOpacity="0.5" strokeWidth="1" />
              <circle cx="11" cy="11" r="9.5" stroke="#F5B544" strokeOpacity="0.2" strokeWidth="1" />
            </svg>
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="mono text-[10px] uppercase tracking-[0.14em] text-signal">The Cignal Room</span>
              <span className="mono text-[10px] text-muted">now</span>
            </div>
            <div className="mt-0.5 truncate text-[13px] font-semibold text-ink">{t.name}</div>
            <div className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted">{t.body}</div>
          </div>

          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}
            className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-muted opacity-0 transition-opacity hover:bg-white/10 hover:text-ink group-hover:opacity-100"
          >
            <X size={12} />
          </span>
        </button>
      ))}
    </div>
  );
}
