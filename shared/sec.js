// Compact SEC 10-K reader. Same concepts as the invest worker, cached per URL.
// One ticker map plus a handful of companyconcept calls. Not used by /api/pulse.

const SEC_UA = "invest.trujillomingorance.com security@trujillomingorance.com";
const TICKER_URL = "https://www.sec.gov/files/company_tickers.json";
const US_NOTE = "Las cifras de los informes anuales solo estan disponibles para cotizaciones de Estados Unidos por ahora.";
const SEC_DOWN = "No se han podido consultar las cifras de los informes anuales.";
const CONCEPTS = [
  ["revenue", ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet"]],
  ["netIncome", ["NetIncomeLoss"]],
  ["operatingCashFlow", ["NetCashProvidedByUsedInOperatingActivities"]],
  ["capex", ["PaymentsToAcquirePropertyPlantAndEquipment"]],
  ["longTermDebt", ["LongTermDebtNoncurrent", "LongTermDebt"]],
  ["cash", ["CashCashEquivalentsAndShortTermInvestments", "CashAndCashEquivalentsAtCarryingValue"]],
];

async function secText(url) {
  const cache = globalThis.caches && globalThis.caches.default;
  const key = new Request(url, { method: "GET" });
  if (cache) {
    try {
      const hit = await cache.match(key);
      if (hit) return { ok: true, text: await hit.text() };
    } catch { /* miss */ }
  }
  const res = await fetch(url, { headers: { "User-Agent": SEC_UA, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return { ok: false, text: "" };
  const text = await res.text();
  if (cache) {
    try {
      await cache.put(key, new Response(text, { headers: { "content-type": "application/json", "cache-control": "public, max-age=86400" } }));
    } catch { /* cache full or disallowed */ }
  }
  return { ok: true, text };
}

function pickFy(concept) {
  const units = concept && concept.units && concept.units.USD;
  if (!Array.isArray(units)) return null;
  const rows = [];
  for (const fact of units) {
    if (!fact || fact.form !== "10-K" || fact.fp !== "FY") continue;
    if (typeof fact.end !== "string" || typeof fact.val !== "number") continue;
    rows.push(fact);
  }
  if (!rows.length) return null;
  rows.sort((a, b) => (a.end < b.end ? 1 : a.end > b.end ? -1 : (a.filed || "") < (b.filed || "") ? 1 : -1));
  return rows[0];
}

function cikFor(data, symbol) {
  const want = symbol.toUpperCase();
  const values = Array.isArray(data) ? data : Object.values(data || {});
  for (const item of values) {
    if (!item || typeof item.ticker !== "string" || item.ticker.toUpperCase() !== want) continue;
    const n = Number(item.cik_str);
    if (!Number.isFinite(n)) return null;
    return String(Math.trunc(n)).padStart(10, "0");
  }
  return null;
}

async function pickConcept(cik, tags) {
  let best = null;
  for (const tag of tags) {
    const url = "https://data.sec.gov/api/xbrl/companyconcept/CIK" + cik + "/us-gaap/" + tag + ".json";
    const got = await secText(url);
    if (!got.ok || !got.text) continue;
    let data = null;
    try { data = JSON.parse(got.text); } catch { continue; }
    const fact = pickFy(data);
    if (!fact) continue;
    const row = { end: fact.end, val: fact.val, url };
    if (typeof fact.fy === "number") row.fy = fact.fy;
    if (typeof fact.filed === "string") row.filed = fact.filed;
    if (!best || fact.end > best.end) best = row;
  }
  return best;
}

function sameEnd(a, b) {
  return !!(a && b && a.end && a.end === b.end);
}

export function isUsTicker(symbol) {
  return /^[A-Z]{1,5}$/.test(symbol);
}

export async function buildFilings(symbol) {
  if (!isUsTicker(symbol)) return { filings: null, filingsNote: US_NOTE };
  let tickerText;
  try { tickerText = await secText(TICKER_URL); } catch { return { filings: null, filingsNote: SEC_DOWN }; }
  if (!tickerText.ok || !tickerText.text) return { filings: null, filingsNote: SEC_DOWN };
  let map = null;
  try { map = JSON.parse(tickerText.text); } catch { return { filings: null, filingsNote: SEC_DOWN }; }
  const cik = cikFor(map, symbol);
  if (!cik) return { filings: null, filingsNote: US_NOTE };
  const filings = {};
  for (const pair of CONCEPTS) {
    try {
      const picked = await pickConcept(cik, pair[1]);
      if (picked) filings[pair[0]] = picked;
    } catch { /* one concept down does not invent the rest */ }
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
  if (!Object.keys(filings).length) return { filings: null, filingsNote: SEC_DOWN };
  return { filings };
}
