// Metros Canary has a direct multifamily read for (rent / jobs / vacancy).
// Keep in sync with the METROS list in app/api/research/route.js. Used to gate
// the "Ask Canary" chips so they only appear where Canary can truly answer.
const CANARY_CITIES = [
  "new york", "los angeles", "chicago", "dallas", "houston", "washington",
  "atlanta", "miami", "phoenix", "seattle", "san francisco", "austin",
  "nashville", "charlotte", "tampa", "orlando", "denver", "raleigh",
];

export function canaryCovers(name) {
  if (!name) return false;
  const n = String(name).toLowerCase();
  return CANARY_CITIES.some((c) => n.includes(c));
}
