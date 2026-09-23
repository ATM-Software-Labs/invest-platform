import type { AssetClass, UnifiedAssetPayload } from "../types/index.js";

export type ArchetypeId =
  | "buffett"
  | "graham"
  | "lynch"
  | "greenblatt"
  | "burry"
  | "dalio"
  | "soros"
  | "hard_money";

export interface ScoringEnrichment {
  /** P/TBV. If omitted, the factor is scored as insufficient data. */
  priceToTangibleBook?: number | null;
  /** Short interest as a fraction of float (0.08 = 8%). */
  shortInterestPercent?: number | null;
  /** Realized trailing correlation vs SPX, -1..1. Overrides asset-class prior. */
  spxCorrelation?: number | null;
  /** Trailing real return after a stated monetary-debasement rate. */
  realReturnAfterDebasement?: number | null;
  /** Explicit low-cost advantage evidence (Buffett factor). */
  lowCostAdvantage?: boolean;
  /** Visible deleveraging / restructuring catalyst (Burry factor). */
  visibleDeleveragingCatalyst?: boolean;
  /** Notes extracted from filings (LLM-only; never used as a numeric input). */
  filingNotes?: string;
}

export interface ScoreFactor {
  id: string;
  label: string;
  maxPoints: number;
  awarded: number;
  inputValue: number | boolean | null;
  threshold: string;
  passed: boolean | null;
  rationale: string;
}

export interface ArchetypeScore {
  id: ArchetypeId;
  name: string;
  affinity: number;
  maxPoints: number;
  factors: ScoreFactor[];
  insufficientFactors: string[];
}

export interface FairValueScenario {
  label: "pessimistic" | "base" | "optimistic";
  fcfMultiple: number | null;
  impliedEquityValue: number | null;
  impliedPrice: number | null;
}

export interface FairValueBand {
  currency: string;
  method: "historical_fcf_multiples" | "not_applicable";
  fcfUsed: number | null;
  sharesUsed: number | null;
  currentPrice: number | null;
  currentPFcf: number | null;
  multiples: { pessimistic: number; base: number; optimistic: number };
  pessimistic: FairValueScenario;
  base: FairValueScenario;
  optimistic: FairValueScenario;
  notes: string[];
}

export interface DerivedQuant {
  assetClass: AssetClass;
  subtype: string;
  localTicker: string;
  country: string | null;
  currency: string;
  price: number | null;
  changePercent: number | null;
  marketCap: number | null;
  roic5Y: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  fcf: number | null;
  fcfYield: number | null;
  capexToOcf: number | null;
  sbcToFcf: number | null;
  netShareChange1Y: number | null;
  netShareChange3Y: number | null;
  netShareChange5Y: number | null;
  netFinancialDebt: number | null;
  netDebtToFcf: number | null;
  evEbitda: number | null;
  pFcf: number | null;
  priceToTangibleBook: number | null;
  shortInterestPercent: number | null;
  spxCorrelation: number | null;
  spxCorrelationSource: "enrichment" | "asset_class_prior";
  inflationResilience: number | null;
  realReturn: number | null;
  sovereignOrCorporateBalance: number | null;
  stockToFlow: number | null;
  supplyInflation: number | null;
  hasHardCap: boolean;
  isPhysicalMetal: boolean;
  isHardMoneyCandidate: boolean;
  yield: number | null;
  modifiedDuration: number | null;
  creditSpreadBps: number | null;
  dataCompleteness: number;
}

export interface Scorecard {
  identifier: string;
  asOf: string;
  derived: DerivedQuant;
  archetypes: Record<ArchetypeId, ArchetypeScore>;
  ranked: Array<{ id: ArchetypeId; affinity: number }>;
  bestFit: ArchetypeId;
  fairValue: FairValueBand;
  audit: {
    engine: "InvestorScoringEngine";
    version: string;
    mathComputedAt: string;
    enrichmentUsed: string[];
  };
}

export interface ScoreInput {
  payload: UnifiedAssetPayload;
  enrichment?: ScoringEnrichment;
}
