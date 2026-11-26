// Thin market-data handlers. CPU stays on the cache hit path: one caches.default match.
// Indicator math is the shared module, so the browser recomputes the same numbers.

import { deny, normalizeSymbol, parseSymbolList } from "./guard.js";
import { classifyAsset } from "./assets.js";
import { RANGE_PRESETS, normalizeRange, loadChart } from "./yahoo.js";
import {
  ema, lastNumber, poc, distPct, nearestSupport, relativeStrength, ytdStrength, drawdownFromHigh, seriesAth,
} from "./indicators.js";

const ORIGIN = "https://invest.trujillomingorance.com";
const PULSE_TTL = 1200;
const PULSE_RANGE = { interval: "1d", yahooRange: "5y", ttl: PULSE_TTL, intra: false };

// caches.default expires from this header. Intraday presets use 900s, daily+ use 3600s.
export function cacheHeader(seconds) {
  const n = seconds | 0;
  return "public, max-age=" + n + ", s-maxage=" + n;
}

function json(data, status, cacheControl) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl || "no-store",
      "access-control-allow-origin": "*",
      "x-content-type-options": "nosniff",
    },
  });
}

async function cacheGet(url) {
  const cache = globalThis.caches && globalThis.caches.default;
  if (!cache) return null;
  try {
    const hit = await cache.match(new Request(url, { method: "GET" }));
    return hit || null;
  } catch {
    return null;
  }
}

async function cachePut(url, response) {
  const cache = globalThis.caches && globalThis.caches.default;
  if (!cache) return;
  try { await cache.put(new Request(url, { method: "GET" }), response.clone()); } catch { /* ignore */ }
}

function changePct(meta, bars) {
  const price = meta && meta.regularMarketPrice > 0 ? meta.regularMarketPrice : (bars.length ? bars[bars.length - 1].close : null);
  // chartPreviousClose on a multi-year request is the first close of the file, not yesterday.
  if (meta && typeof meta.regularMarketChangePercent === "number" && Number.isFinite(meta.regularMarketChangePercent)) {
    return { price, changePct: meta.regularMarketChangePercent };
  }
  const prev = bars.length > 1 ? bars[bars.length - 2].close : null;
  if (!(price > 0) || !(prev > 0)) return { price, changePct: null };
  return { price, changePct: (price / prev - 1) * 100 };
}

function rowFromBars(symbol, parsed) {
  const meta = parsed.meta || {};
  const bars = parsed.bars || [];
  const px = changePct(meta, bars);
  const closes = bars.map((b) => b.close);
  const ema200 = lastNumber(ema(closes, 200));
  const window = bars.slice(-90);
  const profile = poc(window.length ? window : bars);
  const support = nearestSupport(bars, px.price);
  const year = new Date().getUTCFullYear();
  const asset = classifyAsset(symbol, meta.instrumentType, meta.shortName || meta.longName || "");
  return {
    symbol,
    name: meta.shortName || meta.longName || symbol,
    currency: meta.currency || null,
    exchange: meta.exchangeName || meta.fullExchangeName || null,
    price: px.price,
    changePct: px.changePct,
    ema200,
    poc: profile ? profile.price : null,
    distEma200: distPct(px.price, ema200),
    distPoc: distPct(px.price, profile ? profile.price : null),
    support,
    distSupport: distPct(px.price, support),
    rs1m: relativeStrength(closes, 21),
    rsYtd: ytdStrength(bars, year),
    drawdown: drawdownFromHigh(bars),
    class: { type: asset.type, label: asset.label },
    blocked: asset.type === "blocked",
    proxy: asset.proxy || null,
  };
}

export async function handleOhlcv(request) {
  const blocked = deny(request);
  if (blocked) return blocked;
  if (request.method !== "GET" && request.method !== "HEAD") return json({ ok: false, error: "method" }, 405);
  const url = new URL(request.url);
  const symbol = normalizeSymbol(url.searchParams.get("symbol"));
  const range = normalizeRange(url.searchParams.get("range"));
  if (!symbol) return json({ ok: false, error: "bad_symbol" }, 400);
  if (!range) return json({ ok: false, error: "bad_range" }, 400);
  const preset = RANGE_PRESETS[range];
  const interval = url.searchParams.get("interval");
  if (interval && interval !== preset.interval) return json({ ok: false, error: "bad_interval" }, 400);
  const key = ORIGIN + "/api/ohlcv?symbol=" + encodeURIComponent(symbol) + "&interval=" + preset.interval + "&range=" + range;
  const hit = await cacheGet(key);
  if (hit) return hit;
  let parsed;
  try { parsed = await loadChart(symbol, preset); } catch { return json({ ok: false, error: "upstream_unavailable" }, 502); }
  if (!parsed || !parsed.bars.length) return json({ ok: false, error: "not_found" }, 404);
  const meta = parsed.meta;
  const asset = classifyAsset(symbol, meta.instrumentType, meta.shortName || "");
  const body = {
    ok: true,
    symbol,
    interval: preset.interval,
    range,
    currency: meta.currency || null,
    name: meta.shortName || meta.longName || symbol,
    type: meta.instrumentType || null,
    class: { type: asset.type, label: asset.label },
    blocked: asset.type === "blocked",
    proxy: asset.proxy || null,
    ath: seriesAth(parsed.bars),
    source: "yahoo",
    bars: parsed.bars,
  };
  const res = json(body, 200, cacheHeader(preset.ttl));
  await cachePut(key, res);
  return request.method === "HEAD" ? new Response(null, { status: 200, headers: res.headers }) : res;
}

async function pulseSymbol(symbol) {
  const key = ORIGIN + "/api/__pulse_sym?symbol=" + encodeURIComponent(symbol);
  const hit = await cacheGet(key);
  if (hit) {
    try { return await hit.json(); } catch { /* recompute */ }
  }
  let parsed;
  try { parsed = await loadChart(symbol, PULSE_RANGE); } catch { return { symbol, error: "upstream_unavailable" }; }
  if (!parsed || !parsed.bars.length) return { symbol, error: "not_found" };
  const row = rowFromBars(symbol, parsed);
  const res = json(row, 200, cacheHeader(PULSE_TTL));
  await cachePut(key, res);
  return row;
}

export async function handlePulse(request) {
  const blocked = deny(request);
  if (blocked) return blocked;
  if (request.method !== "GET" && request.method !== "HEAD") return json({ ok: false, error: "method" }, 405);
  const url = new URL(request.url);
  const parsed = parseSymbolList(url.searchParams.get("symbols"), 30);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400);
  const symbols = parsed.symbols;
  const key = ORIGIN + "/api/pulse?symbols=" + symbols.join(",");
  const hit = await cacheGet(key);
  if (hit) return hit;
  const rows = await Promise.all(symbols.map((s) => pulseSymbol(s)));
  const body = { ok: true, ttl: PULSE_TTL, symbols, rows, source: "yahoo" };
  const res = json(body, 200, cacheHeader(PULSE_TTL));
  await cachePut(key, res);
  return request.method === "HEAD" ? new Response(null, { status: 200, headers: res.headers }) : res;
}
