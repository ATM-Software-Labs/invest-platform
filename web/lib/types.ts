export type AssetClass = "equity" | "crypto" | "bond" | "forex";
export type ArchetypeId =
  | "buffett"
  | "graham"
  | "lynch"
  | "greenblatt"
  | "burry"
  | "dalio"
  | "soros"
  | "hard_money";

export interface ResolvedSymbol {
  rawIdentifier: string;
  canonicalTicker: string;
  eodhdTicker: string;
  fmpTicker: string;
  localTicker: string;
  assetClass: AssetClass;
  instrumentSubtype: string;
  exchange: string;
  exchangeName: string;
  mic?: string;
  country?: string;
  listingCurrency: string;
  reportingCurrency: string;
  quoteScale: number;
  quoteCurrencyNormalized: string;
  isAdr: boolean;
  adrTicker?: string;
  tenorYears?: number;
  notes: string[];
}

export interface NormalizedQuote {
  price: number | null;
  currency: string;
  rawPrice: number | null;
  rawCurrency: string;
  changePercent: number | null;
  volume: number | null;
  marketCap: number | null;
  enterpriseValue: number | null;
  asOf: string | null;
  delayed: boolean;
}

export interface UnifiedAssetPayload {
  identifier: string;
  assetClass: AssetClass;
  resolved: ResolvedSymbol;
  quote: NormalizedQuote;
  asOf: string;
  metrics: Record<string, unknown>;
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
  narrative?: string | null;
}

export interface DerivedQuant {
  assetClass: AssetClass;
  subtype: string;
  localTicker: string;
  country: string | null;
  currency: string;
  price: number | null;
  changePercent?: number | null;
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
  stockToFlow: number | null;
  dataCompleteness: number;
  netDebtToEbitda?: number | null;
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
    engine: string;
    version: string;
    mathComputedAt: string;
    enrichmentUsed: string[];
  };
}

export interface LlmQualitative {
  executiveSummary: string;
  moatAnalysis: {
    type: "network_effects" | "switching_costs" | "intangible_assets" | "cost_advantage" | "none";
    rationale: string;
  };
  capitalAllocationVerdict: {
    stance:
      | "shareholder_friendly"
      | "reinvestment_heavy"
      | "dilutive"
      | "balance_sheet_repair"
      | "not_applicable";
    rationale: string;
  };
  keyRisks: Array<{
    code:
      | "covert_dilution"
      | "high_rate_refinancing"
      | "regulatory_or_vie_china"
      | "technological_disruption"
      | "custody_or_counterparty"
      | "liquidity"
      | "other";
    detail: string;
  }>;
  portfolioFit: {
    conservative: "poor" | "neutral" | "good";
    growth: "poor" | "neutral" | "good";
    value: "poor" | "neutral" | "good";
    macro: "poor" | "neutral" | "good";
    rationale: string;
  };
  fairValueNarrative: string;
}

export interface InstitutionalAnalysis {
  identifier: string;
  asOf: string;
  scoring: Scorecard;
  qualitative: LlmQualitative | null;
  fairValueScenarios: FairValueBand;
  provenance: {
    math: "deterministic_engine";
    language: "llm" | "omitted";
    model: string | null;
    factsHash: string;
  };
}

export interface InvestAssetViewModel {
  asset: UnifiedAssetPayload;
  analysis: InstitutionalAnalysis;
  displayName: string;
}
