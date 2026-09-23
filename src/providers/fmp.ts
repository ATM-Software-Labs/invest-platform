import type { AppConfig } from "../config.js";
import { num } from "../domain/math.js";
import type {
  AccountingStandard,
  CompanyProfile,
  CryptoFundamentals,
  MacroSnapshot,
  ProviderBundle,
  RawQuote,
  ResolvedSymbol,
} from "../types/index.js";
import { HttpClient } from "./http.js";
import { mapBalance, mapCash, mapIncome } from "./map-statements.js";
import type { MarketDataProvider } from "./types.js";

export class FmpProvider implements MarketDataProvider {
  readonly name = "fmp";

  constructor(
    private readonly config: AppConfig,
    private readonly http: HttpClient,
  ) {}

  enabled(): boolean {
    return Boolean(this.config.FMP_API_KEY);
  }

  async fetch(resolved: ResolvedSymbol): Promise<ProviderBundle> {
    if (resolved.assetClass === "equity") return this.fetchEquity(resolved);
    if (resolved.assetClass === "crypto") return this.fetchCrypto(resolved);
    if (resolved.assetClass === "bond") return this.fetchMacro(resolved, "treasury");
    return this.fetchMacro(resolved, "fx");
  }

  private async fetchEquity(resolved: ResolvedSymbol): Promise<ProviderBundle> {
    const s = encodeURIComponent(resolved.fmpTicker);
    const [profileRaw, quoteRaw, incomeA, incomeQ, cashA, cashQ, balA, balQ] = await Promise.all([
      this.get<Record<string, unknown>[]>(`/profile/${s}`),
      this.get<Record<string, unknown>[]>(`/quote/${s}`).catch(() => []),
      this.get<Record<string, unknown>[]>(`/income-statement/${s}?period=annual&limit=8`),
      this.get<Record<string, unknown>[]>(`/income-statement/${s}?period=quarter&limit=12`).catch(() => []),
      this.get<Record<string, unknown>[]>(`/cash-flow-statement/${s}?period=annual&limit=8`),
      this.get<Record<string, unknown>[]>(`/cash-flow-statement/${s}?period=quarter&limit=12`).catch(() => []),
      this.get<Record<string, unknown>[]>(`/balance-sheet-statement/${s}?period=annual&limit=8`),
      this.get<Record<string, unknown>[]>(`/balance-sheet-statement/${s}?period=quarter&limit=12`).catch(() => []),
    ]);

    const p = profileRaw[0] ?? {};
    const q = quoteRaw[0] ?? {};
    const profile: CompanyProfile = {
      name: String(p.companyName ?? resolved.canonicalTicker),
      sector: (p.sector as string) ?? null,
      industry: (p.industry as string) ?? null,
      country: (p.country as string) ?? null,
      exchange: (p.exchangeShortName as string) ?? resolved.exchange,
      currency: (p.currency as string) ?? resolved.listingCurrency,
      isin: (p.isin as string) ?? null,
      cik: (p.cik as string) ?? null,
      ipoDate: (p.ipoDate as string) ?? null,
      accountingStandard: this.gaap(String(p.country ?? "")),
      marketCap: num(p.mktCap ?? q.marketCap),
      sharesOutstanding: num(q.sharesOutstanding),
      beta: num(p.beta),
      website: (p.website as string) ?? null,
    };

    const quote: RawQuote = {
      price: num(q.price ?? p.price),
      currency: profile.currency,
      changePercent: num(q.changesPercentage),
      volume: num(q.volume),
      marketCap: profile.marketCap,
      asOf: new Date().toISOString(),
      delayed: true,
    };

    return {
      provider: this.name,
      profile,
      quote,
      incomeAnnual: (incomeA ?? []).map((r) => mapIncome(r, "annual")),
      incomeQuarter: (incomeQ ?? []).map((r) => mapIncome(r, "quarter")),
      cashAnnual: (cashA ?? []).map((r) => mapCash(r, "annual")),
      cashQuarter: (cashQ ?? []).map((r) => mapCash(r, "quarter")),
      balanceAnnual: (balA ?? []).map((r) => mapBalance(r, "annual")),
      balanceQuarter: (balQ ?? []).map((r) => mapBalance(r, "quarter")),
    };
  }

  private async fetchCrypto(resolved: ResolvedSymbol): Promise<ProviderBundle> {
    const symbol = encodeURIComponent(resolved.fmpTicker);
    const quoteArr = await this.get<Record<string, unknown>[]>(`/quote/${symbol}`);
    const q = quoteArr[0] ?? {};
    const crypto: CryptoFundamentals = {
      name: String(q.name ?? resolved.localTicker),
      circulatingSupply: num(q.sharesOutstanding ?? q.circulatingSupply),
      maxSupply: num(q.maxSupply),
      totalSupply: num(q.totalSupply),
      annualIssuance: null,
      hashRate: null,
      transactionCount24h: null,
      activeAddresses24h: null,
    };
    return {
      provider: this.name,
      quote: {
        price: num(q.price),
        currency: resolved.listingCurrency,
        changePercent: num(q.changesPercentage),
        volume: num(q.volume),
        marketCap: num(q.marketCap),
        asOf: new Date().toISOString(),
        delayed: false,
      },
      incomeAnnual: [],
      incomeQuarter: [],
      cashAnnual: [],
      cashQuarter: [],
      balanceAnnual: [],
      balanceQuarter: [],
      crypto,
    };
  }

  private async fetchMacro(resolved: ResolvedSymbol, kind: "treasury" | "fx"): Promise<ProviderBundle> {
    if (kind === "fx") {
      const arr = await this.get<Record<string, unknown>[]>(`/fx/${encodeURIComponent(resolved.fmpTicker)}`).catch(
        () => this.get<Record<string, unknown>[]>(`/quote/${encodeURIComponent(resolved.fmpTicker)}`),
      );
      const q = arr[0] ?? {};
      const price = num(q.price ?? q.bid ?? q.close);
      const macro: MacroSnapshot = { yield: null, previousYield: null, price, asOf: new Date().toISOString() };
      return this.empty(macro, {
        price,
        currency: resolved.listingCurrency,
        changePercent: num(q.changesPercentage),
        volume: null,
        marketCap: null,
        asOf: macro.asOf,
        delayed: true,
      });
    }

    const arr = await this.get<Record<string, unknown>[]>(`/treasury?limit=30`).catch(() => []);
    const tenor = resolved.tenorYears ?? 10;
    const field = tenor <= 2 ? "year2" : tenor <= 5 ? "year5" : tenor <= 10 ? "year10" : "year30";
    const latest = arr[0] ?? {};
    const prev = arr[1] ?? {};
    const y = num(latest[field]);
    const py = num(prev[field]);
    const macro: MacroSnapshot = {
      yield: y,
      previousYield: py,
      price: y,
      asOf: String(latest.date ?? new Date().toISOString()),
    };
    return this.empty(macro, {
      price: y,
      currency: resolved.listingCurrency,
      changePercent: y != null && py != null && py !== 0 ? ((y - py) / py) * 100 : null,
      volume: null,
      marketCap: null,
      asOf: macro.asOf,
      delayed: true,
    });
  }

  private empty(macro: MacroSnapshot, quote: RawQuote): ProviderBundle {
    return {
      provider: this.name,
      quote,
      incomeAnnual: [],
      incomeQuarter: [],
      cashAnnual: [],
      cashQuarter: [],
      balanceAnnual: [],
      balanceQuarter: [],
      macro,
    };
  }

  private gaap(country: string): AccountingStandard {
    const c = country.toUpperCase();
    if (c === "US" || c === "USA" || c === "UNITED STATES") return "US_GAAP";
    if (!c) return "UNKNOWN";
    return "IFRS";
  }

  private get<T>(path: string): Promise<T> {
    const join = path.includes("?") ? "&" : "?";
    const url = `https://financialmodelingprep.com/api/v3${path}${join}apikey=${this.config.FMP_API_KEY}`;
    return this.http.getJson<T>(url);
  }
}
