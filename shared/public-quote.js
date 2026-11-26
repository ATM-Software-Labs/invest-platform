// Pages-side quote and search. The Worker keeps its fuller resolver (ISIN checksum,
// long alias table). This one answers the same JSON shape for the hub: Yahoo chart
// plus SEC 10-K for plain US tickers, and a short Spanish alias list.
// Commodity aliases point at unlevered spot trackers, not futures.

import { deny, normalizeSymbol } from "./guard.js";
import { classifyAsset } from "./assets.js";
import { fetchJson, parseYahooChart } from "./yahoo.js";
import { buildFilings, isUsTicker } from "./sec.js";

const ALIASES = {
  oro: "GLD",
  gold: "GLD",
  plata: "SLV",
  silver: "SLV",
  platino: "PPLT",
  ibex: "^IBEX",
  "ibex 35": "^IBEX",
  ibex35: "^IBEX",
  "s&p 500": "^GSPC",
  "s&p500": "^GSPC",
  sp500: "^GSPC",
  nasdaq: "^IXIC",
  "nasdaq 100": "^NDX",
  bitcoin: "BTC-EUR",
  btc: "BTC-EUR",
  ethereum: "ETH-EUR",
  inditex: "ITX.MC",
  santander: "SAN.MC",
  apple: "AAPL",
  microsoft: "MSFT",
  "vwce": "VWCE.DE",
};

function fold(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function json(data, status, cacheControl) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl || "public, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
}

function quoteFromMeta(meta, symbol) {
  const price = meta.regularMarketPrice;
  const prev = meta.chartPreviousClose;
  const change = typeof meta.regularMarketChangePercent === "number" && Number.isFinite(meta.regularMarketChangePercent)
    ? meta.regularMarketChangePercent
    : (price > 0 && prev > 0 ? (price / prev - 1) * 100 : null);
  return {
    symbol: meta.symbol || symbol,
    name: meta.shortName || meta.longName || symbol,
    currency: meta.currency || null,
    exchange: meta.exchangeName || meta.fullExchangeName || null,
    regularMarketPrice: price,
    regularMarketChangePercent: change,
    type: meta.instrumentType || "unknown",
  };
}

async function chartMeta(symbol) {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(symbol) + "?interval=1d&range=5d";
  const data = await fetchJson(url);
  const parsed = parseYahooChart(data, false);
  if (!parsed || !parsed.meta) return null;
  return quoteFromMeta(parsed.meta, symbol);
}

export async function handleSearch(request) {
  const blocked = deny(request);
  if (blocked) return blocked;
  if (request.method !== "GET") return json({ ok: false, error: "method" }, 405, "no-store");
  const q = new URL(request.url).searchParams.get("q") || "";
  const query = q.trim().replace(/\s+/g, " ");
  if (query.length < 2) return json({ ok: false, error: "too_short" }, 400);
  if (query.length > 64) return json({ ok: false, error: "too_long" }, 400);
  const results = [];
  const seen = new Set();
  const push = (row) => {
    if (!row || !row.symbol || seen.has(row.symbol)) return;
    seen.add(row.symbol);
    const asset = classifyAsset(row.symbol, row.type, row.name);
    results.push({ ...row, class: { type: asset.type, label: asset.label }, blocked: asset.type === "blocked", proxy: asset.proxy || null });
  };
  const alias = ALIASES[fold(query)];
  if (alias) push({ symbol: alias, name: query, exchange: null, type: "ALIAS" });
  const direct = normalizeSymbol(query);
  if (direct) push({ symbol: direct, name: direct, exchange: null, type: "SYMBOL" });
  try {
    const url = "https://query1.finance.yahoo.com/v1/finance/search?q=" + encodeURIComponent(query) + "&quotesCount=8&newsCount=0&listsCount=0&enableFuzzyQuery=false&lang=es-ES&region=ES";
    const data = await fetchJson(url);
    const quotes = data && Array.isArray(data.quotes) ? data.quotes : [];
    for (const x of quotes) {
      if (!x || typeof x.symbol !== "string") continue;
      push({
        symbol: x.symbol,
        name: x.shortname || x.longname || x.symbol,
        exchange: x.exchDisp || x.exchange || null,
        type: x.quoteType || "unknown",
      });
    }
  } catch {
    if (!results.length) return json({ ok: false, error: "upstream_unavailable", results: [] }, 502, "no-store");
  }
  return json({ ok: true, results: results.slice(0, 8) }, 200, "public, max-age=3600");
}

export async function handleQuote(request) {
  const blocked = deny(request);
  if (blocked) return blocked;
  if (request.method !== "GET") return json({ ok: false, error: "method" }, 405, "no-store");
  const q = (new URL(request.url).searchParams.get("q") || "").trim().replace(/\s+/g, " ");
  if (q.length < 2) return json({ ok: false, error: "too_short" }, 400);
  if (q.length > 64) return json({ ok: false, error: "too_long" }, 400);
  let symbol = ALIASES[fold(q)] || normalizeSymbol(q);
  if (!symbol) {
    try {
      const url = "https://query1.finance.yahoo.com/v1/finance/search?q=" + encodeURIComponent(q) + "&quotesCount=6&newsCount=0&listsCount=0";
      const data = await fetchJson(url);
      const first = data && data.quotes && data.quotes[0];
      if (first && first.symbol) symbol = first.symbol;
    } catch { /* fall through */ }
  }
  if (!symbol) return json({ ok: false, error: "not_found" }, 404);
  let quote;
  try { quote = await chartMeta(symbol); } catch { return json({ ok: false, error: "upstream_unavailable" }, 502, "no-store"); }
  if (!quote || typeof quote.regularMarketPrice !== "number") return json({ ok: false, error: "not_found" }, 404);
  const secSymbol = String(quote.symbol || symbol).toUpperCase();
  let pack = { filings: null, filingsNote: null };
  if (isUsTicker(secSymbol)) {
    try { pack = await buildFilings(secSymbol); } catch { pack = { filings: null, filingsNote: "No se han podido consultar las cifras de los informes anuales." }; }
  } else {
    pack = { filings: null, filingsNote: "Las cifras de los informes anuales solo estan disponibles para cotizaciones de Estados Unidos por ahora." };
  }
  const asset = classifyAsset(quote.symbol, quote.type, quote.name);
  const payload = {
    ok: true,
    quote,
    filings: pack.filings,
    class: { type: asset.type, label: asset.label },
    blocked: asset.type === "blocked",
    proxy: asset.proxy || null,
    resolved: { query: q, symbol: quote.symbol, via: "hub" },
  };
  if (pack.filingsNote) payload.filingsNote = pack.filingsNote;
  return json(payload, 200, "public, max-age=3600");
}
