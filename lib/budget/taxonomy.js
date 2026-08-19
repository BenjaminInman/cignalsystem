// Canonical budget taxonomy — one source of truth for extraction, review, and the driver panel.
// section: revenue | controllable | noncontrollable | excluded | review
// kind: signal (driven by a Cignal/warehouse series) · default (editable, weak data) · formula · derived · exclude
export const BUDGET_CATEGORIES = [
  // ---- Revenue ----
  { key: "market_rent",        label: "Market Rent (GPR)",       section: "revenue",         driver: "Local rent-growth signal",              kind: "signal" },
  { key: "loss_to_lease",      label: "Loss / Gain to Lease",    section: "revenue",         driver: "Loss-to-lease burn-off × phase",         kind: "signal" },
  { key: "vacancy_loss",       label: "Vacancy Loss",            section: "revenue",         driver: "Cycle-phase occupancy path",             kind: "signal" },
  { key: "concessions",        label: "Concessions",             section: "revenue",         driver: "Concession signal (HelloData) + phase",  kind: "signal" },
  { key: "bad_debt",           label: "Bad Debt",                section: "revenue",         driver: "Phase-adjusted default",                 kind: "default" },
  { key: "other_income",       label: "Other Income (fees)",     section: "revenue",         driver: "Tracks rent / occupancy",                kind: "derived" },
  { key: "utility_reimb",      label: "Utility Reimbursements",  section: "revenue",         driver: "Tracks utility expense",                 kind: "linked" },
  { key: "other_reimb",        label: "Other Reimbursements",    section: "revenue",         driver: "Tracks related expense",                 kind: "linked" },
  // ---- Controllable expense ----
  { key: "payroll",            label: "Payroll & Related",       section: "controllable",    driver: "Metro / county wages (LOCAL)",           kind: "signal" },
  { key: "utilities",          label: "Utilities",               section: "controllable",    driver: "Energy CPI",                             kind: "signal" },
  { key: "contract_services",  label: "Contract Services",       section: "controllable",    driver: "Services PPI",                            kind: "signal" },
  { key: "turnover",           label: "Make Ready / Turnover",   section: "controllable",    driver: "Construction PPI + turnover volume",     kind: "signal" },
  { key: "repairs",            label: "Maintenance & Repairs",   section: "controllable",    driver: "Construction / services PPI",            kind: "signal" },
  { key: "marketing",          label: "Marketing",               section: "controllable",    driver: "Inverse occupancy (phase)",              kind: "signal" },
  { key: "administrative",     label: "Administrative",          section: "controllable",    driver: "Core CPI",                               kind: "signal" },
  // ---- Non-controllable ----
  { key: "management_fee",     label: "Management Fee",          section: "noncontrollable", driver: "% of EGI (formula)",                     kind: "formula" },
  { key: "insurance",          label: "Insurance",               section: "noncontrollable", driver: "Editable default — no clean series",      kind: "default" },
  { key: "property_taxes",     label: "Property Taxes",          section: "noncontrollable", driver: "Editable default — local assessment",     kind: "default" },
  // ---- Not part of the operating budget ----
  { key: "below_noi",          label: "Below-NOI (excluded)",    section: "excluded",        driver: "Capex, debt service, D&A — separate",    kind: "exclude" },
  { key: "review",             label: "Other / Needs Review",    section: "review",          driver: "Unclassified — please review",           kind: "review" },
];

export const CAT_BY_KEY = Object.fromEntries(BUDGET_CATEGORIES.map((c) => [c.key, c]));
export const CATEGORY_KEYS = BUDGET_CATEGORIES.map((c) => c.key);
export const SECTION_ORDER = ["revenue", "controllable", "noncontrollable", "excluded", "review"];
export const SECTION_LABEL = {
  revenue: "Income", controllable: "Controllable Expenses",
  noncontrollable: "Non-Controllable Expenses", excluded: "Below NOI (not budgeted)", review: "Needs Review",
};
