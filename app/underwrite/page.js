"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Underwriter from "@/components/Underwriter";

const METROS = [
  { cbsa: "28940", name: "Knoxville, TN" },
  { cbsa: "34980", name: "Nashville, TN" },
  { cbsa: "12060", name: "Atlanta, GA" },
  { cbsa: "19100", name: "Dallas–Fort Worth, TX" },
  { cbsa: "12420", name: "Austin, TX" },
  { cbsa: "38060", name: "Phoenix, AZ" },
  { cbsa: "16740", name: "Charlotte, NC" },
  { cbsa: "39580", name: "Raleigh, NC" },
  { cbsa: "45300", name: "Tampa, FL" },
  { cbsa: "19740", name: "Denver, CO" },
];

export default function UnderwritePage() {
  const [tier, setTier] = useState("free");
  const [sel, setSel] = useState(METROS[0]);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      sb.from("profiles").select("tier").eq("id", user.id).single()
        .then(({ data }) => setTier(data?.tier || "free"));
    });
  }, []);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 16px 60px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0B1F3A", margin: 0 }}>Underwriter</h1>
      <p style={{ color: "#64748b", fontSize: 14, margin: "6px 0 18px" }}>
        A cycle-adjusted multifamily model. Enter a deal; the forward assumptions auto-fill from the market’s
        Cignal read, and it runs the full pro forma with a live Sell-vs-Refinance recommendation.
      </p>
      <label style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>Market</label>
      <select
        value={sel.cbsa}
        onChange={(e) => setSel(METROS.find((m) => m.cbsa === e.target.value))}
        style={{ display: "block", width: "100%", maxWidth: 320, margin: "6px 0 20px", padding: "9px 12px",
                 border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14 }}
      >
        {METROS.map((m) => (<option key={m.cbsa} value={m.cbsa}>{m.name}</option>))}
      </select>
      <Underwriter cbsa={sel.cbsa} marketName={sel.name} userTier={tier} />
    </div>
  );
}
