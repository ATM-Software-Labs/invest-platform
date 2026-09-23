export const WACC_ESTIMATE = 0.08;

export function pct(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function multiple(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}×`;
}

export function compactNumber(value: number | null | undefined, currency?: string): string {
  if (value == null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  const unit =
    abs >= 1e12 ? `${(abs / 1e12).toFixed(2)}T` : abs >= 1e9 ? `${(abs / 1e9).toFixed(2)}B` : abs >= 1e6 ? `${(abs / 1e6).toFixed(2)}M` : abs.toFixed(abs >= 100 ? 0 : 2);
  return currency ? `${sign}${unit} ${currency}` : `${sign}${unit}`;
}

export function priceDigits(value: number): number {
  return Math.abs(value) >= 100 ? 2 : Math.abs(value) >= 1 ? 3 : 5;
}

export function priceAmount(value: number | null | undefined, digits?: number): string {
  if (value == null || Number.isNaN(value)) return "—";
  const d = digits ?? priceDigits(value);
  return value.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function price(value: number | null | undefined, currency: string, digits?: number): string {
  if (value == null || Number.isNaN(value)) return "—";
  const amount = priceAmount(value, digits);
  return currency ? `${amount} ${currency}` : amount;
}

export function signedPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${pct(value, 2)}`;
}

export function clsx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function isMissingNumber(value: number | null | undefined): boolean {
  return value == null || Number.isNaN(value);
}

/** Treat engine placeholder zeros as missing when the statement set is empty. */
export function isPlaceholderZero(value: number | null | undefined, completeness: number | null | undefined): boolean {
  if (isMissingNumber(value)) return true;
  return (completeness ?? 0) < 0.15 && value === 0;
}

export function formatPct(value: number | null | undefined, digits = 1): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatMultiple(value: number | null | undefined, digits = 2): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return `${value.toFixed(digits)}×`;
}

export function toneClass(kind: "up" | "down" | "warn" | "neutral"): string {
  if (kind === "up") return "text-signal-up";
  if (kind === "down") return "text-signal-down";
  if (kind === "warn") return "text-signal-warn";
  return "text-neutral-500";
}

export function metricTone(args: {
  value: number | null;
  goodWhen: "high" | "low" | "negative";
  warnAt?: number;
  failAt?: number;
}): "up" | "down" | "warn" | "neutral" {
  const { value, goodWhen, warnAt, failAt } = args;
  if (value == null) return "neutral";
  if (goodWhen === "negative") {
    if (value < 0) return "up";
    if (value > 0.02) return "down";
    return "warn";
  }
  if (goodWhen === "high") {
    if (failAt != null && value < failAt) return "down";
    if (warnAt != null && value < warnAt) return "warn";
    return "up";
  }
  if (failAt != null && value > failAt) return "down";
  if (warnAt != null && value > warnAt) return "warn";
  return "up";
}

export const COUNTRY_FLAG: Record<string, string> = {
  US: "🇺🇸",
  ES: "🇪🇸",
  DE: "🇩🇪",
  GB: "🇬🇧",
  HK: "🇭🇰",
  JP: "🇯🇵",
  TW: "🇹🇼",
  GL: "🌐",
  FR: "🇫🇷",
  NL: "🇳🇱",
  CH: "🇨🇭",
  CN: "🇨🇳",
  AU: "🇦🇺",
  CA: "🇨🇦",
  KR: "🇰🇷",
};

export const ASSET_CLASS_LABEL: Record<string, string> = {
  equity: "Acción cotizada",
  crypto: "Criptoactivo",
  bond: "Deuda soberana",
  forex: "Divisa / materia prima",
};

export const MOAT_LABEL: Record<string, string> = {
  network_effects: "Efecto de red",
  switching_costs: "Costes de cambio",
  intangible_assets: "Activos intangibles",
  cost_advantage: "Ventaja de coste",
  none: "Sin foso identificable",
};

export const RISK_LABEL: Record<string, string> = {
  covert_dilution: "Dilución encubierta",
  high_rate_refinancing: "Refinanciación a tipos altos",
  regulatory_or_vie_china: "Regulatorio / VIE China",
  technological_disruption: "Disrupción tecnológica",
  custody_or_counterparty: "Custodia / contraparte",
  liquidity: "Liquidez",
  other: "Otro",
};

export const STANCE_LABEL: Record<string, string> = {
  shareholder_friendly: "Alineado con el accionista",
  reinvestment_heavy: "Reinversión intensiva",
  dilutive: "Dilutivo",
  balance_sheet_repair: "Reparación de balance",
  not_applicable: "No aplica",
};
