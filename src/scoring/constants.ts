/** Auditable constants. Changing a threshold is a version bump of the scoring engine. */

export const ENGINE_VERSION = "1.2.0";

export const BUFFETT = {
  roic5YMin: 0.15,
  roicPoints: 25,
  grossMarginMin: 0.4,
  grossPoints: 20,
  netDebtToFcfMax: 3,
  leveragePoints: 20,
  sbcToFcfMax: 0.15,
  buybackPoints: 20,
  fcfYieldMin: 0.02,
  fcfYieldMax: 0.1,
  capexToOcfMax: 0.6,
  cashPoints: 15,
} as const;

export const BURRY = {
  evEbitdaMax: 6,
  pFcfMax: 8,
  cheapPoints: 30,
  pTbvMax: 1.2,
  tbvPoints: 25,
  fcfYieldMin: 0.1,
  catalystPoints: 25,
  shortInterestMin: 0.08,
  sentimentPoints: 20,
} as const;

export const DALIO = {
  inflationResilienceMin: 0.8,
  inflationPoints: 30,
  absSpxCorrMax: 0.5,
  corrPoints: 25,
  corrPriorPoints: 10,
  realReturnMin: 0,
  realPoints: 25,
  balanceMin: 0.7,
  balancePoints: 20,
  debasementRate: 0.02,
} as const;

export const GRAHAM = {
  pFcfMax: 12,
  cheapPoints: 40,
  netDebtToFcfMax: 1,
  balancePoints: 30,
  fcfPoints: 30,
} as const;

export const LYNCH = {
  roicMin: 0.1,
  roicPoints: 30,
  fcfYieldMin: 0.025,
  fcfYieldMax: 0.08,
  yieldPoints: 40,
  dilutionMax: 0.05,
  dilutionPoints: 30,
} as const;

export const GREENBLATT = {
  roicMin: 0.15,
  roicPoints: 50,
  evEbitdaMax: 10,
  yieldPoints: 50,
} as const;

export const SOROS = {
  macroInstrumentPoints: 40,
  hedgePoints: 30,
  corrPoints: 30,
} as const;

export const HARD_MONEY = {
  stockToFlowMin: 50,
  s2fPoints: 35,
  agencyPoints: 35,
  decentralizationPoints: 30,
  goldStockToFlow: 59,
} as const;

/** Historical FCF multiples used for the three valuation bands. Not LLM-derived. */
export const FCF_MULTIPLES = {
  pessimistic: 12,
  base: 18,
  optimistic: 25,
} as const;

/**
 * Asset-class priors for SPX correlation when the caller does not supply a realized beta.
 * These are lookup constants, not model estimates.
 */
export const SPX_CORR_PRIORS: Record<string, number> = {
  equity_us: 0.85,
  equity_intl: 0.62,
  equity_physical_etp: 0.08,
  crypto_btc: 0.32,
  crypto_other: 0.48,
  bond_sovereign: -0.12,
  forex_metal: 0.05,
  forex_fx: 0.22,
};
