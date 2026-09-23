import type { UniverseSleeve } from "./catalog.js";

export type AssetKind = "stock" | "etf" | "adr" | "crypto" | "bond" | "fx" | "metal";

export interface Classification {
  country: string;
  countryName: string;
  kind: AssetKind;
  sector: string;
}

const VENUE_COUNTRY: Record<string, string> = {
  NASDAQ: "US",
  NYSE: "US",
  NYSEAM: "US",
  ARCA: "US",
  BATS: "US",
  IEX: "US",
  BME: "ES",
  XETRA: "DE",
  LSE: "GB",
  TSE: "JP",
  HKEX: "HK",
  TWSE: "TW",
  EPA: "FR",
  AMS: "NL",
  SIX: "CH",
  CC: "GL",
  GBOND: "GL",
  FX: "GL",
};

const SUFFIX_COUNTRY: Record<string, string> = {
  MC: "ES",
  DE: "DE",
  L: "GB",
  T: "JP",
  HK: "HK",
  TW: "TW",
  PA: "FR",
  AS: "NL",
  SW: "CH",
  TO: "CA",
  AX: "AU",
  KS: "KR",
};

export const COUNTRY_NAME: Record<string, string> = {
  US: "Estados Unidos",
  ES: "España",
  DE: "Alemania",
  GB: "Reino Unido",
  JP: "Japón",
  HK: "Hong Kong",
  TW: "Taiwán",
  FR: "Francia",
  NL: "Países Bajos",
  CH: "Suiza",
  CA: "Canadá",
  AU: "Australia",
  KR: "Corea del Sur",
  GL: "Global",
};

const KIND_LABEL: Record<AssetKind, string> = {
  stock: "Acción",
  etf: "ETF",
  adr: "ADR",
  crypto: "Cripto",
  bond: "Bono",
  fx: "FX",
  metal: "Metal",
};

export function kindLabel(kind: AssetKind): string {
  return KIND_LABEL[kind];
}

export function classify(args: {
  id: string;
  name: string;
  sleeve: UniverseSleeve;
  venue: string;
  etf?: boolean;
  sector?: string;
}): Classification {
  const id = args.id.toUpperCase();
  const name = args.name.toUpperCase();
  const country = countryOf(id, args.sleeve, args.venue);
  const kind = kindOf(id, name, args.sleeve, args.etf);
  const sector = args.sector || sectorOf(name, kind, args.sleeve);
  return { country, countryName: COUNTRY_NAME[country] ?? country, kind, sector };
}

function countryOf(id: string, sleeve: UniverseSleeve, venue: string): string {
  if (sleeve === "crypto" || venue === "CC") return "GL";
  if (sleeve === "forex" || venue === "FX") return "GL";
  if (id.startsWith("US") && sleeve === "bond") return "US";
  if (id.startsWith("BUND") || id.startsWith("DE")) return "DE";
  if (id.startsWith("BONO") || id.startsWith("ES")) return "ES";
  const dot = id.lastIndexOf(".");
  if (dot > 0) {
    const suf = id.slice(dot + 1);
    if (SUFFIX_COUNTRY[suf]) return SUFFIX_COUNTRY[suf];
  }
  return VENUE_COUNTRY[venue] ?? "US";
}

function kindOf(id: string, name: string, sleeve: UniverseSleeve, etf?: boolean): AssetKind {
  if (sleeve === "crypto") return "crypto";
  if (sleeve === "bond") return "bond";
  if (id.includes("XAU") || name.includes("GOLD") || name.includes("SILVER") || name.includes("PLATINUM")) return "metal";
  if (sleeve === "forex") return "fx";
  if (etf || /\bETF\b/.test(name) || name.includes("ETN") || name.includes("NEXTSHARES")) return "etf";
  if (/\bADR\b/.test(name) || name.includes("AMERICAN DEPOSITARY")) return "adr";
  return "stock";
}

function sectorOf(name: string, kind: AssetKind, sleeve: UniverseSleeve): string {
  if (kind === "crypto") return "Cripto";
  if (kind === "bond") return "Soberano";
  if (kind === "fx") return "Divisas";
  if (kind === "metal") return "Metales";
  if (kind === "etf") {
    if (name.includes("BOND") || name.includes("TREASURY") || name.includes("TIPS")) return "Renta fija";
    if (name.includes("GOLD") || name.includes("SILVER") || name.includes("METAL")) return "Materias primas";
    if (name.includes("SEMICONDUCTOR") || name.includes("TECH") || name.includes("NASDAQ 100") || name.includes("QQQ")) {
      return "Tecnología";
    }
    if (name.includes("BIOTECH") || name.includes("HEALTH") || name.includes("PHARMA")) return "Salud";
    if (name.includes("ENERGY") || name.includes("OIL")) return "Energía";
    if (name.includes("REIT") || name.includes("REAL ESTATE")) return "Inmobiliario";
    if (name.includes("LEVERAGE") || name.includes("2X") || name.includes("3X") || name.includes("BEAR") || name.includes("BULL")) {
      return "Apalancado";
    }
    return "ETF";
  }
  if (name.includes("REIT") || name.includes("REAL ESTATE")) return "Inmobiliario";
  if (name.includes("BANCORP") || name.includes("BANK") || name.includes("FINANCIAL") || name.includes("INSURANCE") || name.includes("CAPITAL")) {
    return "Financiero";
  }
  if (name.includes("PHARMA") || name.includes("BIO") || name.includes("DRUG") || name.includes("THERAPEUTIC") || name.includes("HEALTH") || name.includes("MEDIC")) {
    return "Salud";
  }
  if (name.includes("OIL") || name.includes("GAS") || name.includes("ENERGY") || name.includes("PETROLEUM")) return "Energía";
  if (
    name.includes("SEMI") ||
    name.includes("SOFTWARE") ||
    name.includes("SEMICONDUCTOR") ||
    name.includes("CLOUD") ||
    name.includes("TECH") ||
    name.includes("MICROSOFT") ||
    name.includes("NVIDIA") ||
    name.includes("APPLE") ||
    name.includes("TSMC") ||
    name.includes("ASML") ||
    name.includes("SAP") ||
    name.includes("AMADEUS") ||
    name.includes("INDRA") ||
    name.includes("BROADCOM")
  ) {
    return "Tecnología";
  }
  if (name.includes("RETAIL") || name.includes("CONSUMER") || name.includes("FOOD") || name.includes("BEVERAGE")) return "Consumo";
  if (name.includes("UTILITY") || name.includes("ELECTRIC") || name.includes("POWER") || name.includes("WATER")) return "Utilities";
  if (name.includes("AERO") || name.includes("DEFENSE") || name.includes("INDUSTRIAL") || name.includes("RAIL") || name.includes("ROLLS")) {
    return "Industrial";
  }
  if (name.includes("GOLD") || name.includes("MINING") || name.includes("STEEL") || name.includes("COPPER")) return "Materiales";
  if (name.includes("TELECOM") || name.includes("COMMUNICATION") || name.includes("MEDIA")) return "Comunicación";
  if (sleeve === "equity") return "Equity";
  return "Otros";
}
