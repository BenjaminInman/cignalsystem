// U-Haul Growth Index — full-year 2025 (released January 2026).
// Net gain/loss of one-way truck, trailer & U-Box transactions; a directional
// migration gauge, not Census net migration. Tuples are [name, prevRank2024];
// array order = 2025 rank (index + 1). prev === null = not in prior year's ranked list.
// Source: uhaul.com/about/migration. Refreshes annually (next: 2026 midyear ~July 2026).

export const UHAUL = {
  year: "2025",
  released: "January 2026",
  source: "https://www.uhaul.com/About/Migration/",
  states: [
    ["Texas", 2], ["Florida", 4], ["North Carolina", 3], ["Tennessee", 5], ["South Carolina", 1],
    ["Washington", 7], ["Arizona", 6], ["Idaho", 10], ["Alabama", 16], ["Georgia", 15],
    ["Oregon", 34], ["Montana", 24], ["Arkansas", 12], ["Oklahoma", 11], ["Maine", 13],
    ["Utah", 9], ["Kentucky", 25], ["South Dakota", 19], ["Minnesota", 18], ["Nevada", 35],
    ["Mississippi", 39], ["New Mexico", 37], ["Colorado", 40], ["Vermont", 20], ["Indiana", 8],
    ["Wisconsin", 22], ["Alaska", 27], ["Hawaii", 26], ["Missouri", 28], ["Wyoming", 36],
    ["Louisiana", 44], ["New Hampshire", 33], ["Delaware", 21], ["West Virginia", 30], ["Iowa", 23],
    ["Virginia", 17], ["Kansas", 32], ["North Dakota", 31], ["Nebraska", 29], ["Rhode Island", 38],
    ["Michigan", 43], ["Connecticut", 41], ["Ohio", 14], ["Pennsylvania", 46], ["Maryland", 42],
    ["Massachusetts", 49], ["New York", 47], ["New Jersey", 48], ["Illinois", 45], ["California", 50],
  ],
  metros: [
    ["Dallas, TX", 1], ["Houston, TX", 9], ["Austin, TX", 5], ["Charlotte, NC", 2], ["Phoenix, AZ", 3],
    ["Nashville, TN", 6], ["Charleston, SC", 13], ["Raleigh, NC", 7], ["Atlanta, GA", null],
    ["Brownsville & McAllen, TX", 21], ["Lakeland, FL", 4], ["Boise, ID", 17], ["Palm Bay, FL", 8],
    ["Minneapolis, MN", null], ["Spokane, WA", 24], ["San Diego, CA", null], ["San Francisco, CA", null],
    ["Jacksonville, FL", 11], ["Port St. Lucie, FL", null], ["Denver, CO", null], ["San Antonio, TX", null],
    ["Bend, OR", 19], ["College Station, TX", null], ["Miami, FL", null], ["Philadelphia, PA", null],
  ],
  cities: [
    ["Ocala, FL", 1], ["North Port, FL", null], ["Myrtle Beach, SC", 5], ["Kissimmee, FL", 3],
    ["Clermont, FL", 15], ["McKinney, TX", null], ["Fort Lauderdale, FL", null], ["St. Augustine, FL", null],
    ["Daytona Beach, FL", null], ["Panama City, FL", 21], ["Meridian, ID", null], ["North Fort Myers, FL", null],
    ["Fredericksburg, VA", 2], ["Seguin, TX", null], ["New Braunfels, TX", null], ["Leesburg, FL", null],
    ["Auburn, AL", 12], ["Sarasota, FL", null], ["St. Cloud, FL", null], ["Conroe, TX", null],
    ["Sparks, NV", null], ["Garner, NC", null], ["Nampa, ID", null], ["Cookeville, TN", 13], ["Lacey, WA", null],
  ],
};
