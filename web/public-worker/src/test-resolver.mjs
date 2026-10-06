// Run after `npm run build`: unit tests for /api/quote symbol resolution and /api/search, with Yahoo/SEC mocked.
import assert from "node:assert/strict";
import worker from "../dist/worker.js";

globalThis.caches = { default: { match: async () => null, put: async () => {} } };
const CHARTS = {
  AAPL: { symbol: "AAPL", shortName: "Apple Inc.", currency: "USD", instrumentType: "EQUITY", regularMarketPrice: 200 },
  "ITX.MC": { symbol: "ITX.MC", shortName: "INDITEX", currency: "EUR", instrumentType: "EQUITY", regularMarketPrice: 50 },
  "BRK-B": { symbol: "BRK-B", shortName: "Berkshire Hathaway", currency: "USD", instrumentType: "EQUITY", regularMarketPrice: 500 },
  "BTC-USD": { symbol: "BTC-USD", shortName: "Bitcoin USD", currency: "USD", instrumentType: "CRYPTOCURRENCY", regularMarketPrice: 60000 },
  "BTC-EUR": { symbol: "BTC-EUR", shortName: "Bitcoin EUR", currency: "EUR", instrumentType: "CRYPTOCURRENCY", regularMarketPrice: 55000 },
  "LINK-USD": { symbol: "LINK-USD", shortName: "Chainlink USD", currency: "USD", instrumentType: "CRYPTOCURRENCY", regularMarketPrice: 20 },
  "LINK-EUR": { symbol: "LINK-EUR", shortName: "Chainlink EUR", currency: "EUR", instrumentType: "CRYPTOCURRENCY", regularMarketPrice: 18 },
  "FOO-USD": { symbol: "FOO-USD", shortName: "Foocoin USD", currency: "USD", instrumentType: "CRYPTOCURRENCY", regularMarketPrice: 0.5 },
  "IWDA.AS": { symbol: "IWDA.AS", shortName: "iShares Core MSCI World", currency: "EUR", instrumentType: "ETF", regularMarketPrice: 100 },
  "LDA.MC": { symbol: "LDA.MC", shortName: "LINEA DIRECTA", currency: "EUR", instrumentType: "EQUITY", regularMarketPrice: 1.2 },
  "0P0001.F": { symbol: "0P0001.F", currency: "EUR", instrumentType: "MUTUALFUND", regularMarketPrice: 10 }
};
const SEARCH = {
  apple: [{ symbol: "AAPL.BA", quoteType: "EQUITY", exchange: "BUE" }, { symbol: "AAPL", quoteType: "EQUITY", exchange: "NMS", shortname: "Apple Inc." }],
  IWDA: [{ symbol: "IWDAA.XC", quoteType: "ETF", exchange: "CXE" }, { symbol: "IWDA.AS", quoteType: "ETF", exchange: "AMS", shortname: "iShares Core MSCI World" }],
  IE00B4L5Y983: [{ symbol: "IWDA.AS", quoteType: "ETF", exchange: "AMS", shortname: "iShares Core MSCI World" }],
  "linea directa": [{ symbol: "LNDAF", quoteType: "EQUITY", exchange: "PNK" }, { symbol: "LDA.MC", quoteType: "EQUITY", exchange: "MCE" }],
  "LU0000000001": [{ symbol: "0P0001.F", quoteType: "MUTUALFUND", exchange: "FRA", shortname: "Fondo de prueba" }],
  chainlink: [{ symbol: "LINK-USD", quoteType: "CRYPTOCURRENCY", exchange: "CCC", shortname: "Chainlink USD" }],
  foocoin: [{ symbol: "FOO-USD", quoteType: "CRYPTOCURRENCY", exchange: "CCC", shortname: "Foocoin USD" }],
  nothing: [{ symbol: "XYZ261016C00510000", quoteType: "OPTION", exchange: "OPR" }]
};
let mode = "ok";
const calls = [];
globalThis.fetch = async (input) => {
  const url = new URL(String(input instanceof Request ? input.url : input));
  calls.push(url.hostname + url.pathname + url.search);
  if (url.hostname.endsWith("sec.gov")) return new Response("{}", { status: 404 });
  if (mode === "down") return new Response("Too Many Requests", { status: 429 });
  if (url.pathname.startsWith("/v8/finance/chart/")) {
    const sym = decodeURIComponent(url.pathname.split("/").pop());
    const meta = CHARTS[sym];
    if (!meta) return new Response(JSON.stringify({ chart: { result: null, error: { code: "Not Found" } } }), { status: 404 });
    return new Response(JSON.stringify({ chart: { result: [{ meta }] } }));
  }
  if (url.pathname === "/v1/finance/search") return new Response(JSON.stringify({ quotes: SEARCH[url.searchParams.get("q")] || [] }));
  throw new Error("unexpected fetch " + url);
};
async function quote(q) {
  const r = await worker.fetch(new Request("https://invest.example/api/quote?q=" + encodeURIComponent(q)), {});
  return { status: r.status, cache: r.headers.get("cache-control"), body: await r.json() };
}
const cases = [
  ["AAPL", "AAPL", "symbol"],
  ["apple", "AAPL", "search"],          // name search; Buenos Aires CEDEAR demoted
  ["Inditex", "ITX.MC", "alias"],       // Spanish name -> Madrid listing
  ["inditex ", "ITX.MC", "alias"],
  ["BRK.B", "BRK-B", "symbol"],         // share class mapping
  ["BTC", "BTC-EUR", "alias"],          // coin (in EUR), not the US ETF
  ["bitcoin", "BTC-EUR", "alias"],
  ["BTC-USD", "BTC-USD", "symbol"],     // an explicit USD pair is kept
  ["chainlink", "LINK-EUR", "search"],  // coin found by search -> EUR pair
  ["foocoin", "FOO-USD", "search"],     // no EUR pair -> USD fallback (flagged below)
  ["FOO-EUR", "FOO-USD", "symbol"],     // EUR pair picked from suggestions but missing -> USD
  ["IWDA", "IWDA.AS", "search"],        // UCITS ETF without suffix; synthetic CXE line demoted
  ["IE00B4L5Y983", "IWDA.AS", "isin"],
  ["ie00b4l5y983", "IWDA.AS", "isin"],
  ["Línea Directa", "LDA.MC", "search"] // accent-folded retry; OTC demoted
];
for (const [q, sym, via] of cases) {
  const { status, body } = await quote(q);
  assert.equal(status, 200, q + " status");
  assert.equal(body.quote.symbol, sym, q + " symbol");
  assert.equal(body.resolved.via, via, q + " via");
}
{ const { body } = await quote("bitcoin"); assert.equal(body.quote.currency, "EUR"); assert.equal(body.resolved.currencyFallback, undefined); }
{ const { body } = await quote("foocoin"); assert.deepEqual(body.resolved.currencyFallback, { preferred: "EUR", currency: "USD" }, "USD fallback is labelled"); }
{ const { body } = await quote("FOO-EUR"); assert.equal(body.resolved.currencyFallback.currency, "USD"); }
{ const { body } = await quote("BTC-USD"); assert.equal(body.resolved.currencyFallback, undefined, "explicit USD pair is not a fallback"); }
{ const { body } = await quote("LU0000000001"); assert.equal(body.quote.name, "Fondo de prueba", "fund name from search"); }
{ const { status, body, cache } = await quote("nothing"); assert.equal(status, 404); assert.equal(body.error, "not_found"); assert.match(cache, /max-age=300/); }
{ const { status, body } = await quote("a"); assert.equal(status, 400); assert.equal(body.error, "too_short"); }
assert.equal((await quote("US0378331004")).body.resolved, undefined, "bad ISIN checksum is not treated as ISIN");
mode = "down";
{ const { status, body, cache } = await quote("Santander SA"); assert.equal(status, 502); assert.equal(body.error, "upstream_unavailable"); assert.equal(cache, "no-store"); }
mode = "ok";
{
  const r = await worker.fetch(new Request("https://invest.example/api/search?q=Inditex"), {});
  const d = await r.json();
  assert.equal(r.status, 200);
  assert.equal(d.results[0].symbol, "ITX.MC");
}
{
  const d = await (await worker.fetch(new Request("https://invest.example/api/search?q=bitcoin"), {})).json();
  assert.equal(d.results[0].symbol, "BTC-EUR", "alias suggestion is the EUR pair");
  const c = await (await worker.fetch(new Request("https://invest.example/api/search?q=chainlink"), {})).json();
  assert.equal(c.results[0].symbol, "LINK-EUR", "searched coins are offered in EUR");
}
console.log("resolver tests: " + (cases.length + 12) + " passed");
