import { ShieldAlert } from "lucide-react";

export const metadata = { title: "Disclaimer · Cignal System" };

const SECTIONS = [
  {
    h: "Informational and educational purposes only",
    p: `Cignal System (the "Platform"), operated by Cignal System LLC ("we," "us," or "our"), provides economic data, market indicators, analytics, forecasts, scores, and related commentary concerning the multifamily real estate industry. All content on the Platform is provided for general informational and educational purposes only. It is not intended to be, and must not be relied upon as, the sole basis for any investment, business, financial, or other decision.`,
  },
  {
    h: "Not investment, financial, legal, or tax advice",
    p: `Nothing on the Platform constitutes investment advice, financial advice, trading advice, legal advice, tax advice, or any other form of professional advice, and nothing on the Platform should be construed as a recommendation, solicitation, or offer to buy, sell, or hold any security, property, or other asset, or to pursue any investment or operating strategy. We are not a registered investment adviser, broker-dealer, real estate broker, or financial planner. No content on, or access to, the Platform creates an advisory, brokerage, or fiduciary relationship between you and us.`,
  },
  {
    h: "Data sources and accuracy",
    p: `The Platform aggregates and analyzes information obtained from third-party and publicly available sources believed to be reliable, including government agencies and industry data providers. We do not independently verify all such information and make no representation or warranty as to its accuracy, completeness, timeliness, or fitness for any purpose. Data may be delayed, revised, incomplete, or contain errors. You are responsible for independently verifying any information with primary sources before relying on it.`,
  },
  {
    h: "Forecasts and forward-looking statements",
    p: `The Platform may present forecasts, projections, scenarios, indicators, and signals that are inherently forward-looking and based on assumptions and models that may prove incorrect. Forward-looking content is hypothetical, is not a guarantee of future results, and actual outcomes may differ materially. Past performance and historical patterns are not indicative of future results.`,
  },
  {
    h: "No recommendations",
    p: `Indicators, signals, scores, rankings, maps, and similar features are analytical tools intended to inform your own independent judgment. They are not recommendations to buy, sell, hold, finance, or take any other action with respect to any market, property, or investment.`,
  },
  {
    h: "Assumption of risk",
    p: `Real estate and related investments involve substantial risk, including the possible loss of principal. Market conditions can change rapidly and unpredictably. You are solely responsible for your own decisions and for independently evaluating the merits and risks of any course of action.`,
  },
  {
    h: "Consult your own professionals",
    p: `Before making any investment, financial, legal, or tax decision, you should consult your own licensed and qualified professionals who can evaluate your specific circumstances and objectives.`,
  },
  {
    h: "No warranties",
    p: `The Platform and all content are provided "as is" and "as available," without warranties of any kind, whether express or implied, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement. To the fullest extent permitted by law, we disclaim all liability for any loss or damage arising from your use of, or reliance on, the Platform or its content.`,
  },
];

export default function DisclaimerPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-14 pb-24 fade-up">
      <p className="kicker mb-3 flex items-center gap-2">
        <ShieldAlert size={12} className="text-signal" /> Legal
      </p>
      <h1 className="headline text-4xl text-ink md:text-5xl">Disclaimer</h1>
      <p className="mono mt-3 text-[12px] tracking-[0.04em] text-muted">
        Effective June 30, 2026
      </p>

      <p className="mt-8 text-[15px] leading-relaxed text-muted">
        Please read this disclaimer carefully before using Cignal System. By
        accessing or using the Platform, you acknowledge that you have read,
        understood, and agree to the terms below.
      </p>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((s, i) => (
          <section key={i}>
            <h2 className="text-lg font-semibold text-ink">
              {i + 1}. {s.h}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">{s.p}</p>
          </section>
        ))}
      </div>

      <p className="mono mt-12 border-t border-[var(--line)] pt-6 text-[12px] leading-relaxed text-muted/80">
        Cignal System LLC · Questions about this disclaimer:
        info@cignalsystem.com
      </p>
    </div>
  );
}
