import type { ProviderBundle, ResolvedSymbol } from "../types/index.js";

export interface MarketDataProvider {
  readonly name: string;
  enabled(): boolean;
  fetch(resolved: ResolvedSymbol): Promise<ProviderBundle>;
}
