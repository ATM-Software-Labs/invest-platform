export type AssetClass = "equity" | "crypto" | "bond" | "forex";

export type AccountingStandard = "IFRS" | "US_GAAP" | "UNKNOWN";

export type PeriodType = "annual" | "quarter" | "ttm";

export type InstrumentSubtype =
  | "common_stock"
  | "adr"
  | "etp"
  | "physical_etp"
  | "crypto_spot"
  | "sovereign_yield"
  | "fx_spot"
  | "commodity_spot";

export interface QuotePair {
  base: string;
  quote: string;
}

export interface ResolvedSymbol {
  rawIdentifier: string;
  canonicalTicker: string;
  eodhdTicker: string;
  fmpTicker: string;
  localTicker: string;
  assetClass: AssetClass;
  instrumentSubtype: InstrumentSubtype;
  exchange: string;
  exchangeName: string;
  mic?: string;
  country?: string;
  listingCurrency: string;
  reportingCurrency: string;
  quoteScale: number;
  quoteCurrencyNormalized: string;
  quotePair?: QuotePair;
  isAdr: boolean;
  adrUnderlying?: string;
  adrTicker?: string;
  tenorYears?: number;
  notes: string[];
}

export interface DataQuality {
  completeness: number;
  missingFields: string[];
  fallbacksUsed: string[];
  warnings: string[];
  periodUsed: PeriodType;
  asOfFiscalPeriod: string | null;
  providers: string[];
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

export interface NormalizedEquityMetrics {
  reportingCurrency: string;
  accountingStandard: AccountingStandard;
  asOfFiscalPeriod: string | null;
  periodUsed: PeriodType;
  margins: {
    gross: number | null;
    operating: number | null;
    net: number | null;
    fcf: number | null;
  };
  profitability: {
    roicLatest: number | null;
    roic5Y: number | null;
    roe: number | null;
    roa: number | null;
  };
  cashFlow: {
    operatingCashFlow: number | null;
    capex: number | null;
    leasePaymentsIfrs16: number | null;
    freeCashFlow: number | null;
    fcfYield: number | null;
    capexToOcf: number | null;
    stockBasedCompensation: number | null;
    sbcToFcf: number | null;
  };
  capitalStructure: {
    totalDebt: number | null;
    leaseLiabilities: number | null;
    cashAndShortTermInvestments: number | null;
    netFinancialDebt: number | null;
    netDebtIncludingLeases: number | null;
    netDebtToEbitda: number | null;
  };
  dilution: {
    dilutedSharesOutstanding: number | null;
    netShareChange1Y: number | null;
    netShareChange3Y: number | null;
    netShareChange5Y: number | null;
  };
  multiples: {
    evEbitda: number | null;
    pFcf: number | null;
    evSales: number | null;
    pe: number | null;
  };
  dataQuality: DataQuality;
}

export interface NormalizedCryptoMetrics {
  quoteCurrency: string;
  circulatingSupply: number | null;
  maxSupply: number | null;
  supplyRatio: number | null;
  annualIssuance: number | null;
  annualInflationRate: number | null;
  stockToFlow: number | null;
  marketCap: number | null;
  network: {
    name: string | null;
    hashRate: number | null;
    transactionCount24h: number | null;
    activeAddresses24h: number | null;
  };
  dataQuality: DataQuality;
}

export interface NormalizedMacroMetrics {
  quoteCurrency: string;
  yield: number | null;
  previousYield: number | null;
  creditSpreadBps: number | null;
  benchmarkYield: number | null;
  benchmarkTicker: string | null;
  modifiedDuration: number | null;
  macaulayDuration: number | null;
  carryDifferential: number | null;
  tenorYears: number | null;
  dataQuality: DataQuality;
}

export interface ProviderAttribution {
  primary: string;
  used: string[];
  failed: Array<{ provider: string; reason: string }>;
}

export interface CacheMeta {
  hit: boolean;
  ttlSeconds: number;
  store: "memory" | "redis" | "none";
}

interface AssetPayloadBase {
  identifier: string;
  resolved: ResolvedSymbol;
  quote: NormalizedQuote;
  asOf: string;
  source: ProviderAttribution;
  cache: CacheMeta;
}

export interface EquityPayload extends AssetPayloadBase {
  assetClass: "equity";
  metrics: NormalizedEquityMetrics;
}

export interface CryptoPayload extends AssetPayloadBase {
  assetClass: "crypto";
  metrics: NormalizedCryptoMetrics;
}

export interface BondPayload extends AssetPayloadBase {
  assetClass: "bond";
  metrics: NormalizedMacroMetrics;
}

export interface ForexPayload extends AssetPayloadBase {
  assetClass: "forex";
  metrics: NormalizedMacroMetrics;
}

export type UnifiedAssetPayload =
  | EquityPayload
  | CryptoPayload
  | BondPayload
  | ForexPayload;

export interface IncomeStatement {
  period: string;
  fiscalYear: number | null;
  periodType: Exclude<PeriodType, "ttm">;
  currency: string;
  revenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  ebit: number | null;
  ebitda: number | null;
  netIncome: number | null;
  incomeTax: number | null;
  sbc: number | null;
  dilutedShares: number | null;
}

export interface CashFlowStatement {
  period: string;
  fiscalYear: number | null;
  periodType: Exclude<PeriodType, "ttm">;
  currency: string;
  operatingCashFlow: number | null;
  capex: number | null;
  depreciation: number | null;
  leasePayments: number | null;
  stockBasedCompensation: number | null;
  freeCashFlowReported: number | null;
}

export interface BalanceSheet {
  period: string;
  fiscalYear: number | null;
  periodType: Exclude<PeriodType, "ttm">;
  currency: string;
  totalAssets: number | null;
  currentLiabilities: number | null;
  totalEquity: number | null;
  cashAndEquivalents: number | null;
  shortTermInvestments: number | null;
  shortTermDebt: number | null;
  longTermDebt: number | null;
  capitalLeaseObligations: number | null;
  totalDebt: number | null;
}

export interface CompanyProfile {
  name: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  exchange: string | null;
  currency: string | null;
  isin: string | null;
  cik: string | null;
  ipoDate: string | null;
  accountingStandard: AccountingStandard;
  marketCap: number | null;
  sharesOutstanding: number | null;
  beta: number | null;
  website: string | null;
}

export interface RawQuote {
  price: number | null;
  currency: string | null;
  changePercent: number | null;
  volume: number | null;
  marketCap: number | null;
  asOf: string | null;
  delayed: boolean;
}

export interface CryptoFundamentals {
  name: string | null;
  circulatingSupply: number | null;
  maxSupply: number | null;
  totalSupply: number | null;
  annualIssuance: number | null;
  hashRate: number | null;
  transactionCount24h: number | null;
  activeAddresses24h: number | null;
}

export interface MacroSnapshot {
  yield: number | null;
  previousYield: number | null;
  price: number | null;
  asOf: string | null;
}

export interface ProviderBundle {
  provider: string;
  profile?: CompanyProfile;
  quote?: RawQuote;
  incomeAnnual: IncomeStatement[];
  incomeQuarter: IncomeStatement[];
  cashAnnual: CashFlowStatement[];
  cashQuarter: CashFlowStatement[];
  balanceAnnual: BalanceSheet[];
  balanceQuarter: BalanceSheet[];
  crypto?: CryptoFundamentals;
  macro?: MacroSnapshot;
}

export class AssetError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AssetError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
