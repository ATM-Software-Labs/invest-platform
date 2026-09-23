import type { ProviderBundle } from "../types/index.js";

export function emptyBundle(provider = "merged"): ProviderBundle {
  return {
    provider,
    incomeAnnual: [],
    incomeQuarter: [],
    cashAnnual: [],
    cashQuarter: [],
    balanceAnnual: [],
    balanceQuarter: [],
  };
}

export function mergeBundles(parts: ProviderBundle[]): ProviderBundle {
  const merged = emptyBundle();
  const providers: string[] = [];
  for (const part of parts) {
    providers.push(part.provider);
    merged.profile ??= part.profile;
    merged.quote ??= part.quote;
    if (part.quote && merged.quote && merged.quote.price == null && part.quote.price != null) {
      merged.quote = part.quote;
    }
    if (!merged.incomeAnnual.length && part.incomeAnnual.length) merged.incomeAnnual = part.incomeAnnual;
    if (!merged.incomeQuarter.length && part.incomeQuarter.length) merged.incomeQuarter = part.incomeQuarter;
    if (!merged.cashAnnual.length && part.cashAnnual.length) merged.cashAnnual = part.cashAnnual;
    if (!merged.cashQuarter.length && part.cashQuarter.length) merged.cashQuarter = part.cashQuarter;
    if (!merged.balanceAnnual.length && part.balanceAnnual.length) merged.balanceAnnual = part.balanceAnnual;
    if (!merged.balanceQuarter.length && part.balanceQuarter.length) merged.balanceQuarter = part.balanceQuarter;
    merged.crypto ??= part.crypto;
    merged.macro ??= part.macro;
    if (part.profile && merged.profile) {
      merged.profile = {
        ...part.profile,
        ...Object.fromEntries(Object.entries(merged.profile).filter(([, v]) => v != null && v !== "")),
      } as typeof merged.profile;
    }
  }
  merged.provider = providers.join("+") || "merged";
  return merged;
}

export function isSufficient(bundle: ProviderBundle, assetClass: string): boolean {
  if (assetClass === "equity") {
    return Boolean(bundle.quote?.price != null && bundle.incomeAnnual.length && bundle.cashAnnual.length && bundle.balanceAnnual.length);
  }
  if (assetClass === "crypto") {
    return Boolean(bundle.quote?.price != null && bundle.crypto?.circulatingSupply != null);
  }
  return bundle.quote?.price != null || bundle.macro?.yield != null || bundle.macro?.price != null;
}
