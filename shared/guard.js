// Early reject for market-data routes. No upstream work, no cache lookup.

const SCAN = /wp-|[/\\]\.env|\.env\b|\.php\b|xmlrpc|\/\.git|\/\.aws|\/\.svn|phpmyadmin/i;
const BAD_UA = /(sqlmap|nikto|nmap|masscan|zgrab|nuclei|acunetix|nessus|wpscan|dirbuster|gobuster|scrapy|semrushbot|ahrefsbot|petalbot|bytespider|dotbot|mj12bot)/i;
// Crawlers and link unfurlers must reach HTML and /api even if a later rule
// would treat a generic bot as hostile. robots.txt is unchanged.
const ALLOW_UA = /(googlebot|google-inspectiontool|storebot-google|adsbot-google|mediapartners-google|bingbot|gptbot|chatgpt-user|oai-searchbot|claudebot|claude-user|claude-searchbot|anthropic-ai|twitterbot|facebookexternalhit|facebot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|pinterestbot|redditbot|embedly|quora link preview|applebot)/i;
// Subscribe stays exempt: the existing worker tests (and real browsers behind some proxies)
// must keep reaching the newsletter route. Market-data routes are not exempt.
const UA_EXEMPT = /^\/api\/(?:subscribe|newsletter)(?:\/|$)/;

export const SYMBOL_RE = /^[A-Z0-9^][A-Z0-9.\-=]{0,23}$/;

export function isScannerPath(pathname) {
  return SCAN.test(String(pathname || ""));
}

export function isBadUa(ua) {
  if (ua == null) return true;
  const s = String(ua).trim();
  if (!s) return true;
  if (ALLOW_UA.test(s)) return false;
  return BAD_UA.test(s);
}

export function normalizeSymbol(raw) {
  const s = String(raw || "").trim().toUpperCase();
  if (!SYMBOL_RE.test(s)) return null;
  return s;
}

export function parseSymbolList(raw, cap = 30) {
  const parts = String(raw || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return { ok: false, error: "symbols_required" };
  if (parts.length > cap) return { ok: false, error: "too_many_symbols" };
  const out = [];
  const seen = new Set();
  for (const p of parts) {
    const s = normalizeSymbol(p);
    if (!s) return { ok: false, error: "bad_symbol" };
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  if (!out.length) return { ok: false, error: "symbols_required" };
  out.sort();
  return { ok: true, symbols: out };
}

export function deny(request) {
  let url;
  try { url = new URL(request.url); } catch { return new Response(null, { status: 400 }); }
  if (isScannerPath(url.pathname)) {
    return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });
  }
  if (url.pathname.startsWith("/api/") && !UA_EXEMPT.test(url.pathname) && isBadUa(request.headers.get("user-agent"))) {
    return new Response(null, { status: 403, headers: { "cache-control": "no-store" } });
  }
  return null;
}
