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

// ---- Symbol resolution: ticker, company name, ISIN, aliases (indices, crypto, commodities) ----
const YAHOO_SEARCH = "https://query1.finance.yahoo.com/v1/finance/search";
const UPSTREAM_TIMEOUT_MS = 8000;
const NOT_FOUND_CACHE = "public, max-age=300";
const SEARCH_CACHE = "public, max-age=3600";
const MAX_CHART_TRIES = 3;

// Keys are folded (lowercase, no accents, single spaces). Values are Yahoo Finance symbols.
const ALIASES = (function () {
  const m = {};
  const add = function (sym, names) { for (const n of names) m[n] = sym; };
  // Indices
  add("^GSPC", ["s&p 500", "s&p500", "sp500", "sp 500", "s&p", "standard & poor's 500", "standard and poors 500"]);
  add("^IXIC", ["nasdaq", "nasdaq composite"]);
  add("^NDX", ["nasdaq 100", "nasdaq100", "nasdaq-100"]);
  add("^DJI", ["dow jones", "dow jones industrial average", "dji"]);
  add("^IBEX", ["ibex", "ibex 35", "ibex35", "ibex-35"]);
  add("^GDAXI", ["dax", "dax 40", "dax40"]);
  add("^FCHI", ["cac 40", "cac40"]);
  add("^STOXX50E", ["euro stoxx 50", "eurostoxx 50", "eurostoxx", "euro stoxx", "stoxx 50", "eurostoxx50"]);
  add("^FTSE", ["ftse", "ftse 100", "ftse100"]);
  add("^N225", ["nikkei", "nikkei 225", "nikkei225"]);
  add("^VIX", ["vix"]);
  // Crypto (the plain tickers BTC/ETH are also US ETFs on Yahoo; a retail search for "BTC" means the coin).
  // Quoted in EUR; resolveQuote falls back to the -USD pair when Yahoo has no EUR pair.
  add("BTC-EUR", ["btc", "bitcoin", "xbt"]);
  add("ETH-EUR", ["eth", "ethereum", "ether"]);
  add("SOL-EUR", ["solana"]);
  add("XRP-EUR", ["xrp", "ripple"]);
  add("ADA-EUR", ["cardano"]);
  add("DOGE-EUR", ["doge", "dogecoin"]);
  add("BNB-EUR", ["bnb", "binance coin"]);
  // Commodities and FX
  add("GC=F", ["oro", "gold", "xau", "xauusd", "xau/usd", "oro spot"]);
  add("SI=F", ["plata", "silver", "xag", "xagusd", "xag/usd"]);
  add("BZ=F", ["brent", "petroleo", "petroleo brent", "oil", "crude oil brent"]);
  add("CL=F", ["wti", "crudo", "crude oil", "petroleo wti"]);
  add("NG=F", ["gas natural", "natural gas"]);
  add("HG=F", ["cobre", "copper"]);
  add("EURUSD=X", ["eurusd", "eur/usd", "eur usd", "euro dolar"]);
  // IBEX 35 by name (Yahoo's name search often ranks German/OTC lines above Madrid)
  add("ANA.MC", ["acciona"]);
  add("ANE.MC", ["acciona energia"]);
  add("ACX.MC", ["acerinox"]);
  add("ACS.MC", ["acs", "grupo acs"]);
  add("AENA.MC", ["aena"]);
  add("AMS.MC", ["amadeus"]);
  add("MTS.MC", ["arcelormittal", "arcelor mittal", "arcelor"]);
  add("SAB.MC", ["sabadell", "banco sabadell", "banc sabadell"]);
  add("BKT.MC", ["bankinter"]);
  add("BBVA.MC", ["bbva", "banco bilbao vizcaya", "banco bilbao vizcaya argentaria"]);
  add("CABK.MC", ["caixabank", "caixa bank", "la caixa"]);
  add("CLNX.MC", ["cellnex"]);
  add("ENG.MC", ["enagas"]);
  add("ELE.MC", ["endesa"]);
  add("FER.MC", ["ferrovial"]);
  add("FDR.MC", ["fluidra"]);
  add("GRF.MC", ["grifols"]);
  add("IAG.MC", ["iag", "international airlines group", "iberia"]);
  add("IBE.MC", ["iberdrola"]);
  add("ITX.MC", ["inditex", "zara", "industria de diseno textil"]);
  add("IDR.MC", ["indra"]);
  add("COL.MC", ["colonial", "inmobiliaria colonial"]);
  add("LOG.MC", ["logista"]);
  add("MAP.MC", ["mapfre"]);
  add("MRL.MC", ["merlin", "merlin properties"]);
  add("NTGY.MC", ["naturgy"]);
  add("PUIG.MC", ["puig"]);
  add("RED.MC", ["redeia", "red electrica", "red electrica de espana"]);
  add("REP.MC", ["repsol"]);
  add("ROVI.MC", ["rovi", "laboratorios rovi"]);
  add("SCYR.MC", ["sacyr"]);
  add("SAN.MC", ["santander", "banco santander"]);
  add("SLR.MC", ["solaria"]);
  add("TEF.MC", ["telefonica"]);
  add("UNI.MC", ["unicaja", "unicaja banco"]);
  // Popular names that are not the ticker
  add("MC.PA", ["lvmh", "louis vuitton"]);
  add("BRK-B", ["berkshire", "berkshire hathaway"]);
  add("GOOGL", ["google", "alphabet"]);
  add("META", ["facebook"]);
  add("SIE.DE", ["siemens"]);
  add("1211.HK", ["byd", "byd company"]);
  add("MELI", ["mercado libre", "mercadolibre"]);
  return m;
})();

const TYPE_RANK = { EQUITY: 0, ETF: 0, INDEX: 0, CRYPTOCURRENCY: 0, MUTUALFUND: 1, CURRENCY: 1, FUTURE: 2 };
// 1 = primary US/EU venues (incl. Madrid) and crypto, 2 = unknown, 3 = OTC, regional German, synthetic and foreign CDR lines.
// Within a tier Yahoo's relevance order is kept (Spanish names that Yahoo ranks badly are covered by ALIASES).
const EXCHANGE_TIER = {
  MCE: 1, NMS: 1, NYQ: 1, NGM: 1, NCM: 1, ASE: 1, PCX: 1, BTS: 1, NAS: 1, NYS: 1, CCC: 1, SNP: 1, DJI: 1, CME: 1, CMX: 1, NYM: 1, CBT: 1, CXI: 1,
  PAR: 1, AMS: 1, GER: 1, LSE: 1, MIL: 1, EBS: 1, VTX: 1, CPH: 1, STO: 1, HEL: 1, OSL: 1, BRU: 1, LIS: 1, VIE: 1, ISE: 1, DUB: 1, TOR: 2,
  PNK: 3, OQX: 3, OQB: 3, OEM: 3, OGM: 3, HAN: 3, HAM: 3, FRA: 3, MUN: 3, STU: 3, DUS: 3, BER: 3, CXE: 3, DXE: 3, CXA: 3, NEO: 3, TLO: 3,
  IOB: 3, MEX: 3, BUE: 3, AQS: 3, SAO: 3, SGO: 3, BVC: 3, WSE: 3
};

// Crypto pairs on Yahoo look like "BTC-USD" / "BTC-EUR". Returns the coin ("BTC") or null.
function cryptoBase(sym) {
  const m = /^([A-Z0-9]{2,15})-(USD|EUR)$/.exec(typeof sym === "string" ? sym : "");
  return m ? m[1] : null;
}

function fold(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function isIsin(s) {
  if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(s)) return false;
  let digits = "";
  for (const ch of s.slice(0, 11)) digits += /[0-9]/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
  let sum = 0, dbl = true;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return (10 - (sum % 10)) % 10 === Number(s[11]);
}

// "AAPL", "SAN.MC", "^GSPC", "GC=F", "BTC-USD": try the exact symbol first. Names ("Inditex", "apple") go to search first.
function looksLikeTicker(raw) {
  if (!/^[\^A-Za-z0-9.\-=]{1,20}$/.test(raw)) return false;
  if (/[\^.=\-0-9]/.test(raw)) return true;
  return raw === raw.toUpperCase() || raw.length <= 3;
}

async function upstreamJson(url, cacheTtl) {
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const key = new Request(url, { method: "GET" });
  if (cache && cacheTtl) {
    try { const hit = await cache.match(key); if (hit) return { status: 200, data: await hit.json() }; } catch (err) {}
  }
  let res;
  try {
    res = await fetch(url, { headers: { "User-Agent": YAHOO_UA, "Accept": "application/json" }, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  } catch (err) {
    return { status: 0, data: null, upstreamError: true };
  }
  const upstreamError = res.status === 429 || res.status >= 500;
  let text = "", data = null;
  try { text = await res.text(); data = text ? JSON.parse(text) : null; } catch (err) { data = null; }
  if (res.ok && data && cache && cacheTtl) {
    try { await cache.put(key, new Response(text, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=" + cacheTtl } })); } catch (err) {}
  }
  return { status: res.status, data: data, upstreamError: upstreamError || (!res.ok && res.status !== 404 && res.status !== 400 && !data) };
}

async function chartQuote(symbol, state) {
  const got = await upstreamJson("https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(symbol) + "?interval=1d&range=5d", 0);
  if (got.upstreamError) { state.upstreamError = true; return null; }
  const result = got.data && got.data.chart && Array.isArray(got.data.chart.result) ? got.data.chart.result[0] : null;
  return result && result.meta ? buildQuote(result.meta) : null;
}

function rankCandidates(quotes, opts) {
  const out = [];
  (Array.isArray(quotes) ? quotes : []).forEach(function (x, i) {
    if (!x || typeof x.symbol !== "string" || !x.symbol) return;
    const type = typeof x.quoteType === "string" ? x.quoteType : "";
    if (!(type in TYPE_RANK)) return;
    if (type === "FUTURE" && !opts.allowFutures) return;
    const ex = typeof x.exchange === "string" ? x.exchange : "";
    out.push({
      symbol: x.symbol,
      name: x.shortname || x.longname || null,
      exchange: x.exchDisp || ex || null,
      type: type,
      _rank: [TYPE_RANK[type], ex in EXCHANGE_TIER ? EXCHANGE_TIER[ex] : 2, i]
    });
  });
  out.sort(function (a, b) {
    for (let k = 0; k < 3; k++) if (a._rank[k] !== b._rank[k]) return a._rank[k] - b._rank[k];
    return 0;
  });
  return out.map(function (c) { return { symbol: c.symbol, name: c.name, exchange: c.exchange, type: c.type }; });
}

async function searchOnce(q, state) {
  const url = YAHOO_SEARCH + "?q=" + encodeURIComponent(q) + "&quotesCount=10&newsCount=0&listsCount=0&enableFuzzyQuery=false&lang=es-ES&region=ES";
  const got = await upstreamJson(url, 86400);
  if (got.upstreamError) { state.upstreamError = true; return []; }
  const quotes = got.data && Array.isArray(got.data.quotes) ? got.data.quotes : [];
  let ranked = rankCandidates(quotes, { allowFutures: false });
  if (!ranked.length) ranked = rankCandidates(quotes, { allowFutures: true });
  return ranked;
}

// Yahoo's search misses accented input ("Linea Directa" works, "L\u00ednea Directa" does not) and some spaced
// brand names ("MercadoLibre"), so retry with an ASCII-folded and a space-less variant.
async function searchCandidates(q, state) {
  const variants = [q];
  const ascii = fold(q).replace(/['\u2019`]/g, "").replace(/[^a-z0-9&.\- ]/g, " ").replace(/\s+/g, " ").trim();
  if (ascii && variants.indexOf(ascii) === -1) variants.push(ascii);
  const joined = ascii.replace(/ /g, "");
  if (joined.length >= 3 && variants.indexOf(joined) === -1 && ascii.indexOf(" ") !== -1) variants.push(joined);
  for (const v of variants) {
    const ranked = await searchOnce(v, state);
    if (ranked.length) return ranked;
    if (state.upstreamError) break;
  }
  return [];
}

// Returns { quote, resolved, alternatives } or { quote: null, suggestions, upstreamError }.
async function resolveQuote(raw) {
  const state = { upstreamError: false };
  const q = raw.trim().replace(/\s+/g, " ");
  const upper = q.toUpperCase();
  const folded = fold(q);
  const tried = {};
  const tryChart = async function (sym) {
    if (tried[sym]) return null;
    tried[sym] = true;
    return chartQuote(sym, state);
  };
  const done = function (quote, via, alternatives, eurFallback) {
    const cand = (alternatives || []).find(function (c) { return c.symbol === quote.symbol; });
    if (cand && cand.name && (!quote.name || quote.name === quote.symbol)) quote.name = cand.name;
    const resolved = { query: q, symbol: quote.symbol || null, via: via };
    // No EUR pair for this coin: the price stays in USD and the client labels it.
    if (eurFallback) resolved.currencyFallback = { preferred: "EUR", currency: quote.currency || "USD" };
    const base = cryptoBase(quote.symbol);
    return { quote: quote, resolved: resolved, alternatives: (alternatives || []).filter(function (c) { return c.symbol !== quote.symbol && !(base && cryptoBase(c.symbol) === base); }).slice(0, 4) };
  };
  // Coins found by name or search: EUR pair first, USD pair as a labelled fallback.
  const tryCrypto = async function (base) {
    const eur = await tryChart(base + "-EUR");
    if (eur) return { quote: eur, fallback: false };
    const usd = await tryChart(base + "-USD");
    return usd ? { quote: usd, fallback: true } : null;
  };

  const alias = ALIASES[folded];
  if (alias) {
    const coin = cryptoBase(alias);
    if (coin) {
      const got = await tryCrypto(coin);
      if (got) return done(got.quote, "alias", null, got.fallback);
    } else {
      const quote = await tryChart(alias);
      if (quote) return done(quote, "alias");
    }
  }

  const compact = upper.replace(/\s+/g, "");
  if (isIsin(compact)) {
    const cands = await searchCandidates(compact, state);
    for (const c of cands.slice(0, MAX_CHART_TRIES)) {
      const quote = await tryChart(c.symbol);
      if (quote) return done(quote, "isin", cands);
    }
    return { quote: null, suggestions: cands.slice(0, 5), upstreamError: state.upstreamError };
  }

  const tickerish = looksLikeTicker(q);
  if (tickerish) {
    let quote = await tryChart(upper);
    if (quote) return done(quote, "symbol");
    // "XYZ-EUR" picked from the suggestions but Yahoo only has the USD pair.
    const eurPair = upper.match(/^([A-Z0-9]{2,15})-EUR$/);
    if (eurPair) {
      quote = await tryChart(eurPair[1] + "-USD");
      if (quote) return done(quote, "symbol", null, true);
    }
    // Share classes: BRK.B / BF.B are BRK-B / BF-B on Yahoo.
    const cls = upper.match(/^([A-Z]{1,6})[.\/]([A-C])$/);
    if (cls) {
      quote = await tryChart(cls[1] + "-" + cls[2]);
      if (quote) return done(quote, "symbol");
    }
  }

  const cands = await searchCandidates(q, state);
  let charts = 0;
  for (const c of cands) {
    if (charts >= MAX_CHART_TRIES) break;
    if (tried[c.symbol]) continue;
    charts++;
    const coin = c.type === "CRYPTOCURRENCY" ? cryptoBase(c.symbol) : null;
    if (coin) {
      const got = await tryCrypto(coin);
      if (got) return done(got.quote, "search", cands, got.fallback);
      continue;
    }
    const quote = await tryChart(c.symbol);
    if (quote) return done(quote, "search", cands);
  }

  if (!tickerish && /^[A-Za-z0-9.\-]{2,12}$/.test(q)) {
    const quote = await tryChart(upper);
    if (quote) return done(quote, "symbol");
  }
  return { quote: null, suggestions: cands.slice(0, 5), upstreamError: state.upstreamError };
}

async function handleQuote(request, url) {
  if (request.method !== "GET") return json({ ok: false, error: "method_not_allowed" }, 405, QUOTE_CACHE);
  const q = (url.searchParams.get("q") || "").trim();
  if (q.length < 2) return json({ ok: false, error: "too_short" }, 400, QUOTE_CACHE);
  if (q.length > 64) return json({ ok: false, error: "too_long" }, 400, QUOTE_CACHE);
  const r = await resolveQuote(q);
  if (!r.quote) {
    if (r.upstreamError) return json({ ok: false, error: "upstream_unavailable", suggestions: r.suggestions || [] }, 502, "no-store");
    return json({ ok: false, error: "not_found", suggestions: r.suggestions || [] }, 404, NOT_FOUND_CACHE);
  }
  const quote = r.quote;
  const secSymbol = typeof quote.symbol === "string" ? quote.symbol : q.toUpperCase();
  const pack = await buildFilings(secSymbol);
  const payload = { ok: true, quote: quote, filings: pack.filings, resolved: r.resolved, alternatives: r.alternatives };
  if (pack.filingsNote) payload.filingsNote = pack.filingsNote;
  return json(payload, 200, QUOTE_CACHE);
}

// Lightweight suggestions for the search boxes: aliases first, then ranked Yahoo search results.
async function handleSearch(request, url) {
  if (request.method !== "GET") return json({ ok: false, error: "method_not_allowed" }, 405, SEARCH_CACHE);
  const q = (url.searchParams.get("q") || "").trim().replace(/\s+/g, " ");
  if (q.length < 2) return json({ ok: false, error: "too_short" }, 400, SEARCH_CACHE);
  if (q.length > 64) return json({ ok: false, error: "too_long" }, 400, SEARCH_CACHE);
  const state = { upstreamError: false };
  const folded = fold(q);
  const results = [];
  const seen = {};
  const push = function (c) { if (c && c.symbol && !seen[c.symbol]) { seen[c.symbol] = true; results.push(c); } };
  if (ALIASES[folded]) push({ symbol: ALIASES[folded], name: q, exchange: null, type: "ALIAS" });
  const compact = q.toUpperCase().replace(/\s+/g, "");
  const cands = await searchCandidates(isIsin(compact) ? compact : q, state);
  // Coins are offered as their EUR pair (the quote endpoint falls back to USD if Yahoo has none).
  cands.forEach(function (c) {
    const coin = c.type === "CRYPTOCURRENCY" ? cryptoBase(c.symbol) : null;
    push(coin ? { symbol: coin + "-EUR", name: typeof c.name === "string" ? c.name.replace(/ USD$/, " EUR") : c.name, exchange: c.exchange, type: c.type } : c);
  });
  if (!results.length && state.upstreamError) return json({ ok: false, error: "upstream_unavailable", results: [] }, 502, "no-store");
  return json({ ok: true, results: results.slice(0, 8) }, 200, SEARCH_CACHE);
}
