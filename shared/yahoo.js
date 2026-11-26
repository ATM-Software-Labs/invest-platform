// Yahoo chart + search. Same public host the invest worker already uses. No API key.

export const YAHOO_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const RANGE_PRESETS = {
  "1D": { interval: "5m", yahooRange: "1d", ttl: 900, intra: true },
  "5D": { interval: "15m", yahooRange: "5d", ttl: 900, intra: true },
  "1M": { interval: "1d", yahooRange: "1mo", ttl: 3600, intra: false },
  "6M": { interval: "1d", yahooRange: "6mo", ttl: 3600, intra: false },
  YTD: { interval: "1d", yahooRange: "ytd", ttl: 3600, intra: false },
  "1Y": { interval: "1d", yahooRange: "1y", ttl: 3600, intra: false },
  "5Y": { interval: "1wk", yahooRange: "5y", ttl: 3600, intra: false },
  MAX: { interval: "1wk", yahooRange: "max", ttl: 3600, intra: false },
};

export function normalizeRange(raw) {
  const key = String(raw || "1Y").trim().toUpperCase();
  return RANGE_PRESETS[key] ? key : null;
}

export function chartUrl(symbol, preset) {
  return "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(symbol)
    + "?interval=" + preset.interval + "&range=" + preset.yahooRange + "&includePrePost=false&events=div%7Csplit";
}

export function parseYahooChart(data, intra) {
  const result = data && data.chart && Array.isArray(data.chart.result) ? data.chart.result[0] : null;
  if (!result || !result.meta) return null;
  const meta = result.meta;
  const ts = Array.isArray(result.timestamp) ? result.timestamp : [];
  const q = result.indicators && result.indicators.quote && result.indicators.quote[0] ? result.indicators.quote[0] : {};
  const bars = [];
  for (let i = 0; i < ts.length; i++) {
    const close = q.close ? q.close[i] : null;
    const open = q.open ? q.open[i] : null;
    const high = q.high ? q.high[i] : null;
    const low = q.low ? q.low[i] : null;
    if (!(close > 0) || !(open > 0) || !(high > 0) || !(low > 0)) continue;
    const volume = q.volume && q.volume[i] > 0 ? q.volume[i] : 0;
    const time = intra ? ts[i] : new Date(ts[i] * 1000).toISOString().slice(0, 10);
    const prev = bars.length ? bars[bars.length - 1] : null;
    if (prev && prev.time === time) {
      prev.high = Math.max(prev.high, high);
      prev.low = Math.min(prev.low, low);
      prev.close = close;
      prev.volume += volume;
      continue;
    }
    bars.push({ time, open, high, low, close, volume });
  }
  return { meta, bars };
}

export async function fetchJson(url, timeoutMs = 8000) {
  const res = await fetch(url, {
    headers: { "User-Agent": YAHOO_UA, Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const err = new Error("http " + res.status);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function loadChart(symbol, preset) {
  const data = await fetchJson(chartUrl(symbol, preset));
  return parseYahooChart(data, preset.intra);
}
