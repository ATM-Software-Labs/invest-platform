import type { AppConfig } from "../config.js";
import { num } from "../domain/math.js";
import type { ProviderBundle, ResolvedSymbol } from "../types/index.js";
import { HttpClient } from "./http.js";
import { mapBalance, mapCash, mapIncome } from "./map-statements.js";
import type { MarketDataProvider } from "./types.js";

/**
 * Optional OpenBB Platform REST connector.
 * Point OPENBB_BASE_URL at a self-hosted OpenBB API (e.g. http://127.0.0.1:6900).
 */
export class OpenBbProvider implements MarketDataProvider {
  readonly name = "openbb";

  constructor(
    private readonly config: AppConfig,
    private readonly http: HttpClient,
  ) {}

  enabled(): boolean {
    return Boolean(this.config.OPENBB_BASE_URL);
  }

  async fetch(resolved: ResolvedSymbol): Promise<ProviderBundle> {
    const symbol = encodeURIComponent(resolved.canonicalTicker);
    const headers: Record<string, string> = {};
    if (this.config.OPENBB_API_KEY) headers["Authorization"] = `Bearer ${this.config.OPENBB_API_KEY}`;

    if (resolved.assetClass !== "equity") {
      const quote = await this.tryGet<Record<string, unknown>>(`/api/v1/equity/price/quote?symbol=${symbol}`, headers);
      const price = num(quote?.last_price ?? quote?.price ?? quote?.close);
      return {
        provider: this.name,
        quote: {
          price,
          currency: resolved.listingCurrency,
          changePercent: num(quote?.change_percent),
          volume: num(quote?.volume),
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
        macro: { yield: resolved.assetClass === "bond" ? price : null, previousYield: null, price, asOf: new Date().toISOString() },
      };
    }

    const [quote, income, cash, balance] = await Promise.all([
      this.tryGet<Record<string, unknown>>(`/api/v1/equity/price/quote?symbol=${symbol}`, headers),
      this.tryGet<Record<string, unknown>[]>(`/api/v1/equity/fundamental/income?symbol=${symbol}&period=annual`, headers),
      this.tryGet<Record<string, unknown>[]>(`/api/v1/equity/fundamental/cash?symbol=${symbol}&period=annual`, headers),
      this.tryGet<Record<string, unknown>[]>(`/api/v1/equity/fundamental/balance?symbol=${symbol}&period=annual`, headers),
    ]);

    const rows = (v: unknown) => (Array.isArray(v) ? v : []);

    return {
      provider: this.name,
      quote: {
        price: num(quote?.last_price ?? quote?.price),
        currency: String(quote?.currency ?? resolved.listingCurrency),
        changePercent: num(quote?.change_percent),
        volume: num(quote?.volume),
        marketCap: num(quote?.market_cap),
        asOf: new Date().toISOString(),
        delayed: true,
      },
      incomeAnnual: rows(income).map((r) => mapIncome(r, "annual")),
      incomeQuarter: [],
      cashAnnual: rows(cash).map((r) => mapCash(r, "annual")),
      cashQuarter: [],
      balanceAnnual: rows(balance).map((r) => mapBalance(r, "annual")),
      balanceQuarter: [],
    };
  }

  private async tryGet<T>(path: string, headers: Record<string, string>): Promise<T | null> {
    const base = this.config.OPENBB_BASE_URL.replace(/\/$/, "");
    try {
      return await this.http.getJson<T>(`${base}${path}`, headers);
    } catch {
      return null;
    }
  }
}
