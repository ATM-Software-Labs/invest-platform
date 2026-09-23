import { ratio, round } from "../domain/math.js";
import type { UnifiedAssetPayload } from "../types/index.js";
import { FCF_MULTIPLES } from "./constants.js";
import type { FairValueBand, FairValueScenario } from "./types.js";

/**
 * Three-scenario equity value from trailing FCF × historical multiples.
 * Crypto, bonds and FX are marked not_applicable — the LLM must not invent a price.
 */
export function computeFairValue(payload: UnifiedAssetPayload): FairValueBand {
  const currency = payload.quote.currency;
  const currentPrice = payload.quote.price;
  const notes: string[] = [];

  if (payload.assetClass !== "equity") {
    return {
      currency,
      method: "not_applicable",
      fcfUsed: null,
      sharesUsed: null,
      currentPrice,
      currentPFcf: null,
      multiples: { ...FCF_MULTIPLES },
      pessimistic: empty("pessimistic"),
      base: empty("base"),
      optimistic: empty("optimistic"),
      notes: ["FCF multiple bands apply only to equities. Hard-money and macro assets are not DCF-valued here."],
    };
  }

  const fcf = payload.metrics.cashFlow.freeCashFlow;
  const shares = payload.metrics.dilution.dilutedSharesOutstanding;
  const currentPFcf = payload.metrics.multiples.pFcf ?? ratio(payload.quote.marketCap, fcf);

  if (fcf == null || fcf <= 0) {
    notes.push("Trailing FCF is missing or non-positive; bands omitted.");
    return {
      currency,
      method: "historical_fcf_multiples",
      fcfUsed: fcf,
      sharesUsed: shares,
      currentPrice,
      currentPFcf: round(currentPFcf, 4),
      multiples: { ...FCF_MULTIPLES },
      pessimistic: empty("pessimistic"),
      base: empty("base"),
      optimistic: empty("optimistic"),
      notes,
    };
  }

  notes.push(
    `Implied equity value = trailing FCF ${fcf} × multiple. Multiples are engine constants (${FCF_MULTIPLES.pessimistic}/${FCF_MULTIPLES.base}/${FCF_MULTIPLES.optimistic}), not LLM estimates.`,
  );

  const band = (label: FairValueScenario["label"], multiple: number): FairValueScenario => {
    const impliedEquityValue = round(fcf * multiple, 2);
    const impliedPrice =
      shares != null && shares > 0
        ? round((fcf * multiple) / shares, 4)
        : currentPFcf != null && currentPrice != null
          ? round(currentPrice * (multiple / currentPFcf), 4)
          : null;
    return { label, fcfMultiple: multiple, impliedEquityValue, impliedPrice };
  };

  return {
    currency,
    method: "historical_fcf_multiples",
    fcfUsed: fcf,
    sharesUsed: shares,
    currentPrice,
    currentPFcf: round(currentPFcf, 4),
    multiples: { ...FCF_MULTIPLES },
    pessimistic: band("pessimistic", FCF_MULTIPLES.pessimistic),
    base: band("base", FCF_MULTIPLES.base),
    optimistic: band("optimistic", FCF_MULTIPLES.optimistic),
    notes,
  };
}

function empty(label: FairValueScenario["label"]): FairValueScenario {
  return { label, fcfMultiple: null, impliedEquityValue: null, impliedPrice: null };
}
