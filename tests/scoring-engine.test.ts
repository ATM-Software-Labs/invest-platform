import { describe, expect, it } from "vitest";
import { FCF_MULTIPLES } from "../src/scoring/constants.js";
import { InvestorScoringEngine } from "../src/scoring/investor-scoring-engine.js";
import { btcPayload, compounderMetrics, deepValueMetrics, equityPayload, goldSpotPayload } from "./helpers/payloads.js";

const engine = new InvestorScoringEngine();

describe("InvestorScoringEngine", () => {
  it("scores a quality compounder on the Buffett archetype at 100", () => {
    const card = engine.score(equityPayload(compounderMetrics(), 140));
    expect(card.archetypes.buffett.affinity).toBe(100);
    expect(card.archetypes.buffett.factors.every((f) => f.passed === true)).toBe(true);
    expect(card.bestFit).toBe("buffett");
    expect(card.archetypes.hard_money.affinity).toBe(0);
  });

  it("computes FCF fair-value bands with engine multiples, not estimates", () => {
    const card = engine.score(equityPayload(compounderMetrics(), 140));
    expect(card.fairValue.method).toBe("historical_fcf_multiples");
    expect(card.fairValue.multiples).toEqual(FCF_MULTIPLES);
    expect(card.fairValue.pessimistic.impliedEquityValue).toBe(140 * 12);
    expect(card.fairValue.base.impliedEquityValue).toBe(140 * 18);
    expect(card.fairValue.optimistic.impliedEquityValue).toBe(140 * 25);
    expect(card.fairValue.pessimistic.impliedPrice).toBeCloseTo((140 * 12) / 10, 6);
  });

  it("scores deep value on Burry when cheap multiples, TBV, catalyst and short interest are present", () => {
    const card = engine.score(equityPayload(deepValueMetrics(), 20), {
      priceToTangibleBook: 0.9,
      visibleDeleveragingCatalyst: true,
      shortInterestPercent: 0.12,
    });
    expect(card.archetypes.burry.affinity).toBe(100);
    expect(card.bestFit).toBe("burry");
    expect(card.archetypes.buffett.affinity).toBeLessThan(50);
  });

  it("awards zero on P/TBV and short interest when enrichment is missing (no invented numbers)", () => {
    const card = engine.score(equityPayload(deepValueMetrics(), 20));
    const tbv = card.archetypes.burry.factors.find((f) => f.id === "burry_ptbv")!;
    const short = card.archetypes.burry.factors.find((f) => f.id === "burry_short_interest")!;
    expect(tbv.passed).toBeNull();
    expect(tbv.awarded).toBe(0);
    expect(short.passed).toBeNull();
    expect(short.awarded).toBe(0);
  });

  it("scores Bitcoin as hard money with high stock-to-flow and no agency risk", () => {
    const card = engine.score(btcPayload());
    expect(card.archetypes.hard_money.affinity).toBe(100);
    expect(card.bestFit).toBe("hard_money");
    expect(card.fairValue.method).toBe("not_applicable");
    expect(card.fairValue.base.impliedPrice).toBeNull();
  });

  it("scores physical gold high on hard money but not a perfect Dalio 100", () => {
    const card = engine.score(goldSpotPayload());
    expect(card.derived.stockToFlow).toBe(59);
    expect(card.archetypes.hard_money.affinity).toBe(92);
    expect(card.archetypes.dalio.affinity).toBeLessThan(70);
    expect(card.bestFit).toBe("hard_money");
  });

  it("does not give Ethereum a perfect hard-money score without a hard cap", () => {
    const btc = engine.score(btcPayload());
    const ethLike = structuredClone(btcPayload());
    ethLike.identifier = "ETH";
    ethLike.resolved.localTicker = "ETH";
    ethLike.resolved.canonicalTicker = "ETH-USD";
    ethLike.metrics.maxSupply = null;
    ethLike.metrics.circulatingSupply = 120_400_000;
    ethLike.metrics.annualIssuance = 900_000;
    ethLike.metrics.stockToFlow = 120_400_000 / 900_000;
    const eth = engine.score(ethLike);
    expect(btc.archetypes.hard_money.affinity).toBe(100);
    expect(eth.archetypes.hard_money.affinity).toBeLessThan(40);
  });

  it("is a pure function of payload + enrichment (no LLM)", () => {
    const a = engine.score(equityPayload(compounderMetrics()));
    const b = engine.score(equityPayload(compounderMetrics()));
    expect(a.archetypes.buffett.affinity).toBe(b.archetypes.buffett.affinity);
    expect(a.derived.netDebtToFcf).toBeLessThan(3);
  });
});
