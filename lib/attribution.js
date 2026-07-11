// Source attribution / trademark notices for third-party data.
//
// Some providers (notably The Conference Board) assert trademark and
// redistribution terms over their series. Where we surface those indicators,
// we show an explicit attribution line. Keyed by the indicators.source value.

export const SOURCE_ATTRIBUTION = {
  "Conference Board": {
    short: "The Conference Board",
    // Shown near any Conference Board indicator.
    notice:
      "Consumer Confidence Index®, Present Situation Index, and Expectations Index are products of The Conference Board. “Consumer Confidence Index®” is a registered trademark of The Conference Board. Figures shown are sourced from The Conference Board’s public releases; The Conference Board is not affiliated with, and does not endorse, Cignal System.",
    url: "https://www.conference-board.org/topics/consumer-confidence/",
  },
};

// Registered-trademark display names (adds ® where appropriate in labels).
export const TRADEMARKED_LABELS = {
  consumer_confidence: "Consumer Confidence Index®",
  cb_present_situation: "Present Situation Index",
  cb_expectations: "Expectations Index",
};

export function attributionFor(source) {
  return SOURCE_ATTRIBUTION[source] || null;
}
