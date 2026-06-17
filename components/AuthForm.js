"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// mode: "signin" | "signup"
export default function AuthForm({ mode }) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : undefined;

  async function handlePassword(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setNotice(`Confirm your address — we sent a verification link to ${email}.`);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      setError(readable(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleMagicLink() {
    setError("");
    setNotice("");
    if (!email) {
      setError("Enter your email first, then request the link.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: isSignup },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(readable(err));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Shell kicker="Link sent" title="Check your email">
        <p className="text-sm leading-relaxed text-muted">
          We sent a one-time sign-in link to{" "}
          <span className="text-ink">{email}</span>. Open it on this device to
          enter the terminal. The link expires in an hour.
        </p>
        <button
          onClick={() => { setSent(false); setNotice(""); }}
          className="mono mt-6 text-[12px] tracking-[0.06em] text-muted hover:text-signal"
        >
          ← Use a different email
        </button>
      </Shell>
    );
  }

  return (
    <Shell
      kicker={isSignup ? "Request clearance" : "Subscriber terminal"}
      title={isSignup ? "Create your account" : "Access the terminal"}
    >
      <p className="mb-6 text-sm leading-relaxed text-muted">
        {isSignup
          ? "Set up access to the indicators, maps, forecasts, and signals behind Cignal System."
          : "Sign in to your subscriber suite — indicators, market maps, forecasts, and signals."}
      </p>

      <form onSubmit={handlePassword} className="space-y-3">
        <Field
          icon={Mail}
          type="email"
          label="Email"
          value={email}
          onChange={setEmail}
          placeholder="you@firm.com"
          autoComplete="email"
        />
        <Field
          icon={Lock}
          type="password"
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={isSignup ? 8 : undefined}
        />

        {error && <p className="mono text-[12px] leading-relaxed text-down">{error}</p>}
        {notice && <p className="mono text-[12px] leading-relaxed text-up">{notice}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mono flex w-full items-center justify-center gap-2 rounded-md bg-signal px-4 py-2.5 text-[13px] font-medium tracking-[0.06em] text-bg transition-all hover:brightness-110 disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} strokeWidth={2} />}
          {isSignup ? "Create account" : "Sign in"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--line)]" />
        <span className="kicker">or</span>
        <span className="h-px flex-1 bg-[var(--line)]" />
      </div>

      <button
        onClick={handleMagicLink}
        disabled={busy}
        className="mono flex w-full items-center justify-center gap-2 rounded-md border border-signal/40 bg-signal/5 px-4 py-2.5 text-[13px] tracking-[0.06em] text-signal transition-all hover:bg-signal/10 disabled:opacity-60"
      >
        <Mail size={15} strokeWidth={1.8} />
        Email me a sign-in link
      </button>

      <p className="mono mt-7 text-center text-[12px] tracking-[0.04em] text-muted">
        {isSignup ? "Already have access? " : "No account yet? "}
        <Link
          href={isSignup ? "/login" : "/register"}
          className="text-signal hover-line"
        >
          {isSignup ? "Sign in" : "Request clearance"}
        </Link>
      </p>
    </Shell>
  );
}

function Shell({ kicker, title, children }) {
  return (
    <div className="mx-auto my-14 w-full max-w-md fade-up">
      <div className="card p-7 sm:p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="2.4" fill="#F5B544" />
            <circle cx="11" cy="11" r="6" stroke="#F5B544" strokeOpacity="0.5" strokeWidth="1" />
            <circle cx="11" cy="11" r="9.5" stroke="#F5B544" strokeOpacity="0.2" strokeWidth="1" />
          </svg>
          <span className="mono text-sm font-medium tracking-[0.16em] text-ink">
            CIGNAL<span className="text-signal">·</span>SYSTEM
          </span>
        </div>
        <p className="kicker mb-2">{kicker}</p>
        <h1 className="headline mb-4 text-3xl text-ink">{title}</h1>
        {children}
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value, onChange, ...rest }) {
  return (
    <label className="block">
      <span className="kicker mb-1.5 block">{label}</span>
      <span className="relative block">
        <Icon
          size={15}
          strokeWidth={1.8}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          {...rest}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="mono w-full rounded-md border border-[var(--line)] bg-bg2 py-2.5 pl-9 pr-3 text-[13px] text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-signal/70"
        />
      </span>
    </label>
  );
}

function readable(err) {
  const m = (err?.message || "").toLowerCase();
  if (m.includes("invalid login")) return "Email or password is incorrect.";
  if (m.includes("already registered")) return "That email already has an account — sign in instead.";
  if (m.includes("rate limit")) return "Too many attempts. Wait a minute and try again.";
  return err?.message || "Something went wrong. Try again.";
}
