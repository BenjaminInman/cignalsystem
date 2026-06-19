// PODS Moving Trends Report — 2026 (published May 27, 2026).
// Based on PODS container-move customer relocations; a directional customer-move
// gauge, not Census net migration. Tuples are [market, prevRank2025]; array order
// = 2026 rank (index + 1). prev === null = not ranked in the prior year.
// Source: pods.com/blog/moving-trends. Refreshes annually (plus a summer report).

export const PODS = {
  year: "2026",
  released: "May 2026",
  source: "https://www.pods.com/blog/moving-trends",
  movein: [
    ["Myrtle Beach, SC / Wilmington, NC", 1], ["Ocala, FL", 2], ["Dallas-Fort Worth, TX", 5],
    ["Raleigh, NC", 3], ["Greenville-Spartanburg, SC", 4], ["Charlotte, NC", 6], ["Boise, ID", 7],
    ["Knoxville, TN", 8], ["Sarasota, FL", null], ["Jacksonville, FL", 10], ["Nashville, TN", 9],
    ["Spokane, WA", 15], ["Chattanooga, TN", 11], ["Phoenix, AZ", null], ["San Antonio, TX", 19],
    ["Orlando, FL", null], ["Grand Rapids, MI", null], ["Johnson City, TN", 14], ["Dover, DE", 20],
    ["Huntsville, AL", 12],
  ],
  moveout: [
    ["Los Angeles, CA", 1], ["South Florida (Miami)", 3], ["Northern California (SF)", 2],
    ["Washington, DC", 14], ["Long Island, NY", 4], ["Central Jersey, NJ", 6], ["Boston, MA", 8],
    ["Hudson Valley, NY", 9], ["Chicago, IL", 7], ["San Diego, CA", 5], ["Seattle, WA", 12],
    ["Denver, CO", 10], ["Baltimore, MD", null], ["Stockton-Modesto, CA", 13], ["Santa Barbara, CA", 11],
    ["El Paso, TX", null], ["Bakersfield, CA", 19], ["Fresno, CA", 17], ["Hartford, CT", 15],
    ["Memphis, TN", null],
  ],
};
