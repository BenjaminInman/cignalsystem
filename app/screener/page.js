"use client";
import MarketScreener from "@/components/MarketScreener";

export default function ScreenerPage() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 16px 60px", color: "#ECEDEF", fontFamily: "Archivo, sans-serif" }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: ".28em", color: "#797E85" }}>WORKBENCH · MARKET SCREENER</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "8px 0 0" }}>Market Screener</h1>
      <p style={{ color: "#797E85", fontSize: 13.5, margin: "6px 0 18px", fontFamily: "'IBM Plex Mono', monospace", maxWidth: 680 }}>
        Every metro, ranked by cycle. Sort by momentum, filter by phase, find where to look — then export the screen as CSV.
        Signals are cross-metro z-scores from the same engine as the Underwriter.
      </p>
      <MarketScreener />
    </div>
  );
}
