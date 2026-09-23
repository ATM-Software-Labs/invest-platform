import type { ProviderBundle, ResolvedSymbol } from "../types/index.js";
import type { MarketDataProvider } from "./types.js";

function period(year: number, month = 12, day = 31): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function msft(): ProviderBundle {
  const years = [2024, 2023, 2022, 2021, 2020, 2019];
  const shares = [7460e6, 7472e6, 7542e6, 7608e6, 7683e6, 7753e6];
  const revenue = [245122e6, 211915e6, 198270e6, 168088e6, 143015e6, 125843e6];
  const cogs = [74114e6, 65863e6, 62650e6, 52232e6, 46078e6, 42910e6];
  const opInc = [109433e6, 88523e6, 83383e6, 69916e6, 52959e6, 42959e6];
  const net = [88136e6, 72361e6, 72738e6, 61271e6, 44281e6, 39240e6];
  const ocf = [118548e6, 87582e6, 89035e6, 76740e6, 60675e6, 52185e6];
  const capex = [-44477e6, -28107e6, -23886e6, -20622e6, -15441e6, -13925e6];
  const sbc = [10734e6, 9611e6, 7502e6, 6118e6, 5289e6, 4652e6];
  const cash = [78428e6, 80988e6, 104757e6, 130334e6, 136527e6, 133990e6];
  const stInv = [5721e6, 7654e6, 90877e6 * 0, 0, 0, 0];
  const debt = [67088e6, 59921e6, 60116e6, 67775e6, 63327e6, 78366e6];
  const equity = [268477e6, 206223e6, 166542e6, 141988e6, 118304e6, 102330e6];
  const assets = [512163e6, 411976e6, 364840e6, 333779e6, 301311e6, 286556e6];
  const ebitda = [133005e6, 105226e6, 100239e6, 83831e6, 65725e6, 54620e6];

  return {
    provider: "fixture",
    profile: {
      name: "Microsoft Corporation",
      sector: "Technology",
      industry: "Software",
      country: "US",
      exchange: "NASDAQ",
      currency: "USD",
      isin: "US5949181045",
      cik: "0000789019",
      ipoDate: "1986-03-13",
      accountingStandard: "US_GAAP",
      marketCap: 3.1e12,
      sharesOutstanding: shares[0] ?? null,
      beta: 0.9,
      website: "https://www.microsoft.com",
    },
    quote: {
      price: 415,
      currency: "USD",
      changePercent: 0.4,
      volume: 22_000_000,
      marketCap: 3.1e12,
      asOf: new Date().toISOString(),
      delayed: true,
    },
    incomeAnnual: years.map((y, i) => ({
      period: period(y),
      fiscalYear: y,
      periodType: "annual" as const,
      currency: "USD",
      revenue: revenue[i] ?? null,
      costOfRevenue: cogs[i] ?? null,
      grossProfit: (revenue[i] ?? 0) - (cogs[i] ?? 0),
      operatingIncome: opInc[i] ?? null,
      ebit: opInc[i] ?? null,
      ebitda: ebitda[i] ?? null,
      netIncome: net[i] ?? null,
      incomeTax: Math.round((opInc[i] ?? 0) * 0.18),
      sbc: sbc[i] ?? null,
      dilutedShares: shares[i] ?? null,
    })),
    cashAnnual: years.map((y, i) => ({
      period: period(y),
      fiscalYear: y,
      periodType: "annual" as const,
      currency: "USD",
      operatingCashFlow: ocf[i] ?? null,
      capex: capex[i] ?? null,
      depreciation: 22_000_000_000,
      leasePayments: 2_800_000_000,
      stockBasedCompensation: sbc[i] ?? null,
      freeCashFlowReported: (ocf[i] ?? 0) + (capex[i] ?? 0),
    })),
    balanceAnnual: years.map((y, i) => ({
      period: period(y),
      fiscalYear: y,
      periodType: "annual" as const,
      currency: "USD",
      totalAssets: assets[i] ?? null,
      currentLiabilities: 115_000_000_000,
      totalEquity: equity[i] ?? null,
      cashAndEquivalents: cash[i] ?? null,
      shortTermInvestments: stInv[i] ?? 0,
      shortTermDebt: 8_000_000_000,
      longTermDebt: (debt[i] ?? 0) - 8_000_000_000,
      capitalLeaseObligations: 12_000_000_000,
      totalDebt: debt[i] ?? null,
    })),
    incomeQuarter: [],
    cashQuarter: [],
    balanceQuarter: [],
  };
}

function idrMc(): ProviderBundle {
  const years = [2024, 2023, 2022, 2021, 2020];
  return {
    provider: "fixture",
    profile: {
      name: "Indra Sistemas SA",
      sector: "Industrials",
      industry: "IT Services",
      country: "ES",
      exchange: "MC",
      currency: "EUR",
      isin: "ES0118594417",
      cik: null,
      ipoDate: null,
      accountingStandard: "IFRS",
      marketCap: 3.2e9,
      sharesOutstanding: 176e6,
      beta: 1.1,
      website: "https://www.indracompany.com",
    },
    quote: {
      price: 18.2,
      currency: "EUR",
      changePercent: 0.8,
      volume: 1_200_000,
      marketCap: 3.2e9,
      asOf: new Date().toISOString(),
      delayed: true,
    },
    incomeAnnual: years.map((y, i) => ({
      period: period(y),
      fiscalYear: y,
      periodType: "annual" as const,
      currency: "EUR",
      revenue: 4800e6 - i * 200e6,
      costOfRevenue: 3600e6 - i * 120e6,
      grossProfit: 1200e6 - i * 80e6,
      operatingIncome: 420e6 - i * 40e6,
      ebit: 420e6 - i * 40e6,
      ebitda: 620e6 - i * 40e6,
      netIncome: 280e6 - i * 30e6,
      incomeTax: 90e6,
      sbc: 18e6,
      dilutedShares: 176e6 + i * 2e6,
    })),
    cashAnnual: years.map((y, i) => ({
      period: period(y),
      fiscalYear: y,
      periodType: "annual" as const,
      currency: "EUR",
      operatingCashFlow: 510e6 - i * 30e6,
      capex: -140e6,
      depreciation: 190e6,
      leasePayments: 55e6,
      stockBasedCompensation: 18e6,
      freeCashFlowReported: 370e6 - i * 30e6,
    })),
    balanceAnnual: years.map((y) => ({
      period: period(y),
      fiscalYear: y,
      periodType: "annual" as const,
      currency: "EUR",
      totalAssets: 4900e6,
      currentLiabilities: 2100e6,
      totalEquity: 1200e6,
      cashAndEquivalents: 620e6,
      shortTermInvestments: 40e6,
      shortTermDebt: 180e6,
      longTermDebt: 720e6,
      capitalLeaseObligations: 210e6,
      totalDebt: 1110e6,
    })),
    incomeQuarter: [],
    cashQuarter: [],
    balanceQuarter: [],
  };
}

function rrL(): ProviderBundle {
  return {
    provider: "fixture",
    profile: {
      name: "Rolls-Royce Holdings plc",
      sector: "Industrials",
      industry: "Aerospace",
      country: "GB",
      exchange: "LSE",
      currency: "GBP",
      isin: "GB00B63H8491",
      cik: null,
      ipoDate: null,
      accountingStandard: "IFRS",
      marketCap: 48e9,
      sharesOutstanding: 8400e6,
      beta: 1.4,
      website: "https://www.rolls-royce.com",
    },
    quote: {
      price: 568.4,
      currency: "GBX",
      changePercent: 1.1,
      volume: 18_000_000,
      marketCap: 48e9,
      asOf: new Date().toISOString(),
      delayed: true,
    },
    incomeAnnual: [
      {
        period: period(2024),
        fiscalYear: 2024,
        periodType: "annual",
        currency: "GBP",
        revenue: 17.8e9,
        costOfRevenue: 13.1e9,
        grossProfit: 4.7e9,
        operatingIncome: 2.4e9,
        ebit: 2.4e9,
        ebitda: 3.1e9,
        netIncome: 2.1e9,
        incomeTax: 0.45e9,
        sbc: 0.08e9,
        dilutedShares: 8400e6,
      },
    ],
    cashAnnual: [
      {
        period: period(2024),
        fiscalYear: 2024,
        periodType: "annual",
        currency: "GBP",
        operatingCashFlow: 3.2e9,
        capex: -0.9e9,
        depreciation: 0.7e9,
        leasePayments: 0.18e9,
        stockBasedCompensation: 0.08e9,
        freeCashFlowReported: 2.3e9,
      },
    ],
    balanceAnnual: [
      {
        period: period(2024),
        fiscalYear: 2024,
        periodType: "annual",
        currency: "GBP",
        totalAssets: 32e9,
        currentLiabilities: 14e9,
        totalEquity: 4.2e9,
        cashAndEquivalents: 4.8e9,
        shortTermInvestments: 0.2e9,
        shortTermDebt: 0.6e9,
        longTermDebt: 4.1e9,
        capitalLeaseObligations: 1.1e9,
        totalDebt: 5.8e9,
      },
    ],
    incomeQuarter: [],
    cashQuarter: [],
    balanceQuarter: [],
  };
}

export class FixtureProvider implements MarketDataProvider {
  readonly name = "fixture";

  constructor(private readonly enabledFlag: boolean) {}

  enabled(): boolean {
    return this.enabledFlag;
  }

  async fetch(resolved: ResolvedSymbol): Promise<ProviderBundle> {
    const key = resolved.canonicalTicker.toUpperCase();
    if (key === "MSFT" || key === "MSFT.US") return msft();
    if (key === "NVDA") {
      const bundle = msft();
      bundle.profile = { ...bundle.profile!, name: "NVIDIA Corporation" };
      bundle.quote = { ...bundle.quote!, price: 130, marketCap: 3.2e12 };
      bundle.incomeAnnual = bundle.incomeAnnual.map((r, i) => ({
        ...r,
        sbc: (r.sbc ?? 0) * 2.4,
        dilutedShares: Math.round((r.dilutedShares ?? 1) * (1 + i * 0.04)),
      }));
      bundle.cashAnnual = bundle.cashAnnual.map((r) => ({
        ...r,
        capex: (r.capex ?? 0) * 1.8,
        stockBasedCompensation: (r.stockBasedCompensation ?? 0) * 2.4,
      }));
      return bundle;
    }
    if (key === "BRK.B") {
      const bundle = msft();
      bundle.profile = { ...bundle.profile!, name: "Berkshire Hathaway Inc. Class B" };
      bundle.quote = { ...bundle.quote!, price: 460, marketCap: 9.8e11 };
      bundle.incomeAnnual = bundle.incomeAnnual.map((r) => ({ ...r, sbc: 0 }));
      bundle.cashAnnual = bundle.cashAnnual.map((r) => ({
        ...r,
        stockBasedCompensation: 0,
        capex: (r.capex ?? 0) * 0.4,
      }));
      return bundle;
    }
    if (key === "IDR.MC") return idrMc();
    if (key === "RHM.DE") {
      const bundle = idrMc();
      bundle.profile = { ...bundle.profile!, name: "Rheinmetall AG", country: "DE" };
      bundle.quote = { ...bundle.quote!, price: 620 };
      bundle.balanceAnnual = bundle.balanceAnnual.map((r) => ({
        ...r,
        totalDebt: (r.totalDebt ?? 0) * 1.8,
        longTermDebt: (r.longTermDebt ?? 0) * 1.8,
      }));
      return bundle;
    }
    if (key === "RR.L") return rrL();
    if (["7203.T", "9988.HK", "2330.TW"].includes(key)) {
      const b = idrMc();
      b.profile = {
        ...b.profile!,
        name: key,
        currency: resolved.listingCurrency,
        country: resolved.country ?? null,
        accountingStandard: "IFRS",
      };
      b.quote = { ...b.quote!, currency: resolved.listingCurrency, price: key.endsWith(".T") ? 2680 : 92 };
      return b;
    }
    if (key === "PPFB.DE") {
      return {
        provider: this.name,
        profile: {
          name: "WisdomTree Physical Gold",
          sector: "ETP",
          industry: "Commodities",
          country: "DE",
          exchange: "XETRA",
          currency: "EUR",
          isin: "DE000A1MAVB1",
          cik: null,
          ipoDate: null,
          accountingStandard: "IFRS",
          marketCap: null,
          sharesOutstanding: null,
          beta: null,
          website: null,
        },
        quote: {
          price: 210.4,
          currency: "EUR",
          changePercent: 0.3,
          volume: 12_000,
          marketCap: null,
          asOf: new Date().toISOString(),
          delayed: true,
        },
        incomeAnnual: [],
        incomeQuarter: [],
        cashAnnual: [],
        cashQuarter: [],
        balanceAnnual: [],
        balanceQuarter: [],
      };
    }
    if (resolved.assetClass === "crypto") {
      const circ = resolved.localTicker === "BTC" ? 19.8e6 : resolved.localTicker === "ETH" ? 120.4e6 : 470e6;
      const max = resolved.localTicker === "BTC" ? 21e6 : null;
      const issuance = resolved.localTicker === "BTC" ? 164_250 : resolved.localTicker === "ETH" ? 900_000 : 20e6;
      return {
        provider: this.name,
        quote: {
          price: resolved.localTicker === "BTC" ? 64_000 : resolved.localTicker === "ETH" ? 3_400 : 150,
          currency: resolved.listingCurrency,
          changePercent: 1.2,
          volume: 2.4e10,
          marketCap: resolved.localTicker === "BTC" ? 1.26e12 : 400e9,
          asOf: new Date().toISOString(),
          delayed: false,
        },
        incomeAnnual: [],
        incomeQuarter: [],
        cashAnnual: [],
        cashQuarter: [],
        balanceAnnual: [],
        balanceQuarter: [],
        crypto: {
          name: resolved.localTicker,
          circulatingSupply: circ,
          maxSupply: max,
          totalSupply: circ,
          annualIssuance: issuance,
          hashRate: resolved.localTicker === "BTC" ? 6.2e20 : null,
          transactionCount24h: 450_000,
          activeAddresses24h: 900_000,
        },
      };
    }
    if (resolved.assetClass === "bond") {
      const y = resolved.canonicalTicker === "US02Y" ? 0.041 : resolved.canonicalTicker === "DE10Y" ? 0.024 : resolved.canonicalTicker === "ES10Y" ? 0.031 : 0.042;
      return {
        provider: this.name,
        quote: {
          price: y * 100,
          currency: resolved.listingCurrency,
          changePercent: -0.4,
          volume: null,
          marketCap: null,
          asOf: new Date().toISOString(),
          delayed: true,
        },
        incomeAnnual: [],
        incomeQuarter: [],
        cashAnnual: [],
        cashQuarter: [],
        balanceAnnual: [],
        balanceQuarter: [],
        macro: { yield: y, previousYield: y + 0.001, price: y * 100, asOf: new Date().toISOString() },
      };
    }
    const price = resolved.localTicker === "XAUUSD" || resolved.canonicalTicker.includes("XAU") ? 2320 : 1.085;
    return {
      provider: this.name,
      quote: {
        price,
        currency: resolved.listingCurrency,
        changePercent: 0.15,
        volume: null,
        marketCap: null,
        asOf: new Date().toISOString(),
        delayed: true,
      },
      incomeAnnual: [],
      incomeQuarter: [],
      cashAnnual: [],
      cashQuarter: [],
      balanceAnnual: [],
      balanceQuarter: [],
      macro: { yield: null, previousYield: null, price, asOf: new Date().toISOString() },
    };
  }
}
