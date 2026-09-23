import { FEATURED_COMPANIES, UNIVERSE, type UniverseSleeve } from "./catalog.js";
import { classify, type AssetKind } from "./classify.js";
import snapshot from "./us-listed.json" with { type: "json" };

export type DirectorySleeve = UniverseSleeve;

export interface DirectoryEntry {
  id: string;
  name: string;
  sleeve: DirectorySleeve;
  venue: string;
  country: string;
  countryName: string;
  kind: AssetKind;
  sector: string;
}

export interface SearchQuery {
  limit?: number;
  country?: string;
  kind?: string;
  sector?: string;
}

const VENUE: Record<string, string> = {
  Q: "NASDAQ",
  G: "NASDAQ",
  S: "NASDAQ",
  N: "NYSE",
  A: "NYSEAM",
  P: "ARCA",
  Z: "BATS",
  V: "IEX",
};

let cached: DirectoryEntry[] | null = null;

export function parseNasdaqListed(text: string): DirectoryEntry[] {
  const out: DirectoryEntry[] = [];
  for (const line of text.split(/\r?\n/).slice(1)) {
    if (!line || line.startsWith("File Creation")) continue;
    const p = line.split("|");
    if (p.length < 8 || p[3] === "Y") continue;
    const id = (p[0] ?? "").trim().toUpperCase();
    if (!id) continue;
    const name = (p[1] ?? id).trim().slice(0, 80);
    const etf = p[6] === "Y";
    out.push(enrich({ id, name, sleeve: "equity", venue: "NASDAQ", etf }));
  }
  return out;
}

export function parseOtherListed(text: string): DirectoryEntry[] {
  const out: DirectoryEntry[] = [];
  for (const line of text.split(/\r?\n/).slice(1)) {
    if (!line || line.startsWith("File Creation")) continue;
    const p = line.split("|");
    if (p.length < 8 || p[6] === "Y") continue;
    const id = (p[0] ?? "").trim().toUpperCase();
    if (!id) continue;
    const name = (p[1] ?? id).trim().slice(0, 80);
    const venue = VENUE[p[2] ?? ""] ?? p[2] ?? "US";
    out.push(enrich({ id, name, sleeve: "equity", venue, etf: p[4] === "Y" }));
  }
  return out;
}

export function snapshotEntries(): DirectoryEntry[] {
  return (snapshot as Array<[string, string, string]>).map(([id, name, venue]) =>
    enrich({ id, name, sleeve: "equity", venue }),
  );
}

function enrich(row: {
  id: string;
  name: string;
  sleeve: DirectorySleeve;
  venue: string;
  etf?: boolean;
  sector?: string;
}): DirectoryEntry {
  const c = classify(row);
  return { ...row, ...c };
}

export function buildDirectory(usListed: DirectoryEntry[] = snapshotEntries()): DirectoryEntry[] {
  const map = new Map<string, DirectoryEntry>();
  for (const row of usListed) {
    if (!row.id) continue;
    map.set(row.id.toUpperCase(), { ...row, id: row.id.toUpperCase() });
  }
  for (const row of FEATURED_COMPANIES) {
    map.set(
      row.id.toUpperCase(),
      enrich({ id: row.id, name: row.name, sleeve: row.sleeve, venue: row.venue, sector: row.sector }),
    );
  }
  for (const row of UNIVERSE) {
    map.set(
      row.id.toUpperCase(),
      enrich({ id: row.id, name: row.name, sleeve: row.sleeve, venue: row.venue, sector: row.sector }),
    );
  }
  return [...map.values()];
}

export function getDirectory(): DirectoryEntry[] {
  cached ??= buildDirectory();
  return cached;
}

export function searchDirectory(query: string, opts: SearchQuery = {}): DirectoryEntry[] {
  const limit = opts.limit ?? 40;
  const entries = getDirectory().filter((row) => {
    if (opts.country && row.country !== opts.country) return false;
    if (opts.kind && row.kind !== opts.kind) return false;
    if (opts.sector && row.sector !== opts.sector) return false;
    return true;
  });
  const q = query.trim().toUpperCase();
  if (!q) return entries.slice(0, limit);

  const scored: Array<{ row: DirectoryEntry; rank: number }> = [];
  for (const row of entries) {
    const id = row.id.toUpperCase();
    const name = row.name.toUpperCase();
    let rank = -1;
    if (id === q) rank = 0;
    else if (id.startsWith(q)) rank = 1;
    else if (id.includes(q)) rank = 2;
    else if (name.startsWith(q)) rank = 3;
    else if (name.includes(q)) rank = 4;
    else if (row.countryName.toUpperCase().includes(q) || row.sector.toUpperCase().includes(q)) rank = 5;
    if (rank >= 0) scored.push({ row, rank });
  }
  scored.sort((a, b) => a.rank - b.rank || a.row.id.length - b.row.id.length || a.row.id.localeCompare(b.row.id));
  return scored.slice(0, limit).map((s) => s.row);
}

export function directoryStats(): {
  count: number;
  source: string;
  countries: Array<{ id: string; name: string; n: number }>;
  kinds: Array<{ id: string; n: number }>;
  sectors: Array<{ id: string; n: number }>;
} {
  const entries = getDirectory();
  const countries = new Map<string, { name: string; n: number }>();
  const kinds = new Map<string, number>();
  const sectors = new Map<string, number>();
  for (const e of entries) {
    const c = countries.get(e.country) ?? { name: e.countryName, n: 0 };
    c.n += 1;
    countries.set(e.country, c);
    kinds.set(e.kind, (kinds.get(e.kind) ?? 0) + 1);
    sectors.set(e.sector, (sectors.get(e.sector) ?? 0) + 1);
  }
  return {
    count: entries.length,
    source: "nasdaqtrader+mesa",
    countries: [...countries.entries()]
      .map(([id, v]) => ({ id, name: v.name, n: v.n }))
      .sort((a, b) => b.n - a.n),
    kinds: [...kinds.entries()].map(([id, n]) => ({ id, n })).sort((a, b) => b.n - a.n),
    sectors: [...sectors.entries()].map(([id, n]) => ({ id, n })).sort((a, b) => b.n - a.n),
  };
}
