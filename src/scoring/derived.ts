import { ratio, round } from "../domain/math.js";
import type { UnifiedAssetPayload } from "../types/index.js";
import { DALIO, HARD_MONEY, SPX_CORR_PRIORS } from "./constants.js";
import type { DerivedQuant, ScoringEnrichment } from "./types.js";

export function deriveQuant(payload: UnifiedAssetPayload, enrichment: ScoringEnrichment = {}): DerivedQuant {
  const eq = payload.assetClass === "equity" ? payload.metrics : null;
  const cr = payload.assetClass === "crypto" ? payload.metrics : null;
  const mac = payload.assetClass === "bond" || payload.assetClass === "forex" ? payload.metrics : null;

  const fcf = eq?.cashFlow.freeCashFlow ?? null;
  const netDebt = eq?.capitalStructure.netFinancialDebt ?? null;
  const netDebtToFcf = fcf != null && fcf > 0 ? ratio(netDebt, fcf) : netDebt != null && netDebt <= 0 && fcf != null && fcf > 0 ? netDebt / fcf : null;

  const isPhysicalMetal =
    payload.resolved.instrumentSubtype === "physical_etp" ||
    payload.resolved.instrumentSubtype === "commodity_spot" ||
    payload.resolved.localTicker.startsWith("XAU") ||
    payload.resolved.canonicalTicker.includes("XAU");

  const stockToFlow = cr?.stockToFlow ?? (isPhysicalMetal ? HARD_MONEY.goldStockToFlow : null);
  const hasHardCap = Boolean(cr?.maxSupply && cr.maxSupply > 0) || isPhysicalMetal;

  const spx = resolveSpxCorr(payload, enrichment);
  const inflationResilience = inflationScore(
    payload,
    eq?.margins.gross ?? null,
    netDebtToFcf,
    stockToFlow,
    isPhysicalMetal,
    hasHardCap,
  );
  const realReturn = resolveRealReturn(payload, enrichment, eq?.cashFlow.fcfYield ?? null, mac?.yield ?? null, inflationResilience);
  const balance = balanceStrength(payload, netDebtToFcf, mac?.creditSpreadBps ?? null, hasHardCap, isPhysicalMetal);

  const completeness =
    eq?.dataQuality.completeness ?? cr?.dataQuality.completeness ?? mac?.dataQuality.completeness ?? 0;

  return {
    assetClass: payload.assetClass,
    subtype: payload.resolved.instrumentSubtype,
    localTicker: payload.resolved.localTicker,
    country: payload.resolved.country ?? null,
    currency: payload.quote.currency,
    price: payload.quote.price,
    changePercent: payload.quote.changePercent,
    marketCap: payload.quote.marketCap,
    roic5Y: eq?.profitability.roic5Y ?? null,
    grossMargin: eq?.margins.gross ?? null,
    operatingMargin: eq?.margins.operating ?? null,
    fcf,
    fcfYield: eq?.cashFlow.fcfYield ?? null,
    capexToOcf: eq?.cashFlow.capexToOcf ?? null,
    sbcToFcf: eq?.cashFlow.sbcToFcf ?? null,
    netShareChange1Y: eq?.dilution.netShareChange1Y ?? null,
    netShareChange3Y: eq?.dilution.netShareChange3Y ?? null,
    netShareChange5Y: eq?.dilution.netShareChange5Y ?? null,
    netFinancialDebt: netDebt,
    netDebtToFcf: round(netDebtToFcf, 4),
    evEbitda: eq?.multiples.evEbitda ?? null,
    pFcf: eq?.multiples.pFcf ?? null,
    priceToTangibleBook: enrichment.priceToTangibleBook ?? null,
    shortInterestPercent: enrichment.shortInterestPercent ?? null,
    spxCorrelation: round(spx.value, 4),
    spxCorrelationSource: spx.source,
    inflationResilience: round(inflationResilience, 4),
    realReturn: round(realReturn, 6),
    sovereignOrCorporateBalance: round(balance, 4),
    stockToFlow: stockToFlow,
    supplyInflation: cr?.annualInflationRate ?? null,
    hasHardCap,
    isPhysicalMetal,
    isHardMoneyCandidate: payload.assetClass === "crypto" || isPhysicalMetal,
    yield: mac?.yield ?? null,
    modifiedDuration: mac?.modifiedDuration ?? null,
    creditSpreadBps: mac?.creditSpreadBps ?? null,
    dataCompleteness: completeness,
  };
}

function resolveSpxCorr(
  payload: UnifiedAssetPayload,
  enrichment: ScoringEnrichment,
): { value: number; source: "enrichment" | "asset_class_prior" } {
  if (enrichment.spxCorrelation != null && Number.isFinite(enrichment.spxCorrelation)) {
    return { value: enrichment.spxCorrelation, source: "enrichment" };
  }
  const { assetClass, resolved } = payload;
  if (assetClass === "equity") {
    if (resolved.instrumentSubtype === "physical_etp") return { value: SPX_CORR_PRIORS.equity_physical_etp!, source: "asset_class_prior" };
    if (resolved.country === "US" || resolved.exchange === "US") return { value: SPX_CORR_PRIORS.equity_us!, source: "asset_class_prior" };
    return { value: SPX_CORR_PRIORS.equity_intl!, source: "asset_class_prior" };
  }
  if (assetClass === "crypto") {
    const prior = resolved.localTicker === "BTC" ? SPX_CORR_PRIORS.crypto_btc! : SPX_CORR_PRIORS.crypto_other!;
    return { value: prior, source: "asset_class_prior" };
  }
  if (assetClass === "bond") return { value: SPX_CORR_PRIORS.bond_sovereign!, source: "asset_class_prior" };
  if (resolved.instrumentSubtype === "commodity_spot") return { value: SPX_CORR_PRIORS.forex_metal!, source: "asset_class_prior" };
  return { value: SPX_CORR_PRIORS.forex_fx!, source: "asset_class_prior" };
}

function inflationScore(
  payload: UnifiedAssetPayload,
  gross: number | null,
  netDebtToFcf: number | null,
  s2f: number | null,
  metal: boolean,
  hardCap: boolean,
): number {
  if (metal) return 0.82;
  if (payload.assetClass === "crypto" && hardCap && s2f != null && s2f >= 50) return 0.72;
  if (payload.assetClass === "crypto") return 0.48;
  if (payload.assetClass === "bond") {
    const dur = payload.metrics.modifiedDuration ?? payload.resolved.tenorYears ?? 10;
    let s = dur <= 3 ? 0.58 : dur >= 8 ? 0.28 : 0.42;
    if ((payload.metrics.yield ?? 0) >= 0.04) s += 0.08;
    return Math.min(1, s);
  }
  if (payload.assetClass === "forex") return 0.35;
  let s = 0.45;
  if (gross != null && gross >= 0.4) s = 0.66;
  if (netDebtToFcf != null && netDebtToFcf > 5) s = Math.min(s, 0.32);
  return s;
}

function resolveRealReturn(
  payload: UnifiedAssetPayload,
  enrichment: ScoringEnrichment,
  fcfYield: number | null,
  yld: number | null,
  inflationResilience: number,
): number | null {
  if (enrichment.realReturnAfterDebasement != null) return enrichment.realReturnAfterDebasement;
  if (payload.assetClass === "equity" && fcfYield != null) return fcfYield - DALIO.debasementRate;
  if (payload.assetClass === "bond" && yld != null) return yld - DALIO.debasementRate;
  return null;
}

function balanceStrength(
  payload: UnifiedAssetPayload,
  netDebtToFcf: number | null,
  spreadBps: number | null,
  hardCap: boolean,
  metal: boolean,
): number {
  if (metal || payload.assetClass === "crypto") return 0.45;
  if (payload.assetClass === "bond") {
    if (payload.resolved.canonicalTicker.startsWith("US") && (payload.resolved.tenorYears ?? 10) <= 2) return 0.88;
    if (payload.resolved.canonicalTicker.startsWith("US")) return 0.72;
    if (spreadBps == null) return 0.5;
    if (spreadBps < 80) return 0.74;
    if (spreadBps < 150) return 0.58;
    return 0.32;
  }
  if (payload.assetClass === "forex") return 0.35;
  if (netDebtToFcf == null) return 0.4;
  if (netDebtToFcf <= 0) return 0.95;
  if (netDebtToFcf < 2) return 0.8;
  if (netDebtToFcf < 3) return 0.65;
  if (netDebtToFcf < 5) return 0.4;
  return 0.2;
}

export function pct(value: number | null, digits = 2): string {
  if (value == null) return "n/a";
  return `${(value * 100).toFixed(digits)}%`;
}

export function x(value: number | null, digits = 2): string {
  if (value == null) return "n/a";
  return `${value.toFixed(digits)}x`;
}
