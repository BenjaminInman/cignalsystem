# Cignal System

Market intelligence for the multifamily real estate industry. Cignal System surfaces the
leading and trailing economic signals that move multifamily markets — and shows where each
market sits across the four phases of the cycle.

## Stack

- **Next.js 14** (App Router)
- **Tailwind CSS**
- Deployed on **Vercel** (auto-deploys on push to `main`)

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (what Vercel runs)
```

## Current state (v0.1 — landing page)

- Dark "intelligence dossier" landing page
- Scrolling economic-data ticker
- "What Cignal does" intelligence intro
- Gated suite teaser: Indicators, Market Maps, Forecasts, Signals, Research, Portfolio
- Four-phase market-cycle method section

## ⚠️ Data note

The ticker values in `components/Ticker.js` are **illustrative placeholders**. Replace the
`INDICATORS` array with a live feed before going to production. Candidate public sources:

- **FRED** (Federal Reserve) — 10-yr Treasury, rents, housing starts
- **U.S. Census** — multifamily starts/completions, absorption
- **U.S. Treasury** — daily yield curve
- ATTOM / public records — foreclosure data

## Roadmap

- [ ] Wire ticker to live data sources
- [ ] Authentication (sign-up / log-in)
- [ ] Gated dashboard with the six suite tools
- [ ] Daily economic news feed on the landing page
