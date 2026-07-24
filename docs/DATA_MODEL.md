# Data model: revisions, freshness, and what "current" means

Two things in this warehouse are easy to get wrong, and both have already
produced wrong numbers on the live site. This file exists so they don't have to
be rediscovered.

---

## 1. Revision 0 is the archive, not the display value

`observations` is keyed `(indicator_id, region_id, obs_date, revision)`.
Revision 0 is the **first print** — the number the agency published the first
time, preserved permanently. When a source revises, the new value lands as
revision 1, 2, ... The first print is never overwritten.

That rule is correct and should not change. First prints are what make
vintage-honest backtesting possible: you can ask what a signal looked like at
the moment a decision would have been made, not what it looks like after the
agency cleaned it up.

But **first print is the wrong number to show on a public value tile.**

BEA revised Q1 2026 real GDP from 1.6 to 2.1 on 2026-06-25. `mv_indicator_
analytics` is revision-0 only, so the Indicators tab kept serving 1.6 while
BEA's own site said 2.1. A visitor who spot-checks one number against the
source and finds it stale has no reason to trust the other 67.

Revisions are **not** rare. As of 2026-07, these all carry revisions:

| Slug | Example |
|---|---|
| `gdp` | Q1 2026: 1.6 → 2.1 |
| `permits_5plus` | May 2026: 474 → 468 |
| `mf_starts` | Apr 2026: 486 → 494; May: 284 → 291 |
| `employment` | Apr 2026: 158,829 → 158,798 |
| `real_pce` | four consecutive months revised down |
| `initial_claims` | most recent six weeks, +1–2K each |
| `zori_national`, `zori_national_mf`, `zordi` | many, some at revision 2 |
| `consumer_credit_*`, `cli_oecd`, `soma_*`, `wage_growth` | many |

### The split

- **Display** (value tiles, tickers, anything a visitor could check against the
  source) → latest revision, via `indicator_current()`.
- **Math** (YoY, z-scores, trajectory, backtests, The Tell) → revision 0, via
  `mv_indicator_analytics` / `v_indicator_analytics`. Unchanged.

### `indicator_current(p_slug, p_region_type, p_limit)`

Returns newest-first: `obs_date`, `value` (latest revision), `revision`,
`revised`, `first_value` (revision 0). Show both when they differ — the
revision is itself information, and discarding it at the display layer throws
away a real fact about the economy.

This is a **function, not a view**, deliberately. The view form used
`DISTINCT ON` and Postgres will not push a slug predicate through it, so every
query planned a scan of all 3.7M observation rows and hit the 60s statement
timeout. Passing the slug as an argument uses `idx_obs_indicator_date` and
returns in under a second. If you are tempted to "simplify" this back into a
view, don't.

---

## 2. Calendar age is not staleness

FRED dates quarterly and annual series to the **start of the period**. A GDP row
dated `2026-01-01` is Q1 2026 — not January, and not stale. On 2026-07-23 that
row was the most recent published quarter; Q2's advance estimate had not been
released yet.

Measuring `current_date - obs_date` therefore penalizes every slow series by at
least one period length no matter how current it is. Doing exactly that produced
a false report that 13 indicators were stale, including GDP ("204 days") and the
ACS series ("570 days"). All were current.

### `v_indicator_freshness`

Compares each series' last revision-0 print against the latest period that
*should* be published, given `indicators.release_lag_days` — expected days after
the **end** of a period before the print appears. Reports `periods_behind` in
the series' own cadence and a three-state `freshness`:

- `current` — has the latest expected period
- `pending` — one period behind; inside release-timing and lag-calibration noise
- `stale` — two or more periods behind; genuinely missing prints

As of 2026-07-23: **117 current, 26 pending, 0 stale.**

`release_lag_days` is seeded from published release calendars (BLS jobs ~8d,
CPI ~13d, GDP advance ~30d, Case-Shiller ~60d, Fed delinquency ~70d, ACS ~270d)
with frequency defaults elsewhere. These are estimates. As the daily cron
accumulates incremental prints, they can be derived empirically from
`created_at` minus period end and replaced.

Known tight: the PCE family and the GSE delinquency series read `pending`
largely because their seeded lags are a few days short.

---

## 3. Classification

`gdp` is **coincident**. It measures the quarter it names. It was previously
`trailing`, which disagreed with the cycle wheel and would have put it in the
wrong row of any leading-vs-trailing tally. Publication lag does not make a
series trailing — by that logic every series would be trailing.

`indicators.classification` is the single source of truth. `app/indicators/
page.js`, `app/research/anatomy/page.js`, and `lib/signals-engine.js` all read
it. If a route hardcodes a role that disagrees, the route is wrong.

---

## 4. Verification

Smoke tests that only check for HTTP 200 and non-null values cannot catch the
GDP class of bug: the site was internally consistent and wrong against BEA. Any
verification pass has to compare at least a few values against the **source**,
not against ourselves.

`cignal_data_inventory.xlsx` in project files is a frozen June 2026 export at 62
indicators. It does not refresh and must not be used to determine what exists.
Query `https://multifamily.cignalsystem.com/api/indicators` (public, no
credentials) instead.
