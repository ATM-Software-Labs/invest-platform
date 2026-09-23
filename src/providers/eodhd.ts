import type { AppConfig } from "../config.js";
import { num } from "../domain/math.js";
import type {
  AccountingStandard,
  BalanceSheet,
  CashFlowStatement,
  CompanyProfile,
  CryptoFundamentals,
  IncomeStatement,
  MacroSnapshot,
  PeriodType,
  ProviderBundle,
  RawQuote,
  ResolvedSymbol,
} from "../types/index.js";
import { HttpClient } from "./http.js";
import { mapBalance, mapCash, mapIncome } from "./map-statements.js";
import type { MarketDataProvider } from "./types.js";

export class EodhdProvider implements MarketDataProvider {
  readonly name = "eodhd";

  constructor(
    private readonly config: AppConfig,
    private readonly http: HttpClient,
  ) {}

  enabled(): boolean {
    return Boolean(this.config.EODHD_API_TOKEN);
  }

  async fetch(resolved: ResolvedSymbol): Promise<ProviderBundle> {
    if (resolved.assetClass === "equity") return this.fetchEquity(resolved);
    if (resolved.assetClass === "crypto") return this.fetchCrypto(resolved);
    if (resolved.assetClass === "bond") return this.fetchBond(resolved);
    return this.fetchForex(resolved);
  }

  private async fetchEquity(resolved: ResolvedSymbol): Promise<ProviderBundle> {
    const ticker = encodeURIComponent(resolved.eodhdTicker);
    const [fundamentals, quote] = await Promise.all([
      this.get<Record<string, unknown>>(`/fundamentals/${ticker}`),
      this.get<Record<string, unknown>>(`/real-time/${ticker}`).catch(() => null),
    ]);

    const general = (fundamentals.General ?? {}) as Record<string, unknown>;
    const highlights = (fundamentals.Highlights ?? {}) as Record<string, unknown>;
    const financials = (fundamentals.Financials ?? {}) as Record<string, unknown>;
    const income = (financials.Income_Statement ?? {}) as Record<string, unknown>;
    const cash = (financials.Cash_Flow ?? {}) as Record<string, unknown>;
    const balance = (financials.Balance_Sheet ?? {}) as Record<string, unknown>;

    const profile: CompanyProfile = {
      name: String(general.Name ?? general.Code ?? resolved.canonicalTicker),
      sector: (general.Sector as string) ?? null,
      industry: (general.Industry as string) ?? null,
      country: (general.CountryISO as string) ?? (general.CountryName as string) ?? null,
      exchange: (general.Exchange as string) ?? resolved.exchange,
      currency: (general.CurrencyCode as string) ?? resolved.listingCurrency,
      isin: (general.ISIN as string) ?? null,
      cik: (general.CIK as string) ?? null,
      ipoDate: (general.IPODate as string) ?? null,
      accountingStandard: this.gaap(general),
      marketCap: num(highlights.MarketCapitalization),
      sharesOutstanding: num(highlights.SharesOutstanding ?? general.SharesOutstanding),
      beta: num(highlights.Beta),
      website: (general.WebURL as string) ?? null,
    };

    return {
      provider: this.name,
      profile,
      quote: this.mapQuote(quote, profile.currency, profile.marketCap),
      incomeAnnual: this.statementMap(income.yearly, "annual", mapIncome),
      incomeQuarter: this.statementMap(income.quarterly, "quarter", mapIncome),
      cashAnnual: this.statementMap(cash.yearly, "annual", mapCash),
      cashQuarter: this.statementMap(cash.quarterly, "quarter", mapCash),
      balanceAnnual: this.statementMap(balance.yearly, "annual", mapBalance),
      balanceQuarter: this.statementMap(balance.quarterly, "quarter", mapBalance),
    };
  }

  private async fetchCrypto(resolved: ResolvedSymbol): Promise<ProviderBundle> {
    const ticker = encodeURIComponent(resolved.eodhdTicker);
    const [quote, fundamentals] = await Promise.all([
      this.get<Record<string, unknown>>(`/real-time/${ticker}`),
      this.get<Record<string, unknown>>(`/fundamentals/${ticker}`).catch(() => null),
    ]);
    const stats = (fundamentals?.Statistics ?? fundamentals ?? {}) as Record<string, unknown>;
    const crypto: CryptoFundamentals = {
      name: String(stats.Name ?? resolved.localTicker),
      circulatingSupply: num(stats.CirculatingSupply ?? stats.circulatingSupply),
      maxSupply: num(stats.MaxSupply ?? stats.maxSupply),
      totalSupply: num(stats.TotalSupply ?? stats.totalSupply),
      annualIssuance: num(stats.AnnualIssuance),
      hashRate: num(stats.HashRate),
      transactionCount24h: num(stats.TransactionsPerDay),
      activeAddresses24h: num(stats.ActiveAddresses),
    };
    return {
      provider: this.name,
      quote: this.mapQuote(quote, resolved.listingCurrency, num(stats.MarketCapitalization)),
      incomeAnnual: [],
      incomeQuarter: [],
      cashAnnual: [],
      cashQuarter: [],
      balanceAnnual: [],
      balanceQuarter: [],
      crypto,
    };
  }

  private async fetchBond(resolved: ResolvedSymbol): Promise<ProviderBundle> {
    const ticker = encodeURIComponent(resolved.eodhdTicker);
    const quote = await this.get<Record<string, unknown>>(`/real-time/${ticker}`).catch(() => null);
    const eod = await this.get<Array<Record<string, unknown>>>(
      `/eod/${ticker}?order=d&period=d&from=${this.isoDaysAgo(10)}`,
    ).catch(() => []);
    const latest = Array.isArray(eod) ? eod[0] : null;
    const prev = Array.isArray(eod) ? eod[1] : null;
    const close = num(quote?.close ?? quote?.price ?? latest?.close);
    const prevClose = num(quote?.previousClose ?? prev?.close);
    const macro: MacroSnapshot = {
      yield: close,
      previousYield: prevClose,
      price: close,
      asOf: String(quote?.timestamp ? new Date(Number(quote.timestamp) * 1000).toISOString() : latest?.date ?? null),
    };
    return this.macroBundle(macro, this.mapQuote(quote, resolved.listingCurrency, null));
  }

  private async fetchForex(resolved: ResolvedSymbol): Promise<ProviderBundle> {
    const ticker = encodeURIComponent(resolved.eodhdTicker);
    const quote = await this.get<Record<string, unknown>>(`/real-time/${ticker}`);
    return this.macroBundle(
      {
        yield: null,
        previousYield: null,
        price: num(quote.close ?? quote.price),
        asOf: quote.timestamp ? new Date(Number(quote.timestamp) * 1000).toISOString() : null,
      },
      this.mapQuote(quote, resolved.listingCurrency, null),
    );
  }

  private macroBundle(macro: MacroSnapshot, quote: RawQuote): ProviderBundle {
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

  private mapQuote(
    raw: Record<string, unknown> | null,
    currency: string | null,
    marketCap: number | null,
  ): RawQuote {
    const price = num(raw?.close ?? raw?.price ?? raw?.last);
    return {
      price,
      currency,
      changePercent: num(raw?.change_p ?? raw?.changePercent),
      volume: num(raw?.volume),
      marketCap,
      asOf: raw?.timestamp ? new Date(Number(raw.timestamp) * 1000).toISOString() : new Date().toISOString(),
      delayed: true,
    };
  }

  private statementMap<T extends IncomeStatement | CashFlowStatement | BalanceSheet>(
    block: unknown,
    periodType: Exclude<PeriodType, "ttm">,
    mapper: (row: Record<string, unknown>, periodType: Exclude<PeriodType, "ttm">) => T,
  ): T[] {
    if (!block || typeof block !== "object") return [];
    const rows = Object.entries(block as Record<string, Record<string, unknown>>).map(([period, row]) =>
      mapper({ ...row, date: row.date ?? period }, periodType),
    );
    return rows.sort((a, b) => b.period.localeCompare(a.period));
  }

  private gaap(general: Record<string, unknown>): AccountingStandard {
    const gics = String(general.GicSector ?? "");
    const country = String(general.CountryISO ?? general.CountryName ?? "");
    const std = String(general.InternationalDomestic ?? general.GAAP ?? "").toUpperCase();
    if (std.includes("IFRS")) return "IFRS";
    if (std.includes("US") || country === "US" || country === "USA") return "US_GAAP";
    if (["DE", "ES", "FR", "GB", "NL", "IT", "JP", "HK", "TW", "AU", "CH"].includes(country)) return "IFRS";
    if (gics) return country === "United States" ? "US_GAAP" : "IFRS";
    return "UNKNOWN";
  }

  private isoDaysAgo(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  }

  private get<T>(path: string): Promise<T> {
    const join = path.includes("?") ? "&" : "?";
    const url = `https://eodhd.com/api${path}${join}api_token=${this.config.EODHD_API_TOKEN}&fmt=json`;
    return this.http.getJson<T>(url);
  }
}
