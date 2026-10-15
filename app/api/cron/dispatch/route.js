// Vercel Cron -> GitHub Actions dispatcher.
//
// GitHub's own `schedule:` trigger proved unreliable for this repo: runs fired
// 2-6 hours late, were skipped outright, and from 2026-10-05 stopped entirely
// under a phantom "BuildFailed" workflow. Vercel Cron fires on time, so it owns
// the clock now and simply asks GitHub to run each Python ingest via
// workflow_dispatch (the jobs themselves still run on GitHub, where the DB
// secrets live).
//
// GET /api/cron/dispatch?slot=morning|midday|afternoon
// Auth: Authorization: Bearer $CRON_SECRET (Vercel Cron sends this itself).
// Needs GITHUB_DISPATCH_TOKEN: fine-grained PAT on BenjaminInman/cignalsystem
// with "Actions: Read and write".
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REPO = "BenjaminInman/cignalsystem";
const CRON_SECRET = process.env.CRON_SECRET;
const TOKEN = process.env.GITHUB_DISPATCH_TOKEN;

// Daily slots (UTC). One hour apart so ingest-news lands before compose-news,
// and compose before the 13:00 newsletter, even if a cron drifts within its hour.
const DAILY = {
  morning: ["ingest-news.yml", "ingest-databento.yml"],          // 11:00
  midday: ["compose-news.yml", "ingest-fred.yml"],               // 12:00
  afternoon: ["ingest-fred.yml", "ingest-databento.yml"],        // 14:00
};

// Monthly / quarterly / annual jobs, checked in the afternoon slot.
// [workflow, days of month, months (null = every month)]
const CALENDAR = [
  ["ingest-umich.yml", [1, 4], null],
  ["ingest-apartmentlist.yml", [3, 10, 20], null],
  ["ingest-census.yml", [5], null],
  ["ingest-hud.yml", [8], null],
  ["ingest-bea.yml", [12], null],
  ["ingest-soma.yml", [12], [3, 6, 9, 12]],
  ["ingest-gse.yml", [15, 25], null],
  ["ingest-qcew.yml", [15, 22], [3, 6, 9, 12]],
  ["ingest-lihtc-hmda.yml", [15], [4, 10]],
  ["ingest-zori.yml", [16, 23], null],
  ["ingest-zhvi.yml", [16, 23], null],
  ["ingest-permits.yml", [20], null],
  ["ingest-oz.yml", [20], [12]],
  ["ingest-bls.yml", [22, 26], null],
  ["ingest-metro-industries.yml", [22], null],
  ["ingest-pep.yml", [27], [3]],
  ["ingest-pep.yml", [24], [4]],
];

function workflowsFor(slot, now = new Date()) {
  const list = [...(DAILY[slot] || [])];
  if (slot === "afternoon") {
    const d = now.getUTCDate();
    const m = now.getUTCMonth() + 1;
    for (const [wf, days, months] of CALENDAR) {
      if (days.includes(d) && (!months || months.includes(m)) && !list.includes(wf)) list.push(wf);
    }
  }
  return list;
}

async function dispatch(wf) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${wf}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "content-type": "application/json",
    },
    body: JSON.stringify({ ref: "main" }),
    cache: "no-store",
  });
  return { workflow: wf, ok: r.status === 204, status: r.status, error: r.status === 204 ? undefined : (await r.text()).slice(0, 200) };
}

export async function GET(req) {
  if (!CRON_SECRET || req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`)
    return Response.json({ error: "unauthorized" }, { status: 401 });
  const slot = new URL(req.url).searchParams.get("slot") || "";
  if (slot === "check") {
    // Health check: proves the token is present and can see this repo's
    // workflows, without starting anything.
    if (!TOKEN) return Response.json({ ok: false, error: "GITHUB_DISPATCH_TOKEN is not set in Vercel" }, { status: 500 });
    const r = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows?per_page=1`, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json" }, cache: "no-store",
    });
    return Response.json({ ok: r.ok, status: r.status, today: { morning: workflowsFor("morning"), midday: workflowsFor("midday"), afternoon: workflowsFor("afternoon") } }, { status: r.ok ? 200 : 502 });
  }
  if (!DAILY[slot]) return Response.json({ error: `unknown slot "${slot}"` }, { status: 400 });
  const workflows = workflowsFor(slot);
  if (!TOKEN)
    return Response.json({ error: "GITHUB_DISPATCH_TOKEN is not set in Vercel", slot, workflows }, { status: 500 });
  const results = [];
  for (const wf of workflows) results.push(await dispatch(wf));
  const failed = results.filter((x) => !x.ok);
  return Response.json({ ok: failed.length === 0, slot, results }, { status: failed.length ? 502 : 200 });
}
