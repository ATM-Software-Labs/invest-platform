import { round } from "../domain/math.js";
import type { Scorecard } from "../scoring/types.js";
import type { UnifiedAssetPayload } from "../types/index.js";

/** Compact, LLM-safe fact sheet. All numbers originate in the scoring engine. */
export function buildFactsPack(payload: UnifiedAssetPayload, scorecard: Scorecard): Record<string, unknown> {
  const fv = scorecard.fairValue;
  return {
    identifier: payload.identifier,
    canonicalTicker: payload.resolved.canonicalTicker,
    assetClass: payload.assetClass,
    subtype: payload.resolved.instrumentSubtype,
    exchange: payload.resolved.exchange,
    country: payload.resolved.country ?? null,
    listingCurrency: payload.resolved.listingCurrency,
    quoteCurrency: payload.quote.currency,
    asOf: payload.asOf,
    quote: {
      price: payload.quote.price,
      marketCap: payload.quote.marketCap,
    },
    derived: scorecard.derived,
    archetypeAffinities: Object.fromEntries(
      Object.values(scorecard.archetypes).map((a) => [
        a.id,
        {
          affinity: a.affinity,
          maxPoints: a.maxPoints,
          factors: a.factors.map((f) => ({
            id: f.id,
            awarded: f.awarded,
            maxPoints: f.maxPoints,
            passed: f.passed,
            inputValue: f.inputValue,
            threshold: f.threshold,
            rationale: f.rationale,
          })),
        },
      ]),
    ),
    bestFit: scorecard.bestFit,
    fairValueScenarios: {
      method: fv.method,
      currency: fv.currency,
      fcfUsed: fv.fcfUsed,
      sharesUsed: fv.sharesUsed,
      currentPrice: fv.currentPrice,
      currentPFcf: fv.currentPFcf,
      multiples: fv.multiples,
      pessimistic: fv.pessimistic,
      base: fv.base,
      optimistic: fv.optimistic,
      notes: fv.notes,
    },
    engine: {
      name: scorecard.audit.engine,
      version: scorecard.audit.version,
      computedAt: scorecard.audit.mathComputedAt,
    },
    reminder: "Do not calculate. Copy figures from this object only.",
    roundedHelper: {
      fcfYieldPct: round((scorecard.derived.fcfYield ?? 0) * 100, 2),
    },
  };
}

export function collectAllowedNumbers(facts: Record<string, unknown>): string[] {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) {
      out.add(String(v));
      out.add(v.toFixed(2));
      out.add(v.toFixed(4));
      out.add(String(Math.round(v)));
      if (Math.abs(v) <= 1) out.add((v * 100).toFixed(2));
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(facts);
  return [...out];
}
