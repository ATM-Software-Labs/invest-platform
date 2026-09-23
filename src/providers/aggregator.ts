import type { AppConfig } from "../config.js";
import type { ProviderAttribution, ProviderBundle, ResolvedSymbol } from "../types/index.js";
import { EodhdProvider } from "./eodhd.js";
import { FixtureProvider } from "./fixtures.js";
import { FmpProvider } from "./fmp.js";
import { HttpClient } from "./http.js";
import { emptyBundle, isSufficient, mergeBundles } from "./merge.js";
import { OpenBbProvider } from "./openbb.js";
import type { MarketDataProvider } from "./types.js";
import { YahooQuoteProvider } from "./yahoo.js";

export class ProviderAggregator {
  private readonly providers: MarketDataProvider[];
  private readonly fixtures: FixtureProvider;

  constructor(config: AppConfig) {
    const http = new HttpClient(config);
    this.fixtures = new FixtureProvider(config.ENABLE_DEMO_FIXTURES);
    this.providers = [
      new YahooQuoteProvider(config, http),
      new EodhdProvider(config, http),
      new FmpProvider(config, http),
      new OpenBbProvider(config, http),
    ];
  }

  async fetch(resolved: ResolvedSymbol): Promise<{ bundle: ProviderBundle; source: ProviderAttribution }> {
    const used: string[] = [];
    const failed: Array<{ provider: string; reason: string }> = [];
    const parts: ProviderBundle[] = [];

    for (const provider of this.providers) {
      if (!provider.enabled()) continue;
      try {
        const bundle = await provider.fetch(resolved);
        parts.push(bundle);
        used.push(provider.name);
        if (isSufficient(mergeBundles(parts), resolved.assetClass)) break;
      } catch (err) {
        failed.push({
          provider: provider.name,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    let bundle = mergeBundles(parts);
    if (!isSufficient(bundle, resolved.assetClass) && this.fixtures.enabled()) {
      const fx = await this.fixtures.fetch(resolved);
      if (bundle.quote?.price != null) fx.quote = undefined;
      bundle = mergeBundles([...parts, fx].filter((b) => b.quote || b.incomeAnnual.length || b.crypto || b.macro));
      used.push("fixture");
    }

    if (!bundle.quote && !bundle.profile && !bundle.crypto && !bundle.macro && !bundle.incomeAnnual.length) {
      bundle = emptyBundle();
    }

    return {
      bundle,
      source: {
        primary: used[0] ?? "none",
        used,
        failed,
      },
    };
  }
}
