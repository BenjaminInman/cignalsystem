import { getHubMacro } from "@/lib/hub-macro";

export const runtime = "nodejs";
// Per-request render; the inner fetches carry their own revalidate windows.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getHubMacro());
  } catch {
    return Response.json({ items: [], attribution: null });
  }
}
