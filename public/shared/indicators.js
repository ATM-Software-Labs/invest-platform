// Pure indicator math shared by the browser, Pages Functions and unit tests.
// No I/O. EMA, POC, pivots and distances must stay identical on both sides.

export function ema(values, period) {
  const n = values.length;
  const out = new Array(n).fill(null);
  const p = period | 0;
  if (p < 1 || n < p) return out;
  let sum = 0;
  for (let i = 0; i < p; i++) sum += values[i];
  let prev = sum / p;
  out[p - 1] = prev;
  const k = 2 / (p + 1);
  for (let i = p; i < n; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function lastNumber(arr) {
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null && Number.isFinite(arr[i])) return arr[i];
  return null;
}

// Volume profile: close falls into equal bins across the window's low-high.
// The POC is the centre of the bin with the most accumulated volume.
export function poc(bars, binCount = 48) {
  if (!bars || !bars.length) return null;
  let lo = Infinity;
  let hi = -Infinity;
  let volSum = 0;
  for (const b of bars) {
    if (b.low < lo) lo = b.low;
    if (b.high > hi) hi = b.high;
    volSum += b.volume > 0 ? b.volume : 0;
  }
  if (!(hi >= lo) || !Number.isFinite(lo)) return null;
  if (!(hi > lo)) {
    return { price: bars[bars.length - 1].close, volume: volSum, low: lo, high: hi };
  }
  const n = Math.max(4, binCount | 0);
  const step = (hi - lo) / n;
  const vols = new Array(n).fill(0);
  for (const b of bars) {
    const px = Number.isFinite(b.close) ? b.close : (b.high + b.low) / 2;
    let i = Math.floor((px - lo) / step);
    if (i < 0) i = 0;
    if (i >= n) i = n - 1;
    vols[i] += b.volume > 0 ? b.volume : 0;
  }
  let best = -1;
  let bi = 0;
  for (let i = 0; i < n; i++) if (vols[i] > best) { best = vols[i]; bi = i; }
  return { price: lo + (bi + 0.5) * step, volume: best, low: lo, high: hi };
}

// Swing high/low: a bar whose high (low) is strictly beyond `wing` bars on each side.
export function swingPivots(bars, wing = 3) {
  const highs = [];
  const lows = [];
  const w = wing | 0;
  if (!bars || w < 1 || bars.length < w * 2 + 1) return { highs, lows };
  for (let i = w; i < bars.length - w; i++) {
    let sh = true;
    let sl = true;
    for (let j = i - w; j <= i + w; j++) {
      if (j === i) continue;
      if (bars[j].high >= bars[i].high) sh = false;
      if (bars[j].low <= bars[i].low) sl = false;
      if (!sh && !sl) break;
    }
    if (sh) highs.push({ index: i, price: bars[i].high, time: bars[i].time });
    if (sl) lows.push({ index: i, price: bars[i].low, time: bars[i].time });
  }
  return { highs, lows };
}

// Two or three most recent swing points of the window (supports and resistances mixed).
export function relevantLevels(pivots, count = 3) {
  const n = Math.max(2, Math.min(3, count | 0));
  const tagged = []
    .concat((pivots.highs || []).map((p) => ({ ...p, kind: "resistance" })))
    .concat((pivots.lows || []).map((p) => ({ ...p, kind: "support" })));
  tagged.sort((a, b) => b.index - a.index);
  return tagged.slice(0, n);
}

// Line through the more recent of the last two highs or the last two lows, projected to `toIndex`.
export function trendProjection(pivots, toIndex) {
  const highs = pivots.highs || [];
  const lows = pivots.lows || [];
  const pairH = highs.length >= 2 ? highs.slice(-2) : null;
  const pairL = lows.length >= 2 ? lows.slice(-2) : null;
  const scoreH = pairH ? pairH[1].index : -1;
  const scoreL = pairL ? pairL[1].index : -1;
  const pair = scoreH >= scoreL ? pairH : pairL;
  if (!pair) return null;
  const kind = scoreH >= scoreL ? "high" : "low";
  const a = pair[0];
  const b = pair[1];
  const dx = b.index - a.index;
  if (!dx) return null;
  const slope = (b.price - a.price) / dx;
  const end = toIndex > b.index ? toIndex : b.index;
  return {
    kind,
    from: { index: a.index, time: a.time, price: a.price },
    to: { index: end, time: null, price: a.price + slope * (end - a.index) },
    slope,
  };
}

export function distPct(price, level) {
  if (!(price > 0) || !(level > 0)) return null;
  return (price / level - 1) * 100;
}

export function nearLevel(price, level, pct) {
  const d = distPct(price, level);
  return d != null && Math.abs(d) <= pct;
}

export function nearestSupport(bars, price) {
  const { lows } = swingPivots(bars, 3);
  let best = null;
  for (const p of lows) {
    if (p.price <= price * 1.002 && (best == null || p.price > best)) best = p.price;
  }
  return best;
}

export function relativeStrength(closes, sessions) {
  const n = sessions | 0;
  if (!closes || closes.length <= n || n < 1) return null;
  const now = closes[closes.length - 1];
  const prev = closes[closes.length - 1 - n];
  if (!(now > 0) || !(prev > 0)) return null;
  return (now / prev - 1) * 100;
}

export function ytdStrength(bars, year) {
  if (!bars || !bars.length) return null;
  const prefix = String(year) + "-";
  const first = bars.find((b) => typeof b.time === "string" && b.time.startsWith(prefix) && b.close > 0);
  const last = bars[bars.length - 1];
  if (!first || !(last.close > 0)) return null;
  return (last.close / first.close - 1) * 100;
}

export function drawdownFromHigh(bars) {
  if (!bars || !bars.length) return null;
  let m = 0;
  for (const b of bars) if (b.high > m) m = b.high;
  const last = bars[bars.length - 1].close;
  if (!(m > 0) || !(last > 0)) return null;
  return (last / m - 1) * 100;
}

// Per-bar spike filter used by the charts feed: a high counts only when it sits
// next to that bar's own close. The cap is not a cap on the all-time high itself.
export function seriesAth(bars) {
  let best = 0;
  for (const b of bars || []) {
    const c = b.close;
    if (!(c > 0)) continue;
    const o = b.open > 0 ? b.open : c;
    const ref = Math.max(c, o);
    const h = b.high;
    const v = h > 0 && h >= c * 0.999 && h <= ref * 3 ? h : c;
    if (v > best) best = v;
  }
  return best > 0 ? best : null;
}

export const MOVE_PCT = 3;
export const LEVEL_PCT = 2;
export const TOUCH_PCT = 0.4;

export function actionReasons(row, targets) {
  const reasons = [];
  if (row && row.changePct != null && Math.abs(row.changePct) > MOVE_PCT) {
    reasons.push({ id: "move", text: "Movimiento > 3 %" });
  }
  if (row && nearLevel(row.price, row.ema200, LEVEL_PCT)) {
    reasons.push({ id: "ema200", text: "A ±2 % de la EMA 200" });
  }
  if (row && nearLevel(row.price, row.poc, LEVEL_PCT)) {
    reasons.push({ id: "poc", text: "A ±2 % del POC" });
  }
  const list = Array.isArray(targets) ? targets : [];
  if (row && list.some((t) => nearLevel(row.price, Number(t), TOUCH_PCT))) {
    reasons.push({ id: "target", text: "Toca un precio objetivo" });
  }
  return reasons;
}

export const FUNDAMENTAL_FORMULA =
  "Ratio fundamental = margen de flujo de caja libre (FCF / ingresos) del último ejercicio en que ambos conceptos cierran juntos. Si no hay FCF verificable, margen neto (resultado neto / ingresos). Fuente: SEC EDGAR, XBRL del 10-K, vía /api/quote. Sin cifra verificable se muestra n/d; no se estima. No es una recomendación.";

export function fundamentalRatio(filings) {
  if (!filings || typeof filings !== "object") return null;
  if (typeof filings.freeCashFlowMargin === "number" && Number.isFinite(filings.freeCashFlowMargin)) {
    return { value: filings.freeCashFlowMargin, basis: "fcf" };
  }
  if (typeof filings.netMargin === "number" && Number.isFinite(filings.netMargin)) {
    return { value: filings.netMargin, basis: "net" };
  }
  return null;
}

export function closeness(row) {
  const ds = [];
  if (row && row.distPoc != null) ds.push(Math.abs(row.distPoc));
  if (row && row.distSupport != null) ds.push(Math.abs(row.distSupport));
  if (!ds.length) return null;
  return Math.min(...ds);
}
