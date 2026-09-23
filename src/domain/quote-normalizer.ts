import type { NormalizedQuote, RawQuote, ResolvedSymbol } from "../types/index.js";
import { round } from "./math.js";

const PENNY_CURRENCIES = new Set(["GBX", "GBP", "GBp", "GBX"]);

export function normalizeQuote(resolved: ResolvedSymbol, raw?: RawQuote): NormalizedQuote {
  const scale = resolved.quoteScale || 1;
  const rawPrice = raw?.price ?? null;
  const rawCurrency = (raw?.currency ?? resolved.listingCurrency).toUpperCase();
  const needsPennyScale =
    scale === 100 || rawCurrency === "GBX" || (resolved.exchange === "L" && PENNY_CURRENCIES.has(rawCurrency) && (rawPrice ?? 0) > 20);

  const divisor = needsPennyScale ? 100 : scale === 100 ? 100 : 1;
  const price = rawPrice == null ? null : rawPrice / divisor;
  const currency = divisor === 100 ? "GBP" : resolved.quoteCurrencyNormalized || rawCurrency;

  return {
    price: round(price, 6),
    currency,
    rawPrice,
    rawCurrency,
    changePercent: round(raw?.changePercent ?? null, 4),
    volume: raw?.volume ?? null,
    marketCap: raw?.marketCap ?? null,
    enterpriseValue: null,
    asOf: raw?.asOf ?? null,
    delayed: raw?.delayed ?? true,
  };
}
