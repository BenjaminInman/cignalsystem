# HelloData — Pipeline State

_Last updated: 2026-07-31_

## What exists

| Piece | Location | Status |
|---|---|---|
| Webhook receiver | `app/api/hellodata/webhook/route.js` | Live, HMAC-verified. **Log-only** — does not persist. |
| Ingester | `ingest_hellodata.py` | Live. Modes: `zip`, `metro`, `roster`, `cleanup`. |
| Workflow | `.github/workflows/ingest-hellodata.yml` | Manual dispatch only (no cron yet). |

Writes go through GitHub Actions on `SUPABASE_DB_URL` — the app carries only the
anon key, so the webhook **cannot** write to the DB. Webhook captures the signed
CSV URL; the URL is fed to the workflow.

## Indicators

`hd_asking_rent`, `hd_effective_rent`, `hd_concession`, `hd_leased_pct`, `hd_dom`
— source `HelloData`, seeded 2026-07-31 19:14.

**All five are `restricted = true`.** `v_indicator_analytics` is defined as
`... WHERE i.restricted = false`, so these are invisible to every public route by
design. This is the same gate used for Conference Board CCI. Flipping it is a
**licensing decision, not an engineering one** — confirm redistribution rights in
writing first.

## Data loaded

Nashville only (CBSA 34980) — 52 ZIPs + metro, **38 months, 2023-06 → 2026-07**,
~1,950 obs per indicator, all revision 0. MF filter: `number_units >= 50`.

## Non-obvious things that will bite you

1. **Monthly series must be dated to month start.** Original load dated rows by
   load date (2026-07-31). YoY never aligns that way. `as_of_month` is now mapped
   through `month_start()`; `HD_OBS_DATE` defaults to the 1st.
2. **Snapshot and month-grouped exports measure different universes.** A
   point-in-time export averages currently-active listings; an `as_of_month`
   export averages listings as-of that month. Nashville July metro asking read
   $1,729 one way and $1,770 the other. Never mix the two shapes in one series —
   the MV reads revision 0 only, so a stale first print silently becomes a
   methodology break at the newest, most decision-relevant point.
3. **MSA labels need normalization.** HelloData: `Nashville-Davidson-Murfreesboro-Franklin, TN`.
   Regions: `Nashville-Davidson--Murfreesboro--Franklin, TN` (double hyphens).
   `norm()` collapses this. ZIP needs no crosswalk.
4. **Refresh the MV via the workflow, not the Management API.** A multi-statement
   `set statement_timeout=0; refresh ...` gets blocked by Cloudflare. Re-dispatch
   an ingest with an already-loaded URL — writes 0 rows, refreshes the view.
5. `yoy_change` in the MV is **absolute**, not percent.

## Export recipe

```
scopes:  {zip_code | msa}, as_of_month,
         Avg: asking_rent, effective_rent, concession, leased_percentage, days_on_market
filters: msa equals "<full CBSA label>", number_units greaterThanOrEqualTo 50
limit:   50000
```
Filter operators: `equals, notEquals, in, notIn, greaterThan, greaterThanOrEqualTo,
lessThan, lessThanOrEqualTo, contains, notContains, from, to, isKnown, isUnknown, flag`.

## Not done

- [ ] National rollout (~3 country-wide exports: ZIP, metro, roster)
- [ ] `roster` mode never run — `hd_property_count` / `hd_unit_count` empty, so
      **thin-cell suppression is not yet enforceable**
- [ ] Webhook still log-only; no delivery table
- [ ] No scheduled cron
- [ ] Website surfacing / single-ZIP cascade search
- [ ] Seasonality: concession load peaks each autumn — adjust before driving a phase call

## Available but unused

`rent_roll_lease_tradeout`, `rent_roll_renewal_percent` (new-lease vs renewal
tradeout — a cleaner leading indicator than anything currently in the stack),
`exposure_percentage`, `is_lease_up`, and the `is_condo / is_student / is_senior /
is_affordable / is_single_family` flags for a tighter conventional-MF universe.

## Security fix — 2026-07-31

The `restricted` gate was **not enforcing anything**. `v_indicator_analytics`
filters `restricted = false`, but that view was trivially bypassable:

- `anon` held full privileges on `mv_indicator_analytics`, and **materialized
  views cannot carry RLS**. Anyone with the public anon key (it ships in the
  browser bundle by design) could read every restricted indicator, with YoY and
  z-scores already computed.
- The RLS policies on `observations` and `indicators` checked `is_public = true`
  but never `restricted`. Since restricted rows are also `is_public = true`, raw
  restricted observations were readable too.

Verified by recovering the anon key from the deployed bundle and reading both
HelloData effective rents and Conference Board present-situation values.

Applied:

```sql
revoke all on public.mv_indicator_analytics from anon, authenticated;
alter policy p_obs_public_read on observations using (exists (
  select 1 from indicators i where i.id = observations.indicator_id
    and i.is_public = true and i.restricted = false));
alter policy p_indicators_public_read on indicators
  using (is_public = true and restricted = false);
alter policy p_indicators_auth_read on indicators using (restricted = false);
```

Safe because `v_indicator_analytics` has no `security_invoker` option, so it runs
with owner privileges and keeps working after the revoke. No app code reads the
MV directly (all 25 call sites use the wrapper view). Verified after: restricted
slugs return `[]` to the anon key; `/api/ticker`, `/api/trends`, `/api/indicators`,
`/api/stats` all still 200 with an unchanged 68-indicator public catalog.

**Consequence for the paid tier:** anon *and* authenticated are now both blocked
from restricted data, so the paying-tier route cannot read HelloData with the anon
key. Next step is a `SECURITY DEFINER` function granted to `authenticated`, with
the tier check done server-side in the route before calling it. That avoids adding
a service-role key to the app.

## Disclosure control — 2026-08-01

`hd_region_coverage` (region_id, properties, units, max_property_units,
max_share, publishable). A ZIP publishes only when **both** hold:

- **>= 3 distinct properties** — statistical stability
- **no single property > 50% of units** — re-identification guard

The dominance rule is the one that is easy to skip and shouldn't be. Nashville
37189 has two properties and the larger is 66% of units: an operator who knows
that building's rents can derive the other's from the published average. Two
competing buildings is a real market dynamic *and* a re-identifiable pair at the
same time — the count rule alone does not catch it.

Enforced inside `hd_analytics()`, not in the API route, so it cannot be bypassed
by calling the RPC directly over PostgREST.

**Suppressed cells fall back to metro, never to a neighbouring ZIP.** Adjacent
ZIPs are different submarkets (37027 Brentwood borders 37211 and their rents are
nothing alike), so a neighbour blend would describe neither and would silently
break ZIP independence.

Nashville: **47 publishable, 5 suppressed** (of 52 loaded).

`hd_coverage(p_zip)` returns the basis (properties/units) to authenticated Pro+
callers so the UI can state what a ZIP average rests on.

Run via `HD_MODE=coverage` with a ZIP-grain export of
`zip_code, CountDistinct(property_id), Sum(number_units), Max(number_units)`.
Note HelloData emits **duplicate `number_units` headers** for Sum and Max — read
positionally, not by name, or the two collapse.

### Vendor geography is not clean
The Nashville MSA filter returned `11111` (a placeholder) and `30766` (a Georgia
prefix). These were dropped only because the ingester joins against existing
`regions` rows and neither exists. **At national scale that join will not save
you** — a bad ZIP that is a real ZIP elsewhere would land in the wrong market.
Add an explicit validation step before the national run.

## The universe — locked 2026-08-01

Every HelloData export uses **both** filters. Changing either creates a
methodology seam at the month it changed.

```json
{"column":"number_units","filter":{"greaterThanOrEqualTo":50}}
{"column":"is_affordable","filter":{"equals":false}}
```

`is_affordable` takes a **boolean via `equals`** — not the `flag` operator the
schema implies. `{"flag":true}`, `{"flag":"true"}` and `{"equals":"false"}` are
all rejected.

**Why exclude affordable, given it barely moves the level.** Measured on
Nashville: 119 of 989 properties (12%) drop out, and asking moves $1,729 → $1,734
— five dollars. The case for excluding is not the level, it is the *movement*.
LIHTC and subsidised rents are set by AMI formulas on an annual HUD schedule;
they do not respond to concessions, lease-up pressure or demand shocks. A 12%
slug of policy-priced stock systematically damps the volatility of the exact
series used to detect cycle turns.

Caveat: this is HelloData's own classification and cannot be audited from here.
It is likely LIHTC-weighted and will not reliably catch project-based Section 8
or HUD-assisted stock that does not advertise as such. Deep-subsidy units are
largely invisible to a listings-scraped dataset anyway — which is also why the
delta is so small.

**Coverage counts must use this same universe.** Counting properties that are
excluded from the rent average would leave the disclosure floor measuring a
different population than the data it protects.

## National export shape

There is **no single national pricing export** — HelloData rejects any query with
pricing columns unless it is filtered by at least one market column:

> "Queries that include Pricing Columns must be filtered by at least one Market Column."

A multi-state `in` filter satisfies this, so the country goes out as **5 state
chunks × (ZIP + metro) + 1 national coverage pull = 11 exports**. Coverage has no
pricing columns, so it runs nationally in one job.

National scale (unfiltered first pass): 11,611 ZIPs, 143,669 properties,
26.4M units — well above the ~90k properties commonly cited for 50+ unit stock.
