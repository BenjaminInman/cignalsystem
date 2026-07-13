# Sentiment-vs-Fundamentals Cycle Study — Findings Memo

**Status:** Internal research. A validated signal exists; productization pending (see §7).
**Data:** All from owned/free sources (UMich sentiment via FRED, fundamentals via FRED). No licensed data used. No Conference Board dependency.

---

## 1. The question
Does consumer sentiment, measured *relative to* what economic fundamentals justify, carry
information about where we are in the market cycle — and specifically, does optimism/pessimism
beyond fundamentals help predict recessions? This is the empirical test of the "When > How" thesis:
that timing/positioning (sentiment) can matter independent of conditions (fundamentals).

## 2. What we built
- **Confidence gap** = z(UMich sentiment) − z(fundamentals composite), where the fundamentals
  composite = average of z(−unemployment), z(payroll YoY growth), z(real GDP growth).
  Positive gap = optimism beyond fundamentals; negative = pessimism beyond fundamentals.
- **Controls:** yield curve (10yr−3mo spread) and credit spread (BAA−10yr).
- **Target:** NBER recession onset within the next 12 months (monthly) / 4 quarters (quarterly).
- Span: sentiment+fundamentals back to 1952; controlled tests 1986–2026 (credit-spread limited);
  regime 1982–2026 (yield-curve limited).

## 3. What we tested, and what held up

| Test | Result | Verdict |
|---|---|---|
| Narrative/news tone → confidence (12 months) | r ≈ −0.56 | **Died** on 11-yr data (r ≈ −0.06). Noise. Tabled to Phase 2. |
| Sentiment gap vs cycle, descriptive (70 yr) | pre-recession gap −0.32 vs expansion +0.08 | **Held.** Pessimism-below-fundamentals clusters before recessions. |
| Gap + yield curve + credit (controlled logit, 40 yr) | gap z=+4.24, p<0.0001; AUC 0.876→0.906 | **Held.** Gap adds predictive power beyond the yield curve. |
| Gap × yield-curve interaction | interaction z=−5.84, p<0.0001; AUC 0.943 | **Held (in-sample).** Resolved a sign flip into a coherent story. |
| Out-of-sample (train ≤2005, test 2008 never seen) | AUC 0.902 | **Held on discrimination**, but monthly probs thrash (99.9%→0.4%). |
| Quarterly (noise reduction) | interaction p=0.002 holds; standalone gap p=0.17 | **Interaction robust; standalone gap fragile.** |

**Bottom line:** the robust, survivable finding is the **conditional (interaction) relationship**,
not a simple "gap predicts recessions." The gap's meaning depends on the yield-curve regime.

## 4. The core insight (what to build on)
Confidence relative to fundamentals means *opposite things* depending on cycle position:
- **Healthy/steep curve:** strong confidence = genuine fuel; recession essentially never follows within a year.
- **Flat/inverted curve:** strong confidence = complacency at the top; recession risk is elevated.

This is "The Tell" (sentiment–fundamentals divergence) read through cycle context (the curve).

## 5. The regime indicator (the honest product form)
Two axes → four regimes, validated by historical base rate (recession within 1 yr, 1982–2026):

| Regime | Definition | n (quarters) | Recession within 1yr |
|---|---|---|---|
| Genuine Fuel | healthy curve + optimism | 85 | **0%** |
| Wall of Worry | healthy curve + pessimism | 19 | **0%** |
| Stress | warning curve + pessimism | 27 | 15% |
| Complacency | warning curve + optimism | 33 | **36%** |
| (overall base rate) | | 164 | 10% |

Present as a **regime state with its historical base rate**, NOT a false-precision probability
(the monthly probability is too unstable to show — it swings 99%→0% quarter to quarter).

## 6. Current reading (as of 2026 Q2) — caveated
- Confidence gap ≈ −2.9 SD (most negative in the 44-yr record); yield spread ≈ +0.7% (flat).
- Regime: **Stress**. BUT this sits in the post-2022 anomaly: sentiment has been historically
  depressed vs. a solid labor market since 2022 with no recession following. Readings are more
  extreme than anything in the training data → the model is extrapolating. Treat as a **watch, not
  a forecast.** Base rate for "Stress" is only 15%.

## 7. Limits & honest caveats
- Many specifications were tested; some overfitting risk remains (≈12–16 recession events).
- In-sample AUCs (0.94) flatter; out-of-sample (0.88–0.90) is the honest number.
- Causation not established — the gap may predict, or may co-move with, early trouble.
- The ultimate test is real-time performance on the *next* turn; all else is backtest.
- The 2022+ regime may represent a structural shift in the sentiment–fundamentals relationship.

## 8. Recommendation
1. **Productize the regime indicator** (four regimes + base rates + 70-yr context), framed honestly
   as a cycle-context reading, not a recession predictor. License-free, owned, defensible.
2. **Do NOT ship** a recession-probability percentage (too unstable).
3. **Phase 2:** revisit the narrative/news layer only with proper article-level scoring against the
   Expectations sub-index; current evidence does not support it.
4. Keep consumer confidence (UMich now; Conference Board if licensed) as a plain leading indicator
   regardless — its value doesn't depend on this study.
