import Link from "next/link";

export const metadata = { title: "Link problem · Cignal System" };

export default function AuthErrorPage() {
  return (
    <div className="mx-auto my-14 w-full max-w-md fade-up">
      <div className="card p-7 sm:p-8">
        <p className="kicker mb-2">Link expired</p>
        <h1 className="headline mb-4 text-3xl text-ink">That link didn&apos;t work</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted">
          Sign-in links are single-use and expire after an hour. Request a fresh
          one and it&apos;ll take you straight in.
        </p>
        <Link
          href="/login"
          className="mono inline-flex items-center gap-2 rounded-md bg-signal px-4 py-2.5 text-[13px] font-medium tracking-[0.06em] text-bg transition-all hover:brightness-110"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
