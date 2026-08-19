"use client";
import BudgetBuilder from "@/components/BudgetBuilder";

export default function BudgetPage() {
  return (
    <div style={{ maxWidth: 940, margin: "0 auto", padding: "28px 16px 60px", color: "#ECEDEF", fontFamily: "Archivo, sans-serif" }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: ".28em", color: "#797E85" }}>WORKBENCH · BUDGET BUILDER</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "8px 0 0" }}>Budget Builder</h1>
      <p style={{ color: "#797E85", fontSize: 13.5, margin: "6px 0 20px", fontFamily: "'IBM Plex Mono', monospace", maxWidth: 680 }}>
        Upload a property’s T-12 and build next year’s budget from local market signals — not a flat percentage.
        First we read and categorize the statement; you confirm it; then every line projects forward on a driver you can see and change.
      </p>
      <BudgetBuilder />
    </div>
  );
}
