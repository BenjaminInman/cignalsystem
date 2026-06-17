// Browser-side Supabase client (client components only).
// Uses the public anon key — the same credential the ticker already reads with.
// Auth session is persisted to cookies by @supabase/ssr so the server and
// middleware can read it too.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
