import type { AppConfig } from "../config.js";
import type { CacheStore } from "../cache/memory.js";
import { ttlForAssetClass } from "../cache/cache.js";
import { cryptoNormalizer } from "../domain/crypto-normalizer.js";
import { financialNormalizer } from "../domain/financial-normalizer.js";
import { macroNormalizer } from "../domain/macro-normalizer.js";
import { normalizeQuote } from "../domain/quote-normalizer.js";
import { symbolResolver } from "../domain/symbol-resolver.js";
import { ProviderAggregator } from "../providers/aggregator.js";
import { AssetError, type UnifiedAssetPayload } from "../types/index.js";

export class AssetService {
  constructor(
    private readonly config: AppConfig,
    private readonly cache: CacheStore,
    private readonly aggregator: ProviderAggregator,
  ) {}

  async getAsset(rawIdentifier: string, opts: { refresh?: boolean } = {}): Promise<UnifiedAssetPayload> {
    const identifier = rawIdentifier.trim();
    if (!identifier) {
      throw new AssetError(400, "INVALID_IDENTIFIER", "Identifier is required");
    }

    let resolved;
    try {
      resolved = symbolResolver.resolve(identifier);
    } catch (err) {
      throw new AssetError(400, "UNRESOLVABLE_IDENTIFIER", err instanceof Error ? err.message : "Cannot parse identifier");
    }

    const cacheKey = `asset:v1:${resolved.assetClass}:${resolved.canonicalTicker}`;
    const ttl = ttlForAssetClass(this.config, resolved.assetClass);

    if (!opts.refresh) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        const payload = JSON.parse(cached) as UnifiedAssetPayload;
        payload.cache = { hit: true, ttlSeconds: ttl, store: this.cache.kind };
        return payload;
      }
    }

    const { bundle, source } = await this.aggregator.fetch(resolved);
    const hasAny =
      bundle.quote?.price != null ||
      bundle.incomeAnnual.length > 0 ||
      bundle.crypto != null ||
      bundle.macro != null;
    if (!hasAny) {
      throw new AssetError(502, "PROVIDER_UNAVAILABLE", "No market-data vendor returned usable data", {
        identifier,
        resolved,
        source,
      });
    }

    const quote = normalizeQuote(resolved, bundle.quote);
    const marketCap = quote.marketCap;
    const netDebtHint = null;
    quote.enterpriseValue =
      marketCap != null && netDebtHint != null ? marketCap + netDebtHint : quote.enterpriseValue;

    const asOf = quote.asOf ?? new Date().toISOString();
    const providers = source.used;

    let payload: UnifiedAssetPayload;

    if (resolved.assetClass === "equity") {
      const standard = bundle.profile?.accountingStandard ?? (resolved.country === "US" ? "US_GAAP" : "IFRS");
      const metrics = financialNormalizer.fromBundle(bundle, {
        accountingStandard: standard,
        reportingCurrency: bundle.profile?.currency ?? resolved.reportingCurrency,
        marketCap,
        enterpriseValue: quote.enterpriseValue,
        price: quote.price,
        providers,
      });
      if (metrics.capitalStructure.netFinancialDebt != null && marketCap != null) {
        quote.enterpriseValue = marketCap + metrics.capitalStructure.netDebtIncludingLeases!;
        metrics.multiples.evEbitda = financialNormalizer.normalize({
          accountingStandard: standard,
          reportingCurrency: metrics.reportingCurrency,
          incomeAnnual: bundle.incomeAnnual,
          incomeQuarter: bundle.incomeQuarter,
          cashAnnual: bundle.cashAnnual,
          cashQuarter: bundle.cashQuarter,
          balanceAnnual: bundle.balanceAnnual,
          balanceQuarter: bundle.balanceQuarter,
          marketCap,
          enterpriseValue: quote.enterpriseValue,
          price: quote.price,
          providers,
        }).multiples.evEbitda;
      }
      payload = {
        identifier,
        resolved,
        assetClass: "equity",
        quote,
        asOf,
        source,
        cache: { hit: false, ttlSeconds: ttl, store: this.cache.kind },
        metrics,
      };
    } else if (resolved.assetClass === "crypto") {
      payload = {
        identifier,
        resolved,
        assetClass: "crypto",
        quote,
        asOf,
        source,
        cache: { hit: false, ttlSeconds: ttl, store: this.cache.kind },
        metrics: cryptoNormalizer.normalize(bundle.crypto, bundle.quote, providers),
      };
    } else {
      const benchmark = resolved.assetClass === "bond" && resolved.canonicalTicker !== "US10Y"
        ? await this.lookupUs10Y()
        : resolved.canonicalTicker === "US10Y"
          ? bundle.macro?.yield ?? quote.price
          : null;
      const metrics = macroNormalizer.normalize({
        resolved,
        yieldValue: bundle.macro?.yield ?? (resolved.assetClass === "bond" ? quote.price : null),
        previousYield: bundle.macro?.previousYield ?? null,
        benchmarkYield: benchmark,
        quoteCurrency: quote.currency,
        providers,
        asOf,
      });
      payload =
        resolved.assetClass === "bond"
          ? {
              identifier,
              resolved,
              assetClass: "bond",
              quote,
              asOf,
              source,
              cache: { hit: false, ttlSeconds: ttl, store: this.cache.kind },
              metrics,
            }
          : {
              identifier,
              resolved,
              assetClass: "forex",
              quote,
              asOf,
              source,
              cache: { hit: false, ttlSeconds: ttl, store: this.cache.kind },
              metrics,
            };
    }

    await this.cache.set(cacheKey, JSON.stringify(payload), ttl);
    return payload;
  }

  private async lookupUs10Y(): Promise<number | null> {
    try {
      const us = await this.getAsset("US10Y");
      if (us.assetClass === "bond") return us.metrics.yield;
      return null;
    } catch {
      return 0.042;
    }
  }
}
