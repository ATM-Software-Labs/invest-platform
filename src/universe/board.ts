import { loadConfig } from "../config.js";
import { HttpClient } from "../providers/http.js";
import { fetchYahooQuotes, yahooMapForIdentifier, type YahooQuoteHit } from "../providers/yahoo.js";
import type { AnalysisService } from "../services/analysis-service.js";
import type { ArchetypeId, Scorecard } from "../scoring/types.js";
import { FEATURED_COMPANIES, UNIVERSE, type UniverseListing } from "./catalog.js";
import { classify, type AssetKind } from "./classify.js";

export interface UniverseRow {
  id: string;
  name: string;
  sleeve: UniverseListing["sleeve"];
  venue: string;
  ok: boolean;
  price: number | null;
  currency: string | null;
  changePercent: number | null;
  quoteSource: "live" | "model";
  country: string;
  countryName: string;
  kind: AssetKind;
  sector: string;
  bestFit: ArchetypeId | null;
  affinity: number;
  affinities: Partial<Record<ArchetypeId, number>>;
  metricLabel: string;
  metricValue: number | null;
  metricText: string;
}

export interface UniverseBoard {
  asOf: string;
  count: number;
  top5: UniverseRow[];
  assets: UniverseRow[];
  mesa: UniverseRow[];
}

export async function buildUniverseBoard(analysis: AnalysisService): Promise<UniverseBoard> {
  let assets = await Promise.all(UNIVERSE.map((item) => scoreOne(analysis, item)));
  const byId = new Map(assets.map((row) => [row.id, row]));
  const mesa = FEATURED_COMPANIES.map((item) => byId.get(item.id) ?? lightweightRow(item));
  const ranked = [...assets]
    .filter((r) => r.ok)
    .sort((a, b) => b.affinity - a.affinity || compareMetric(a, b));
  return {
    asOf: new Date().toISOString(),
    count: assets.length,
    top5: ranked.slice(0, 5),
    assets,
    mesa,
  };
}

async function overlayLiveQuotes(rows: UniverseRow[]): Promise<UniverseRow[]> {
  const config = loadConfig();
  if (!config.ENABLE_LIVE_QUOTES || config.NODE_ENV === "test") {
    return rows.map((r) => ({ ...r, quoteSource: r.quoteSource ?? "model" }));
  }
  try {
    const http = new HttpClient({ ...config, HTTP_TIMEOUT_MS: 8000, HTTP_RETRIES: 1 });
    const maps = rows
      .map((r) => ({ id: r.id, map: yahooMapForIdentifier(r.id) }))
      .filter((x): x is { id: string; map: NonNullable<ReturnType<typeof yahooMapForIdentifier>> } => Boolean(x.map));
    const symbols = maps.map((m) => m.map.symbol);
    const hits = new Map<string, YahooQuoteHit>();
    for (let i = 0; i < symbols.length; i += 25) {
      const chunk = await fetchYahooQuotes(http, symbols.slice(i, i + 25));
      for (const [k, v] of chunk) hits.set(k, v);
    }
    return rows.map((r) => {
      const map = yahooMapForIdentifier(r.id);
      const hit = map ? hits.get(map.symbol) : undefined;
      if (!hit) return { ...r, quoteSource: r.quoteSource ?? "model" };
      let px = hit.price;
      if (map!.asPercent && px > 20) px /= 10;
      const penny = hit.currency === "GBp" || hit.currency === "GBX";
      if (penny) px /= 100;
      const chg = hit.changePercent ?? r.changePercent;
      return {
        ...r,
        price: px,
        changePercent: chg,
        currency: penny ? "GBP" : map!.asPercent ? r.currency : hit.currency || r.currency,
        quoteSource: "live",
      };
    });
  } catch {
    return rows.map((r) => ({ ...r, quoteSource: r.quoteSource ?? "model" }));
  }
}

function lightweightRow(item: UniverseListing): UniverseRow {
  return {
    id: item.id,
    name: item.name,
    sleeve: item.sleeve,
    venue: item.venue,
    ok: true,
    price: null,
    currency: null,
    changePercent: null,
    quoteSource: "model",
    ...classify({
      id: item.id,
      name: item.name,
      sleeve: item.sleeve,
      venue: item.venue,
      sector: item.sector,
    }),
    bestFit: null,
    affinity: 0,
    affinities: {},
    metricLabel: "—",
    metricValue: null,
    metricText: "mesa",
  };
}

async function scoreOne(analysis: AnalysisService, item: UniverseListing): Promise<UniverseRow> {
  try {
    const out = await analysis.analyze(item.id, { qualitative: false });
    return toRow(item, out.scoring, out.asOf);
  } catch {
    return {
      id: item.id,
      name: item.name,
      sleeve: item.sleeve,
      venue: item.venue,
      ok: false,
      price: null,
      currency: null,
      changePercent: null,
      quoteSource: "model",
      ...classify({
        id: item.id,
        name: item.name,
        sleeve: item.sleeve,
        venue: item.venue,
        sector: item.sector,
      }),
      bestFit: null,
      affinity: 0,
      affinities: {},
      metricLabel: "—",
      metricValue: null,
      metricText: "sin datos",
    };
  }
}

function toRow(item: UniverseListing, scoring: Scorecard, _asOf: string): UniverseRow {
  const d = scoring.derived;
  const metric = headline(scoring);
  return {
    id: item.id,
    name: item.name,
    sleeve: item.sleeve,
    venue: item.venue,
    ok: true,
    price: d.price,
    currency: d.currency,
    changePercent: d.changePercent,
    quoteSource: "model",
    ...classify({
      id: item.id,
      name: item.name,
      sleeve: item.sleeve,
      venue: item.venue,
      sector: item.sector,
    }),
    bestFit: scoring.bestFit,
    affinity: scoring.archetypes[scoring.bestFit]?.affinity ?? 0,
    affinities: Object.fromEntries(Object.values(scoring.archetypes).map((a) => [a.id, a.affinity])),
    metricLabel: metric.label,
    metricValue: metric.value,
    metricText: metric.text,
  };
}

function headline(scoring: Scorecard): { label: string; value: number | null; text: string } {
  const d = scoring.derived;
  if (d.assetClass === "equity" && d.roic5Y != null) {
    return { label: "ROIC 5Y", value: d.roic5Y, text: pct(d.roic5Y) };
  }
  if (d.assetClass === "equity" && d.fcfYield != null) {
    return { label: "FCF yield", value: d.fcfYield, text: pct(d.fcfYield) };
  }
  if (d.stockToFlow != null) {
    return { label: "S2F", value: d.stockToFlow, text: d.stockToFlow.toFixed(1) };
  }
  if (d.yield != null) {
    return { label: "TIR", value: d.yield, text: pct(d.yield) };
  }
  if (d.price != null) {
    return { label: "Precio", value: d.price, text: String(d.price) };
  }
  return { label: "Afinidad", value: scoring.archetypes[scoring.bestFit].affinity, text: String(scoring.archetypes[scoring.bestFit].affinity) };
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function compareMetric(a: UniverseRow, b: UniverseRow): number {
  return (b.metricValue ?? 0) - (a.metricValue ?? 0);
}
