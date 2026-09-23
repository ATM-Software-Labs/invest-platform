import type {
  CryptoPayload,
  EquityPayload,
  ForexPayload,
  NormalizedEquityMetrics,
} from "../../src/types/index.js";

const quality: NormalizedEquityMetrics["dataQuality"] = {
  completeness: 0.95,
  missingFields: [],
  fallbacksUsed: [],
  warnings: [],
  periodUsed: "annual",
  asOfFiscalPeriod: "2024-12-31",
  providers: ["test"],
};

function resolved(partial: EquityPayload["resolved"]): EquityPayload["resolved"] {
  return partial;
}

export function equityPayload(metrics: NormalizedEquityMetrics, price = 100): EquityPayload {
  return {
    identifier: "TEST",
    assetClass: "equity",
    resolved: resolved({
      rawIdentifier: "TEST",
      canonicalTicker: "TEST",
      eodhdTicker: "TEST.US",
      fmpTicker: "TEST",
      localTicker: "TEST",
      assetClass: "equity",
      instrumentSubtype: "common_stock",
      exchange: "US",
      exchangeName: "NYSE/NASDAQ",
      country: "US",
      listingCurrency: "USD",
      reportingCurrency: "USD",
      quoteScale: 1,
      quoteCurrencyNormalized: "USD",
      isAdr: false,
      notes: [],
    }),
    quote: {
      price,
      currency: "USD",
      rawPrice: price,
      rawCurrency: "USD",
      changePercent: 0,
      volume: 1,
      marketCap: 1000,
      enterpriseValue: 1100,
      asOf: "2026-01-01T00:00:00.000Z",
      delayed: true,
    },
    asOf: "2026-01-01T00:00:00.000Z",
    source: { primary: "test", used: ["test"], failed: [] },
    cache: { hit: false, ttlSeconds: 1, store: "memory" },
    metrics,
  };
}

export function compounderMetrics(): NormalizedEquityMetrics {
  return {
    reportingCurrency: "USD",
    accountingStandard: "US_GAAP",
    asOfFiscalPeriod: "2024-12-31",
    periodUsed: "annual",
    margins: { gross: 0.65, operating: 0.35, net: 0.28, fcf: 0.22 },
    profitability: { roicLatest: 0.24, roic5Y: 0.21, roe: 0.3, roa: 0.14 },
    cashFlow: {
      operatingCashFlow: 180,
      capex: 40,
      leasePaymentsIfrs16: 0,
      freeCashFlow: 140,
      fcfYield: 0.035,
      capexToOcf: 40 / 180,
      stockBasedCompensation: 12,
      sbcToFcf: 12 / 140,
    },
    capitalStructure: {
      totalDebt: 80,
      leaseLiabilities: 10,
      cashAndShortTermInvestments: 90,
      netFinancialDebt: -10,
      netDebtIncludingLeases: 0,
      netDebtToEbitda: 0,
    },
    dilution: {
      dilutedSharesOutstanding: 10,
      netShareChange1Y: -0.02,
      netShareChange3Y: -0.05,
      netShareChange5Y: -0.08,
    },
    multiples: { evEbitda: 18, pFcf: 1 / 0.035, evSales: 8, pe: 28 },
    dataQuality: quality,
  };
}

export function deepValueMetrics(): NormalizedEquityMetrics {
  return {
    ...compounderMetrics(),
    margins: { gross: 0.18, operating: 0.06, net: 0.04, fcf: 0.12 },
    profitability: { roicLatest: 0.07, roic5Y: 0.06, roe: 0.05, roa: 0.03 },
    cashFlow: {
      operatingCashFlow: 90,
      capex: 20,
      leasePaymentsIfrs16: 0,
      freeCashFlow: 70,
      fcfYield: 0.14,
      capexToOcf: 20 / 90,
      stockBasedCompensation: 4,
      sbcToFcf: 4 / 70,
    },
    capitalStructure: {
      totalDebt: 200,
      leaseLiabilities: 20,
      cashAndShortTermInvestments: 30,
      netFinancialDebt: 170,
      netDebtIncludingLeases: 190,
      netDebtToEbitda: 4,
    },
    dilution: {
      dilutedSharesOutstanding: 50,
      netShareChange1Y: 0.03,
      netShareChange3Y: 0.08,
      netShareChange5Y: 0.12,
    },
    multiples: { evEbitda: 4.5, pFcf: 6.2, evSales: 0.9, pe: 7 },
  };
}

export function btcPayload(): CryptoPayload {
  return {
    identifier: "BTC",
    assetClass: "crypto",
    resolved: {
      rawIdentifier: "BTC",
      canonicalTicker: "BTC-USD",
      eodhdTicker: "BTC-USD.CC",
      fmpTicker: "BTCUSD",
      localTicker: "BTC",
      assetClass: "crypto",
      instrumentSubtype: "crypto_spot",
      exchange: "CC",
      exchangeName: "Crypto",
      listingCurrency: "USD",
      reportingCurrency: "USD",
      quoteScale: 1,
      quoteCurrencyNormalized: "USD",
      isAdr: false,
      notes: [],
    },
    quote: {
      price: 64_000,
      currency: "USD",
      rawPrice: 64_000,
      rawCurrency: "USD",
      changePercent: 1,
      volume: 1,
      marketCap: 1.26e12,
      enterpriseValue: null,
      asOf: "2026-01-01T00:00:00.000Z",
      delayed: false,
    },
    asOf: "2026-01-01T00:00:00.000Z",
    source: { primary: "test", used: ["test"], failed: [] },
    cache: { hit: false, ttlSeconds: 1, store: "memory" },
    metrics: {
      quoteCurrency: "USD",
      circulatingSupply: 19_800_000,
      maxSupply: 21_000_000,
      supplyRatio: 19.8 / 21,
      annualIssuance: 164_250,
      annualInflationRate: 164_250 / 19_800_000,
      stockToFlow: 19_800_000 / 164_250,
      marketCap: 1.26e12,
      network: { name: "Bitcoin", hashRate: 1, transactionCount24h: 1, activeAddresses24h: 1 },
      dataQuality: { ...quality, periodUsed: "ttm" },
    },
  };
}

export function goldSpotPayload(): ForexPayload {
  return {
    identifier: "XAU/USD",
    assetClass: "forex",
    resolved: {
      rawIdentifier: "XAU/USD",
      canonicalTicker: "XAU/USD",
      eodhdTicker: "XAUUSD.FOREX",
      fmpTicker: "XAUUSD",
      localTicker: "XAUUSD",
      assetClass: "forex",
      instrumentSubtype: "commodity_spot",
      exchange: "FOREX",
      exchangeName: "Bullion",
      listingCurrency: "USD",
      reportingCurrency: "USD",
      quoteScale: 1,
      quoteCurrencyNormalized: "USD",
      isAdr: false,
      notes: [],
    },
    quote: {
      price: 2320,
      currency: "USD",
      rawPrice: 2320,
      rawCurrency: "USD",
      changePercent: 0,
      volume: null,
      marketCap: null,
      enterpriseValue: null,
      asOf: "2026-01-01T00:00:00.000Z",
      delayed: true,
    },
    asOf: "2026-01-01T00:00:00.000Z",
    source: { primary: "test", used: ["test"], failed: [] },
    cache: { hit: false, ttlSeconds: 1, store: "memory" },
    metrics: {
      quoteCurrency: "USD",
      yield: null,
      previousYield: null,
      creditSpreadBps: null,
      benchmarkYield: null,
      benchmarkTicker: null,
      modifiedDuration: null,
      macaulayDuration: null,
      carryDifferential: null,
      tenorYears: null,
      dataQuality: { ...quality, periodUsed: "ttm" },
    },
  };
}
