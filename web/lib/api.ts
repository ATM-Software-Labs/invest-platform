import type { InstitutionalAnalysis, ResolvedSymbol, UnifiedAssetPayload } from "./types";

export type UniverseSleeve = "equity" | "crypto" | "bond" | "forex";

export interface UniverseRow {
  id: string;
  name: string;
  sleeve: UniverseSleeve;
  venue: string;
  ok: boolean;
  price: number | null;
  currency: string | null;
  changePercent: number | null;
  quoteSource: "live" | "model";
  country: string;
  countryName: string;
  kind: string;
  sector: string;
  bestFit: string | null;
  affinity: number;
  affinities: Record<string, number>;
  metricLabel: string;
  metricValue: number | null;
  metricText: string;
}

export interface UniverseBoard {
  asOf: string;
  count: number;
  top5: UniverseRow[];
  assets: UniverseRow[];
  mesa?: UniverseRow[];
}

function apiBase(): string {
  if (process.env.NEXT_PUBLIC_API_BASE) return process.env.NEXT_PUBLIC_API_BASE;
  if (typeof window === "undefined") return process.env.API_ORIGIN ?? "http://127.0.0.1:8787";
  if (window.location.port === "3000") return "http://127.0.0.1:8787";
  return "";
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${path} ${body.slice(0, 180)}`);
  }
  return (await res.json()) as T;
}

function pathId(identifier: string): string {
  return identifier.split("/").map(encodeURIComponent).join("/");
}

export async function fetchAsset(identifier: string): Promise<UnifiedAssetPayload> {
  return getJson<UnifiedAssetPayload>(`/api/v1/asset/${pathId(identifier)}`);
}

export async function fetchAnalysis(
  identifier: string,
  qualitative = false,
): Promise<InstitutionalAnalysis> {
  const q = qualitative ? "" : "?qualitative=false";
  return getJson<InstitutionalAnalysis>(`/api/v1/analysis/${pathId(identifier)}${q}`);
}

export async function resolveSymbol(identifier: string): Promise<ResolvedSymbol> {
  return getJson<ResolvedSymbol>(`/api/v1/resolve/${pathId(identifier)}`);
}

export async function fetchUniverse(): Promise<UniverseBoard> {
  return getJson<UniverseBoard>("/api/v1/universe");
}

export interface DirectoryHit {
  id: string;
  name: string;
  sleeve: UniverseSleeve;
  venue: string;
  country: string;
  countryName: string;
  kind: string;
  sector: string;
}

export interface DirectoryStats {
  count: number;
  source: string;
  countries: Array<{ id: string; name: string; n: number }>;
  kinds: Array<{ id: string; n: number }>;
  sectors: Array<{ id: string; n: number }>;
}

export interface SearchResponse extends DirectoryStats {
  query: string;
  results: DirectoryHit[];
}

export async function fetchDirectoryStats(): Promise<DirectoryStats> {
  return getJson("/api/v1/directory");
}

export async function searchAssets(
  query: string,
  opts: { limit?: number; country?: string; kind?: string; sector?: string } = {},
): Promise<SearchResponse> {
  const p = new URLSearchParams();
  p.set("q", query);
  p.set("limit", String(opts.limit ?? 40));
  if (opts.country) p.set("country", opts.country);
  if (opts.kind) p.set("kind", opts.kind);
  if (opts.sector) p.set("sector", opts.sector);
  return getJson<SearchResponse>(`/api/v1/search?${p.toString()}`);
}

export async function loadTerminal(identifier: string): Promise<{
  asset: UnifiedAssetPayload;
  analysis: InstitutionalAnalysis;
}> {
  const [asset, analysis] = await Promise.all([
    fetchAsset(identifier),
    fetchAnalysis(identifier, false),
  ]);
  if (asset.assetClass === "equity" && analysis.scoring.derived) {
    const m = asset.metrics as { capitalStructure?: { netDebtToEbitda?: number | null } };
    analysis.scoring.derived.netDebtToEbitda = m.capitalStructure?.netDebtToEbitda ?? null;
  }
  return { asset, analysis };
}
