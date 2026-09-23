import { FEATURED_COMPANIES, type UniverseSleeve } from "./catalog";

export interface MesaItem {
  id: string;
  name: string;
  sleeve: UniverseSleeve;
  venue: string;
  country: string;
  countryName: string;
  kind: string;
  sector: string;
  domain?: string;
}

const STORAGE_KEY = "invest.mesa.v1";
const EVENT = "invest-mesa-change";

export const DEFAULT_MESA: MesaItem[] = FEATURED_COMPANIES.map((row) => ({
  id: row.id,
  name: row.name,
  sleeve: row.sleeve,
  venue: row.venue,
  country: countryFromVenue(row.id, row.venue),
  countryName: countryNameFromCode(countryFromVenue(row.id, row.venue)),
  kind: "stock",
  sector: row.sector ?? "Equity",
  domain: row.domain,
}));

function countryFromVenue(id: string, venue: string): string {
  const suf = id.includes(".") ? id.slice(id.lastIndexOf(".") + 1) : "";
  const bySuffix: Record<string, string> = {
    MC: "ES",
    DE: "DE",
    L: "GB",
    T: "JP",
    HK: "HK",
    TW: "TW",
    PA: "FR",
    AS: "NL",
    SW: "CH",
  };
  if (bySuffix[suf]) return bySuffix[suf];
  if (venue === "BME") return "ES";
  if (venue === "XETRA") return "DE";
  if (venue === "LSE") return "GB";
  if (venue === "EPA") return "FR";
  if (venue === "AMS") return "NL";
  if (venue === "SIX") return "CH";
  if (venue === "TSE") return "JP";
  if (venue === "HKEX") return "HK";
  if (venue === "TWSE") return "TW";
  return "US";
}

function countryNameFromCode(code: string): string {
  const names: Record<string, string> = {
    US: "Estados Unidos",
    ES: "España",
    DE: "Alemania",
    GB: "Reino Unido",
    FR: "Francia",
    NL: "Países Bajos",
    CH: "Suiza",
    JP: "Japón",
    HK: "Hong Kong",
    TW: "Taiwán",
    GL: "Global",
  };
  return names[code] ?? code;
}

export function readMesa(): MesaItem[] {
  if (typeof window === "undefined") return DEFAULT_MESA;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MESA;
    const parsed = JSON.parse(raw) as MesaItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_MESA;
    return parsed.filter((row) => row && typeof row.id === "string" && typeof row.name === "string");
  } catch {
    return DEFAULT_MESA;
  }
}

export function writeMesa(items: MesaItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 80)));
  window.dispatchEvent(new Event(EVENT));
}

export function mesaHas(id: string, items = readMesa()): boolean {
  const key = id.toUpperCase();
  return items.some((row) => row.id.toUpperCase() === key);
}

export function addToMesa(item: MesaItem): MesaItem[] {
  const current = readMesa();
  if (mesaHas(item.id, current)) return current;
  const next = [item, ...current];
  writeMesa(next);
  return next;
}

export function removeFromMesa(id: string): MesaItem[] {
  const next = readMesa().filter((row) => row.id.toUpperCase() !== id.toUpperCase());
  writeMesa(next);
  return next;
}

export function resetMesa(): MesaItem[] {
  writeMesa(DEFAULT_MESA);
  return DEFAULT_MESA;
}

export function subscribeMesa(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
