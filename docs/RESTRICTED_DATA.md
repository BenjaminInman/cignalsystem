# Restricted (licensed) data — Conference Board

## Status
The three Conference Board indicators are **stored and computed, but not publicly visible**,
pending a data license/redistribution agreement with The Conference Board.

- `consumer_confidence`   — Consumer Confidence Index® (leading)
- `cb_present_situation`  — Present Situation Index (coincident)
- `cb_expectations`       — Expectations Index (leading)

Currently loaded: 12 confirmed months (Jul 2025 – Jun 2026), primary-source verified.

## How the gate works
`indicators.restricted = true` on these three rows. The public analytics view
`v_indicator_analytics` joins `indicators` and filters `restricted = false`, so restricted
indicators return **zero rows** through every public route (all read the view). The data is
untouched in `mv_indicator_analytics` and `observations` for internal/admin use.

We can keep loading monthly releases into the DB in the meantime — they simply stay dark.

## To un-gate once licensed
1. `update indicators set restricted = false where slug in
   ('consumer_confidence','cb_present_situation','cb_expectations');`
2. Add these slugs to the relevant vertical wheel/signal rosters in `lib/vertical-signals.js`.
3. Confirm the on-site attribution matches the license terms (see `lib/attribution.js`).
4. Refresh: `refresh materialized view concurrently mv_indicator_analytics;`

## Why gated
The Conference Board asserts trademark + redistribution terms over these series. Displaying
the compiled series publicly (free or paid) is redistribution. A license clears both the
display right and the required attribution. Until then: compute internally, show nothing.
