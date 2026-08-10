"use client";
import LitmusTest from "@/components/LitmusTest";

export default function LitmusPage() {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 16px 60px", color: "#ECEDEF", fontFamily: "Archivo, sans-serif" }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: ".28em", color: "#797E85" }}>WORKBENCH · LITMUS TEST</div>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "8px 0 0" }}>Litmus Test</h1>
      <p style={{ color: "#797E85", fontSize: 13.5, margin: "6px 0 20px", fontFamily: "'IBM Plex Mono', monospace", maxWidth: 620 }}>
        A 30-second go/no-go on a deal — no market, no cycle, just the numbers against your minimum bar.
        Pass, and it earns the full model. Fail, and it doesn’t get another look.
      </p>
      <LitmusTest />
    </div>
  );
}
