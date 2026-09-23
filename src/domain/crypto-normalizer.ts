import type { CryptoFundamentals, DataQuality, NormalizedCryptoMetrics, RawQuote } from "../types/index.js";
import { ratio, round } from "./math.js";

export class CryptoNormalizer {
  normalize(
    crypto: CryptoFundamentals | undefined,
    quote: RawQuote | undefined,
    providers: string[],
  ): NormalizedCryptoMetrics {
    const missing: string[] = [];
    const track = (v: number | null, field: string) => {
      if (v == null) missing.push(field);
      return v;
    };

    const circulating = crypto?.circulatingSupply ?? null;
    const maxSupply = crypto?.maxSupply ?? null;
    const issuance = crypto?.annualIssuance ?? null;
    const inflation = ratio(issuance, circulating);
    const stockToFlow = inflation != null && inflation !== 0 ? 1 / inflation : ratio(circulating, issuance);

    const warnings: string[] = [];
    const fallbacks: string[] = [];
    if (issuance == null && circulating != null && maxSupply != null && maxSupply > circulating) {
      warnings.push("Annual issuance not provided by vendor; stock-to-flow uses circulating/issuance only when issuance exists");
    }
    if (!crypto) fallbacks.push("quote_only_crypto_fundamentals_missing");

    const quality: DataQuality = {
      completeness: round(Math.max(0, 1 - missing.length / 8), 4) ?? 0,
      missingFields: missing,
      fallbacksUsed: fallbacks,
      warnings,
      periodUsed: "ttm",
      asOfFiscalPeriod: quote?.asOf ?? null,
      providers,
    };

    return {
      quoteCurrency: quote?.currency ?? "USD",
      circulatingSupply: track(circulating, "circulatingSupply"),
      maxSupply: track(maxSupply, "maxSupply"),
      supplyRatio: round(ratio(circulating, maxSupply)),
      annualIssuance: issuance,
      annualInflationRate: round(track(inflation, "annualInflationRate")),
      stockToFlow: round(stockToFlow),
      marketCap: quote?.marketCap ?? null,
      network: {
        name: crypto?.name ?? null,
        hashRate: crypto?.hashRate ?? null,
        transactionCount24h: crypto?.transactionCount24h ?? null,
        activeAddresses24h: crypto?.activeAddresses24h ?? null,
      },
      dataQuality: quality,
    };
  }
}

export const cryptoNormalizer = new CryptoNormalizer();
