// Plain-English guide to the Terminal menu. One source for the dashboard's
// "What now?" panel and the /guide page, so the two never drift apart.
// `pro: true` marks pages that need Cignal Pro (mirrors the nav padlocks;
// the database's tier_access table is still the real gate).

export const GETTING_STARTED = [
  {
    step: "01",
    title: "Find your market's phase",
    body: "Open the Cycle Clock and enter a ZIP code. You'll see which of the four phases that market is in, and which signals are pushing it there.",
    cta: "Open the Cycle Clock",
    href: "/where-are-we",
  },
  {
    step: "02",
    title: "Save the ZIP codes you care about",
    body: "Add your markets under My ZIP Codes on this page. Your dashboard snapshot then tracks them for you every time you log in.",
    cta: "Add ZIP codes",
    href: "#my-zips",
  },
  {
    step: "03",
    title: "Check what's turning",
    body: "Signals shows what changed recently and where leading indicators are pulling away from the trend. That's the early warning.",
    cta: "View Signals",
    href: "/signals",
  },
  {
    step: "04",
    title: "Put it to work on a deal",
    body: "Run a property through the Underwriter, or add your assets to Portfolio to benchmark them against their local market.",
    cta: "Open the Underwriter",
    href: "/underwrite",
    pro: true,
  },
];

export const TERMINAL_GUIDE = [
  {
    group: "Read the market",
    items: [
      { label: "Dashboard", href: "/dashboard", what: "Your home base: a live snapshot of the markets you track, your indicator watchlist, and shortcuts into every tool.", use: "Start every session here." },
      { label: "Signals", href: "/signals", what: "What's changing right now: indicators diverging from their trend, recent turns, and the alerts worth acting on.", use: "Check weekly for early warnings." },
      { label: "Cycle Clock", href: "/where-are-we", what: "Places the national economy and any ZIP code on the four-phase cycle (Recovery, Expansion, Hypersupply, Contraction) and shows the signals behind the call.", use: "Answer \"where are we?\" for any market." },
      { label: "Indicators", href: "/indicators", pro: true, what: "The full library of leading and trailing indicators, from rates and jobs to permits, absorption and rents, with history and detail on each.", use: "Dig into the why behind a phase call." },
      { label: "Market Maps", href: "/market-maps", pro: true, what: "Every major metro scored and ranked on fundamentals, down to submarket level.", use: "Compare markets and find where to look next." },
      { label: "Forecasts", href: "/forecasts", pro: true, what: "Forward projections for rents, vacancy and the leading indicators, market by market.", use: "Set realistic assumptions for the next few years." },
      { label: "Indices", href: "/indices", pro: true, what: "Public-market stocks grouped by the forces moving housing (REITs, builders, lenders, suppliers), read as a confirmation signal.", use: "See whether Wall Street agrees with the data." },
      { label: "Research", href: "/research", pro: true, what: "Canary, the research desk: ask a question in plain English and get an answer grounded in Cignal's data, plus deep-dive briefings.", use: "Turn the data into a thesis." },
      { label: "Community", href: "/community", pro: true, what: "The Cignal Room: members-only live discussion of the signals and the cycle.", use: "Pressure-test your read with other operators." },
    ],
  },
  {
    group: "Workbench",
    items: [
      { label: "Underwriter", href: "/underwrite", pro: true, what: "Type a market or ZIP and the model's forward assumptions fill in from the live cycle read: rent growth, vacancy, exit cap and more.", use: "Underwrite a deal to the cycle, not to hope." },
      { label: "Tools", href: "/tools", pro: true, what: "Litmus Test, the full Underwriting Model, Budget Builder, Market One-Pager, Exit Strategy Analyzer, Portfolio Architect, Market Screener and more.", use: "Download or open the working tools." },
      { label: "Portfolio", href: "/portfolio", pro: true, what: "Enter your properties and track them month over month against live rents, concessions and occupancy in their submarket.", use: "Know how your assets stack up locally." },
    ],
  },
];
