import type { AppConfig } from "../config.js";
import { num } from "../domain/math.js";
import type { ProviderBundle, RawQuote, ResolvedSymbol } from "../types/index.js";
import { HttpClient } from "./http.js";
import type { MarketDataProvider } from "./types.js";

export interface YahooQuoteHit {
  price: number;
  changePercent: number | null;
  currency: string;
  marketCap: number | null;
  asOf: string;
}

interface YahooMap {
  symbol: string;
  scale: number;
  asPercent: boolean;
}

const ID_MAP: Record<string, YahooMap> = {
  MSFT: { symbol: "MSFT", scale: 1, asPercent: false },
  NVDA: { symbol: "NVDA", scale: 1, asPercent: false },
  "BRK.B": { symbol: "BRK-B", scale: 1, asPercent: false },
  "IDR.MC": { symbol: "IDR.MC", scale: 1, asPercent: false },
  "RHM.DE": { symbol: "RHM.DE", scale: 1, asPercent: false },
  "RR.L": { symbol: "RR.L", scale: 1, asPercent: false },
  "7203.T": { symbol: "7203.T", scale: 1, asPercent: false },
  "9988.HK": { symbol: "9988.HK", scale: 1, asPercent: false },
  "2330.TW": { symbol: "2330.TW", scale: 1, asPercent: false },
  "PPFB.DE": { symbol: "PPFB.DE", scale: 1, asPercent: false },
  BTC: { symbol: "BTC-USD", scale: 1, asPercent: false },
  ETH: { symbol: "ETH-USD", scale: 1, asPercent: false },
  SOL: { symbol: "SOL-USD", scale: 1, asPercent: false },
  US10Y: { symbol: "^TNX", scale: 1, asPercent: true },
  US02Y: { symbol: "2YY=F", scale: 1, asPercent: true },
  BUND10Y: { symbol: "DE10Y=RR", scale: 1, asPercent: true },
  BONO10Y: { symbol: "ES10Y=RR", scale: 1, asPercent: true },
  "EUR/USD": { symbol: "EURUSD=X", scale: 1, asPercent: false },
  "USD/JPY": { symbol: "JPY=X", scale: 1, asPercent: false },
  "XAU/USD": { symbol: "GC=F", scale: 1, asPercent: false },
};

export function yahooMapForIdentifier(id: string): YahooMap | null {
  const raw = id.trim();
  const known = ID_MAP[raw.toUpperCase()] ?? ID_MAP[raw];
  if (known) return known;
  const u = raw.toUpperCase();
  if (/^[A-Z]{1,5}(\.[A-Z])?$/.test(u) || /^[A-Z]{1,5}-[A-Z]$/.test(u)) {
    return { symbol: u.replace(".", "-"), scale: 1, asPercent: false };
  }
  if (/^[A-Z0-9.-]+\.(MC|DE|L|T|HK|TW|PA|AS|TO|AX|SW|KS)$/.test(u)) {
    return { symbol: u, scale: 1, asPercent: false };
  }
  if (/^[A-Z]{2,10}-USD$/.test(u)) {
    return { symbol: u, scale: 1, asPercent: false };
  }
  return null;
}

export function yahooMapForResolved(resolved: ResolvedSymbol): YahooMap | null {
  return (
    yahooMapForIdentifier(resolved.rawIdentifier) ??
    yahooMapForIdentifier(resolved.canonicalTicker) ??
    yahooMapForIdentifier(resolved.localTicker)
  );
}

export class YahooQuoteProvider implements MarketDataProvider {
  readonly name = "yahoo";

  constructor(
    private readonly config: AppConfig,
    private readonly http: HttpClient,
  ) {}

  enabled(): boolean {
    return this.config.ENABLE_LIVE_QUOTES && this.config.NODE_ENV !== "test";
  }

  async fetch(resolved: ResolvedSymbol): Promise<ProviderBundle> {
    const map = yahooMapForResolved(resolved);
    if (!map) throw new Error(`No Yahoo mapping for ${resolved.canonicalTicker}`);
    const hits = await fetchYahooQuotes(this.http, [map.symbol]);
    const hit = hits.get(map.symbol);
    if (!hit) throw new Error(`Yahoo empty for ${map.symbol}`);
    const quote = toQuote(hit, map, resolved.listingCurrency);
    const yieldValue = map.asPercent ? (quote.price ?? 0) / 100 : null;
    return {
      provider: this.name,
      quote,
      incomeAnnual: [],
      incomeQuarter: [],
      cashAnnual: [],
      cashQuarter: [],
      balanceAnnual: [],
      balanceQuarter: [],
      macro: map.asPercent
        ? { yield: yieldValue, previousYield: null, price: quote.price, asOf: quote.asOf }
        : undefined,
    };
  }
}

export async function fetchYahooQuotes(http: HttpClient, symbols: string[]): Promise<Map<string, YahooQuoteHit>> {
  const unique = [...new Set(symbols.filter(Boolean))];
  const out = new Map<string, YahooQuoteHit>();
  await Promise.all(
    unique.map(async (symbol) => {
      try {
        const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
        const json = await http.getJson<{
          chart?: { result?: Array<{ meta?: Record<string, unknown> }> };
        }>(url, { "User-Agent": "Mozilla/5.0 (compatible; invest-platform/1.1)" });
        const meta = json.chart?.result?.[0]?.meta;
        const price = num(meta?.regularMarketPrice);
        if (price == null) return;
        const prev = num(meta?.chartPreviousClose);
        const ts = num(meta?.regularMarketTime);
        out.set(symbol, {
          price,
          changePercent: prev && prev !== 0 ? price / prev - 1 : null,
          currency: String(meta?.currency ?? "USD"),
          marketCap: num(meta?.marketCap),
          asOf: ts != null ? new Date(ts * 1000).toISOString() : new Date().toISOString(),
        });
      } catch {
        /* keep going */
      }
    }),
  );
  return out;
}

function toQuote(hit: YahooQuoteHit, map: YahooMap, fallbackCurrency: string): RawQuote {
  const penny = hit.currency === "GBp" || hit.currency === "GBX";
  const raw = map.asPercent && hit.price > 20 ? hit.price / 10 : hit.price;
  const price = (penny ? raw / 100 : raw) / map.scale;
  return {
    price,
    currency: penny ? "GBP" : map.asPercent ? hit.currency || "USD" : hit.currency || fallbackCurrency,
    changePercent: hit.changePercent,
    volume: null,
    marketCap: hit.marketCap,
    asOf: hit.asOf,
    delayed: true,
  };
}
