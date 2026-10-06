function json(data, status, cacheControl) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl || "no-store"
    }
  });
}
async function html(b64) {
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const text = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
  return new Response(text, { headers: { "content-type": "text/html; charset=utf-8", "cache-control":"no-cache, max-age=0, must-revalidate" } });
}

const QUOTE_CACHE = "public, max-age=3600";
const SEC_UA = "invest.trujillomingorance.com security@trujillomingorance.com";
const YAHOO_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const TICKER_URL = "https://www.sec.gov/files/company_tickers.json";
const US_NOTE = "Las cifras de los informes anuales solo est\u00e1n disponibles para cotizaciones de Estados Unidos por ahora.";
const SEC_DOWN_NOTE = "No se han podido consultar las cifras de los informes anuales.";
const CONCEPTS = [
  ["revenue", ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet"]],
  ["netIncome", ["NetIncomeLoss"]],
  ["operatingCashFlow", ["NetCashProvidedByUsedInOperatingActivities"]],
  ["capex", ["PaymentsToAcquirePropertyPlantAndEquipment"]],
  ["longTermDebt", ["LongTermDebtNoncurrent", "LongTermDebt"]],
  ["cash", ["CashCashEquivalentsAndShortTermInvestments", "CashAndCashEquivalentsAtCarryingValue"]]
];

async function secJson(url) {
  const cache = caches.default;
  const key = new Request(url, { method: "GET" });
  const hit = await cache.match(key);
  if (hit) return { status: 200, data: await hit.json() };
  const res = await fetch(url, { headers: { "User-Agent": SEC_UA, "Accept": "application/json" } });
  if (res.status === 404) return { status: 404, data: null };
  if (!res.ok) return { status: res.status, data: null };
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { status: 502, data: null };
  }
  try {
    await cache.put(key, new Response(text, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=86400"
      }
    }));
  } catch (err) {}
  return { status: 200, data: data };
}

function pickFyFact(concept) {
  const units = concept && concept.units && concept.units.USD;
  if (!Array.isArray(units)) return null;
  const rows = [];
  for (const fact of units) {
    if (!fact || fact.form !== "10-K" || fact.fp !== "FY") continue;
    if (typeof fact.end !== "string" || typeof fact.val !== "number") continue;
    rows.push(fact);
  }
  if (!rows.length) return null;
  rows.sort(function (a, b) {
    if (a.end !== b.end) return a.end < b.end ? 1 : -1;
    const fa = typeof a.filed === "string" ? a.filed : "";
    const fb = typeof b.filed === "string" ? b.filed : "";
    if (fa !== fb) return fa < fb ? 1 : -1;
    return 0;
  });
  return rows[0];
}

function recordFact(fact, url) {
  const out = { end: fact.end };
  if (typeof fact.filed === "string") out.filed = fact.filed;
  if (typeof fact.fy === "number") out.fy = fact.fy;
  out.val = fact.val;
  out.url = url;
  return out;
}

async function pickConcept(cik, tags) {
  let best = null;
  for (const tag of tags) {
    const url = "https://data.sec.gov/api/xbrl/companyconcept/CIK" + cik + "/us-gaap/" + tag + ".json";
    const got = await secJson(url);
    if (got.status !== 200 || !got.data) continue;
    const fact = pickFyFact(got.data);
    if (!fact) continue;
    if (!best || fact.end > best.end) best = recordFact(fact, url);
  }
  return best;
}

function cikFor(data, symbol) {
  if (!data || typeof data !== "object") return null;
  const want = symbol.toUpperCase();
  const values = Array.isArray(data) ? data : Object.values(data);
  for (const item of values) {
    if (!item || typeof item.ticker !== "string") continue;
    if (item.ticker.toUpperCase() !== want) continue;
    const n = Number(item.cik_str);
    if (!Number.isFinite(n)) return null;
    return String(Math.trunc(n)).padStart(10, "0");
  }
  return null;
}

function sameEnd(a, b) {
  return !!(a && b && typeof a.end === "string" && a.end === b.end);
}

async function buildFilings(symbol) {
  const ticker = await secJson(TICKER_URL);
  if (ticker.status !== 200 || !ticker.data) return { filings: null, filingsNote: SEC_DOWN_NOTE };
  const cik = cikFor(ticker.data, symbol);
  if (!cik) return { filings: null, filingsNote: US_NOTE };
  const filings = {};
  for (const pair of CONCEPTS) {
    const picked = await pickConcept(cik, pair[1]);
    if (picked) filings[pair[0]] = picked;
  }
  const revenue = filings.revenue;
  const netIncome = filings.netIncome;
  const ocf = filings.operatingCashFlow;
  const capex = filings.capex;
  if (sameEnd(netIncome, revenue) && revenue.val !== 0) filings.netMargin = netIncome.val / revenue.val;
  if (sameEnd(ocf, capex)) {
    filings.freeCashFlow = ocf.val - capex.val;
    if (sameEnd(ocf, revenue) && revenue.val !== 0) filings.freeCashFlowMargin = filings.freeCashFlow / revenue.val;
  }
  return { filings: filings };
}

function buildQuote(meta) {
  const quote = {};
  if (typeof meta.symbol === "string") quote.symbol = meta.symbol;
  if (typeof meta.shortName === "string") quote.name = meta.shortName;
  else if (typeof meta.longName === "string") quote.name = meta.longName;
  if (typeof meta.currency === "string") quote.currency = meta.currency;
  if (typeof meta.exchangeName === "string") quote.exchange = meta.exchangeName;
  else if (typeof meta.fullExchangeName === "string") quote.exchange = meta.fullExchangeName;
  if (typeof meta.regularMarketPrice === "number") quote.regularMarketPrice = meta.regularMarketPrice;
  if (typeof meta.regularMarketChangePercent === "number") quote.regularMarketChangePercent = meta.regularMarketChangePercent;
  if (typeof meta.instrumentType === "string") quote.type = meta.instrumentType;
  else quote.type = "unknown";
  if (!quote.symbol && typeof quote.regularMarketPrice !== "number") return null;
  return quote;
}

async function handleQuote(request, url) {
  if (request.method !== "GET") return json({ ok: false, error: "method_not_allowed" }, 405, QUOTE_CACHE);
  const q = (url.searchParams.get("q") || "").trim();
  if (q.length < 2) return json({ ok: false, error: "too_short" }, 400, QUOTE_CACHE);
  const symbol = q.toUpperCase();
  const yahooUrl = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(symbol) + "?interval=1d&range=5d";
  let meta = null;
  try {
    const res = await fetch(yahooUrl, { headers: { "User-Agent": YAHOO_UA, "Accept": "application/json" } });
    if (res.ok) {
      const body = await res.json();
      const result = body && body.chart && Array.isArray(body.chart.result) ? body.chart.result[0] : null;
      if (result && result.meta) meta = result.meta;
    }
  } catch (err) {
    meta = null;
  }
  const quote = meta ? buildQuote(meta) : null;
  if (!quote) return json({ ok: false, error: "not_found" }, 404, QUOTE_CACHE);
  const secSymbol = typeof quote.symbol === "string" ? quote.symbol : symbol;
  const pack = await buildFilings(secSymbol);
  const payload = { ok: true, quote: quote, filings: pack.filings };
  if (pack.filingsNote) payload.filingsNote = pack.filingsNote;
  return json(payload, 200, QUOTE_CACHE);
}

