import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminUsers from "@/components/AdminUsers";
import AdminDataCoverage from "@/components/AdminDataCoverage";

export const metadata = { title: "Admin · Cignal System" };
export const dynamic = "force-dynamic";

// Curated feed metadata. Volumes are injected live from the DB counts below,
// so adding/removing a FRED series or migration report updates these numbers
// automatically — no edit needed here.
function buildSources({ bySource, migrationBySource }) {
  const n = (k) => bySource[k] || 0;
  const uhaul = migrationBySource["uhaul"] || 0;
  const pods = migrationBySource["pods"] || 0;

  return [
    {
      name: "FRED",
      icon: "landmark",
      desc: "Federal Reserve Economic Data — rates & macro",
      volume: `${n("FRED")} indicators`,
      cadence: "Daily",
      tone: "live",
    },
    {
      name: "Zillow Research (ZORI)",
      icon: "home",
      desc: "Rent index — ZIP, metro & national",
      volume: `${n("Zillow Research")} series`,
      cadence: "Monthly",
      tone: "monthly",
    },
    {
      name: "Census ACS",
      icon: "map",
      desc: "Demographics — rent, income, tenure (ZIP & metro)",
      volume: `${n("Census ACS")} indicators`,
      cadence: "Annual",
      tone: "annual",
    },
    {
      name: "HUD",
      icon: "building",
      desc: "Fair Market Rents + ZIP↔CBSA crosswalk",
      volume: `${n("HUD FMR")} indicators`,
      cadence: "Monthly",
      tone: "monthly",
    },
    {
      name: "BEA",
      icon: "landmark",
      desc: "Regional price parities — rents & all-items by metro",
      volume: `${n("BEA")} indicators`,
      cadence: "Annual",
      tone: "annual",
    },
    {
      name: "BLS",
      icon: "database",
      desc: "Metro employment, unemployment & rent CPI",
      volume: `${n("BLS")} indicators`,
      cadence: "Monthly",
      tone: "monthly",
    },
    {
      name: "Freddie Mac AIMI",
      icon: "line",
      desc: "Apartment Investment Market Index — national & metro",
      volume: `${n("Freddie Mac AIMI")} indicators`,
      cadence: "Quarterly",
      tone: "manual",
    },
    {
      name: "Apartment List",
      icon: "home",
      desc: "Rent, vacancy & time-on-market by metro",
      volume: `${n("Apartment List")} indicators`,
      cadence: "Monthly",
      tone: "manual",
    },
    {
      name: "U.S. Treasury",
      icon: "line",
      desc: "10-Year par-yield curve",
      volume: "Intraday",
      cadence: "Live",
      tone: "live",
    },
    {
      name: "U-Haul Growth Index",
      icon: "truck",
      desc: "Inbound / outbound migration rankings",
      volume: `${uhaul} rows`,
      cadence: "Annual",
      tone: "annual",
    },
    {
      name: "PODS Moving Trends",
      icon: "package",
      desc: "Inbound / outbound migration rankings",
      volume: `${pods} rows`,
      cadence: "Annual",
      tone: "annual",
    },
    {
      name: "Analyst-maintained",
      icon: "user",
      desc: "Cap rate, absorption, DSCR, foreclosure +2",
      volume: `${n("manual")} indicators`,
      cadence: "Manual",
      tone: "manual",
    },
  ];
}

export default async function AdminPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  // Admin gate — enforced here AND by RLS on the data itself.
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin) redirect("/dashboard");

  // Users (RLS lets an admin read every row; a non-admin only ever sees their own).
  const usersP = supabase
    .from("profiles")
    .select("id,email,full_name,company,tier,status,is_admin,created_at")
    .order("created_at", { ascending: false });

  // Coverage stats: live geography/observation counts + per-source tallies.
  const statsP = supabase.rpc("platform_stats");
  const indsP = supabase.from("indicators").select("source");
  const migP = supabase.from("migration_rankings").select("source");

  const [{ data: users }, { data: stats }, { data: inds }, { data: mig }] =
    await Promise.all([usersP, statsP, indsP, migP]);

  const tally = (rows, key) =>
    (rows || []).reduce((acc, r) => {
      const k = r[key];
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});

  const bySource = tally(inds, "source");
  const migrationBySource = tally(mig, "source");
  const sources = buildSources({ bySource, migrationBySource });

  const coverage = {
    msa: stats?.msa_count ?? null,
    zip: stats?.zip_count ?? null,
    obs: stats?.obs_count ?? null,
    indicators: (inds || []).length,
    migrationRows: (mig || []).length,
    // metro + zip + national
    geographies:
      stats?.msa_count != null && stats?.zip_count != null
        ? stats.msa_count + stats.zip_count + 1
        : null,
    sources,
  };

  return (
    <>
      <AdminDataCoverage coverage={coverage} />
      <AdminUsers initialUsers={users || []} />
    </>
  );
}
