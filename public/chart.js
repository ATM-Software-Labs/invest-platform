import { ema, poc, swingPivots, relevantLevels, trendProjection } from "/shared/indicators.js?v=e487102dc6";

const RANGES = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"];
const TZ = {};

function madridShift(ms) {
  const k = Math.floor(ms / 36e5);
  if (TZ[k] != null) return TZ[k];
  const p = {};
  new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(new Date(ms)).forEach((x) => { p[x.type] = x.value; });
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second);
  TZ[k] = asUtc - Math.floor(ms / 1000) * 1000;
  return TZ[k];
}

function barTime(bar, intra) {
  if (!intra) return bar.time;
  const ms = bar.time * 1000;
  return Math.floor((ms + madridShift(ms)) / 1000);
}

function loadLwc() {
  if (window.LightweightCharts) return Promise.resolve(window.LightweightCharts);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "/vendor/lightweight-charts.standalone.production.js";
    s.async = true;
    s.onload = () => window.LightweightCharts ? resolve(window.LightweightCharts) : reject(new Error("lwc"));
    s.onerror = () => reject(new Error("lwc"));
    document.head.appendChild(s);
  });
}

async function getOhlcv(symbol, range) {
  const res = await fetch("/api/ohlcv?symbol=" + encodeURIComponent(symbol) + "&range=" + encodeURIComponent(range), { headers: { Accept: "application/json" } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ok) throw new Error(body.error || "ohlcv");
  return body;
}

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export async function mountChart(root, opts) {
  const state = {
    symbol: opts.symbol || "AAPL",
    range: RANGES.includes(opts.range) ? opts.range : "1Y",
    mode: "line",
    athOn: opts.ath !== "0",
    poc: !!opts.overlays,
    sr: !!opts.overlays,
    trend: !!opts.overlays,
    ema50: !!opts.overlays,
    ema200: !!opts.overlays,
    bars: [],
    intra: false,
    ath: null,
    name: "",
    currency: "",
  };
  root.innerHTML = `
    <div class="chart-head">
      <div>
        <h2 id="chart-title">Gráfico</h2>
        <p class="muted" id="chart-sub"></p>
      </div>
      <form class="chart-sym" id="chart-sym">
        <input name="symbol" aria-label="Símbolo" value="${state.symbol}" maxlength="24" spellcheck="false"/>
        <button type="submit" class="btn">Cargar</button>
      </form>
    </div>
    <div class="toolbar">
      <div class="ranges" id="ranges" role="group" aria-label="Rango"></div>
      <div class="mode" role="group" aria-label="Tipo de serie">
        <button type="button" data-mode="line" class="seg on">Línea</button>
        <button type="button" data-mode="candle" class="seg">Velas</button>
      </div>
    </div>
    <div class="pills" id="pills" role="group" aria-label="Capas"></div>
    <p class="msg" id="chart-msg">Cargando gráfico…</p>
    <div class="chart-box" id="price-chart"></div>
    <h3 class="subhead">Caída desde máximos <span class="muted">(%)</span></h3>
    <div class="dd-box" id="dd-chart"></div>
    <p class="legend" id="legend"></p>
    <p class="fine">Caída = cierre frente al máximo alcanzado hasta esa fecha. Horas intradía en hora de Madrid. Precios: Yahoo Finance. Lightweight Charts (TradingView). Información, no asesoramiento.</p>
  `;
  const ranges = root.querySelector("#ranges");
  ranges.innerHTML = RANGES.map((r) => `<button type="button" data-r="${r}" aria-pressed="${r === state.range}">${r === "MAX" ? "Max" : r}</button>`).join("");
  const pills = root.querySelector("#pills");
  const pillDefs = [["poc", "POC"], ["sr", "S/R"], ["trend", "Tendencia"], ["ema50", "EMA 50"], ["ema200", "EMA 200"], ["athOn", "ATH"]];
  pills.innerHTML = pillDefs.map(([k, lab]) => `<button type="button" data-k="${k}" aria-pressed="${state[k] ? "true" : "false"}">${lab}</button>`).join("");

  let destroyed = false;
  let chart = null;
  let dd = null;
  let priceSeries = null;
  let volSeries = null;
  let ema50Series = null;
  let ema200Series = null;
  let trendSeries = null;
  let ddSeries = null;
  let priceLines = [];
  let lwc = null;
  let timer = 0;

  function msg(t) {
    const el = root.querySelector("#chart-msg");
    if (el) { el.textContent = t || ""; el.hidden = !t; }
  }

  function paintPressed() {
    ranges.querySelectorAll("[data-r]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.r === state.range)));
    root.querySelectorAll(".seg").forEach((b) => b.classList.toggle("on", b.dataset.mode === state.mode));
    pills.querySelectorAll("[data-k]").forEach((b) => b.setAttribute("aria-pressed", state[b.dataset.k] ? "true" : "false"));
  }

  function clearLines() {
    if (!priceSeries) return;
    for (const line of priceLines) {
      try { priceSeries.removePriceLine(line); } catch { /* already gone */ }
    }
    priceLines = [];
  }

  function pointsForScale() {
    return state.mode === "candle"
      ? state.bars.map((b) => ({ high: b.high, low: b.low }))
      : state.bars.map((b) => ({ value: b.close }));
  }

  function autoscale() {
    const pts = pointsForScale();
    let min = Infinity;
    let max = -Infinity;
    for (const p of pts) {
      const lo = p.low != null ? p.low : p.value;
      const hi = p.high != null ? p.high : p.value;
      if (lo < min) min = lo;
      if (hi > max) max = hi;
    }
    const extra = [];
    if (state.poc) {
      const hit = poc(visibleBars());
      if (hit) extra.push(hit.price);
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    for (const v of extra) {
      if (!(v > 0)) continue;
      if (v < min * 0.85 || v > max * 1.15) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (state.athOn && state.ath > 0 && state.ath <= max * 1.12 && state.ath >= min * 0.88) {
      if (state.ath > max) max = state.ath;
      if (state.ath < min) min = state.ath;
    }
    const pad = (max - min) * 0.08 || Math.abs(max) * 0.02 || 1;
    return { priceRange: { minValue: min - pad, maxValue: max + pad } };
  }

  function visibleBars() {
    if (!chart || !state.bars.length) return state.bars;
    const lr = chart.timeScale().getVisibleLogicalRange();
    if (!lr) return state.bars;
    const a = Math.max(0, Math.floor(lr.from));
    const b = Math.min(state.bars.length - 1, Math.ceil(lr.to));
    return state.bars.slice(a, b + 1);
  }

  function applyOverlays() {
    if (!priceSeries || !lwc) return;
    clearLines();
    const vis = state.poc ? visibleBars() : state.bars;
    const legend = [];
    if (state.athOn && state.ath > 0) {
      priceLines.push(priceSeries.createPriceLine({
        price: state.ath, color: cssVar("--text", "#e8edf5"), lineWidth: 1, lineStyle: 2,
        axisLabelVisible: true, title: "Máx.",
      }));
      legend.push("ATH " + fmt(state.ath));
    }
    if (state.poc) {
      const hit = poc(vis.length ? vis : state.bars);
      if (hit) {
        priceLines.push(priceSeries.createPriceLine({
          price: hit.price, color: "#d7a441", lineWidth: 2, lineStyle: 0, axisLabelVisible: true, title: "POC",
        }));
        legend.push("POC " + fmt(hit.price));
      }
    }
    if (state.sr) {
      const levels = relevantLevels(swingPivots(state.bars, 3), 3);
      for (const lv of levels) {
        priceLines.push(priceSeries.createPriceLine({
          price: lv.price,
          color: lv.kind === "resistance" ? "#f07178" : "#3ecf8e",
          lineWidth: 1, lineStyle: 1, axisLabelVisible: true,
          title: lv.kind === "resistance" ? "R" : "S",
        }));
      }
      if (levels.length) legend.push("S/R " + levels.length);
    }
    const closes = state.bars.map((b) => b.close);
    const times = state.bars.map((b) => barTime(b, state.intra));
    if (ema50Series) {
      const series = ema(closes, 50).map((v, i) => v == null ? null : { time: times[i], value: v }).filter(Boolean);
      ema50Series.setData(state.ema50 ? series : []);
      if (state.ema50 && series.length) legend.push("EMA50 " + fmt(series[series.length - 1].value));
    }
    if (ema200Series) {
      const series = ema(closes, 200).map((v, i) => v == null ? null : { time: times[i], value: v }).filter(Boolean);
      ema200Series.setData(state.ema200 ? series : []);
      if (state.ema200 && series.length) legend.push("EMA200 " + fmt(series[series.length - 1].value));
      else if (state.ema200) legend.push("EMA200: datos insuficientes");
    }
    if (trendSeries) {
      const proj = state.trend ? trendProjection(swingPivots(state.bars, 3), state.bars.length - 1) : null;
      if (proj && state.bars[proj.from.index] && state.bars[state.bars.length - 1]) {
        const t0 = barTime(state.bars[proj.from.index], state.intra);
        const t1 = barTime(state.bars[state.bars.length - 1], state.intra);
        if (t0 !== t1) trendSeries.setData([{ time: t0, value: proj.from.price }, { time: t1, value: proj.to.price }]);
        else trendSeries.setData([]);
        legend.push(proj.kind === "high" ? "Tendencia (máximos)" : "Tendencia (mínimos)");
      } else trendSeries.setData([]);
    }
    const leg = root.querySelector("#legend");
    if (leg) leg.textContent = legend.join(" · ");
    if (priceSeries) priceSeries.applyOptions({ autoscaleInfoProvider: () => autoscale() });
  }

  function fmt(n) {
    return Number(n).toLocaleString("es-ES", { maximumFractionDigits: n >= 1000 ? 0 : 2 });
  }

  function draw() {
    if (!chart || !state.bars.length) return;
    const L = lwc;
    const accent = cssVar("--accent", "#d7a441");
    if (priceSeries) { chart.removeSeries(priceSeries); priceSeries = null; priceLines = []; }
    if (volSeries) { chart.removeSeries(volSeries); volSeries = null; }
    const candles = state.mode === "candle";
    chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.08, bottom: candles ? 0.22 : 0.08 } });
    const common = { priceLineVisible: false, lastValueVisible: true, autoscaleInfoProvider: () => autoscale() };
    if (candles) {
      priceSeries = chart.addSeries(L.CandlestickSeries, { ...common, upColor: "#3ecf8e", downColor: "#f07178", borderVisible: false, wickUpColor: "#3ecf8e", wickDownColor: "#f07178" });
      volSeries = chart.addSeries(L.HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol", priceLineVisible: false, lastValueVisible: false });
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    } else {
      priceSeries = chart.addSeries(L.AreaSeries, { ...common, lineWidth: 2, lineColor: accent, topColor: accent + "55", bottomColor: accent + "08" });
    }
    const times = state.bars.map((b) => barTime(b, state.intra));
    const uniq = (rows) => {
      const out = [];
      for (const p of rows) {
        if (out.length && out[out.length - 1].time === p.time) out[out.length - 1] = p;
        else out.push(p);
      }
      return out;
    };
    if (candles) {
      priceSeries.setData(uniq(state.bars.map((b, i) => ({ time: times[i], open: b.open, high: b.high, low: b.low, close: b.close }))));
      volSeries.setData(uniq(state.bars.map((b, i) => ({ time: times[i], value: b.volume || 0, color: b.close >= b.open ? "rgba(62,207,142,0.45)" : "rgba(240,113,120,0.45)" }))));
    } else {
      priceSeries.setData(uniq(state.bars.map((b, i) => ({ time: times[i], value: b.close }))));
    }
    if (!ema50Series) ema50Series = chart.addSeries(L.LineSeries, { color: "#7eb6ff", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    if (!ema200Series) ema200Series = chart.addSeries(L.LineSeries, { color: "#d7a441", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    if (!trendSeries) trendSeries = chart.addSeries(L.LineSeries, { color: "#c4b5fd", lineWidth: 2, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
    let m = state.ath && state.range !== "MAX" ? state.ath : 0;
    const dd = [];
    for (let i = 0; i < state.bars.length; i++) {
      if (state.bars[i].high > m) m = state.bars[i].high;
      dd.push({ time: times[i], value: m > 0 ? Math.min(0, (state.bars[i].close / m - 1) * 100) : 0 });
    }
    if (ddSeries) ddSeries.setData(uniq(dd));
    chart.applyOptions({ timeScale: { timeVisible: state.intra, secondsVisible: false } });
    if (ddChart()) ddChart().applyOptions({ timeScale: { timeVisible: state.intra, secondsVisible: false } });
    chart.timeScale().fitContent();
    if (ddChart()) ddChart().timeScale().fitContent();
    applyOverlays();
    msg("");
  }

  let ddRef = null;
  function ddChart() { return ddRef; }

  function theme() {
    if (!chart) return;
    const opt = {
      layout: { background: { type: "solid", color: "transparent" }, textColor: cssVar("--muted", "#93a0b4"), fontFamily: "ui-sans-serif, system-ui, sans-serif", attributionLogo: true },
      grid: { vertLines: { color: cssVar("--line", "#2a3140") }, horzLines: { color: cssVar("--line", "#2a3140") } },
      rightPriceScale: { borderColor: cssVar("--line", "#2a3140") },
      timeScale: { borderColor: cssVar("--line", "#2a3140") },
    };
    chart.applyOptions(opt);
    if (ddRef) ddRef.applyOptions({ ...opt, layout: { ...opt.layout, attributionLogo: false } });
  }

  async function reload() {
    paintPressed();
    msg("Cargando gráfico…");
    try {
      const body = await getOhlcv(state.symbol, state.range);
      if (destroyed) return;
      state.bars = body.bars || [];
      state.intra = state.range === "1D" || state.range === "5D";
      state.name = body.name || state.symbol;
      state.currency = body.currency || "";
      state.ath = body.ath || null;
      if (state.range !== "MAX") {
        try {
          const mx = await getOhlcv(state.symbol, "MAX");
          if (!destroyed && mx.ath) state.ath = Math.max(state.ath || 0, mx.ath);
        } catch { /* the selected range still draws */ }
      }
      root.querySelector("#chart-title").textContent = state.name;
      root.querySelector("#chart-sub").textContent = state.symbol + (state.currency ? " · " + state.currency : "") + (body.blocked ? " · derivado no operable en el simulador" : "");
      if (!state.bars.length) { msg("Gráfico no disponible ahora mismo."); return; }
      draw();
      if (opts.onSymbol) opts.onSymbol(state.symbol, state.range);
    } catch {
      if (!destroyed) msg("Gráfico no disponible ahora mismo.");
    }
  }

  ranges.addEventListener("click", (e) => {
    const b = e.target.closest("[data-r]");
    if (!b || b.dataset.r === state.range) return;
    state.range = b.dataset.r;
    reload();
  });
  root.querySelector(".mode").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mode]");
    if (!b || b.dataset.mode === state.mode) return;
    state.mode = b.dataset.mode;
    paintPressed();
    draw();
  });
  pills.addEventListener("click", (e) => {
    const b = e.target.closest("[data-k]");
    if (!b) return;
    state[b.dataset.k] = !state[b.dataset.k];
    paintPressed();
    if (chart) {
      applyOverlays();
      chart.timeScale().fitContent();
    }
  });
  root.querySelector("#chart-sym").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = new FormData(e.target).get("symbol");
    const sym = String(v || "").trim().toUpperCase();
    if (!/^[A-Z0-9^][A-Z0-9.\-=]{0,23}$/.test(sym)) { msg("Símbolo no válido."); return; }
    state.symbol = sym;
    reload();
  });

  try {
    lwc = await loadLwc();
  } catch {
    msg("No se ha podido cargar la librería de gráficos.");
    return { destroy() {} };
  }
  if (destroyed) return { destroy() {} };
  const base = { autoSize: true, handleScroll: true, handleScale: true, crosshair: { mode: 1 }, localization: { locale: "es-ES" } };
  chart = lwc.createChart(root.querySelector("#price-chart"), base);
  ddRef = lwc.createChart(root.querySelector("#dd-chart"), base);
  ddSeries = ddRef.addSeries(lwc.AreaSeries, { lineWidth: 1, priceLineVisible: false, lastValueVisible: true, invertFilledArea: true, lineColor: "#f07178", topColor: "rgba(240,113,120,0)", bottomColor: "rgba(240,113,120,0.35)", autoscaleInfoProvider: (orig) => { const r = orig(); if (r) r.priceRange.maxValue = 0; return r; } });
  let lock = 0;
  const sync = (a, b) => a.timeScale().subscribeVisibleLogicalRangeChange((x) => { if (lock || !x) return; lock = 1; b.timeScale().setVisibleLogicalRange(x); lock = 0; });
  sync(chart, ddRef);
  sync(ddRef, chart);
  chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
    if (!state.poc) return;
    clearTimeout(timer);
    timer = setTimeout(() => { if (!destroyed) applyOverlays(); }, 60);
  });
  theme();
  await reload();
  return {
    destroy() {
      destroyed = true;
      clearTimeout(timer);
      if (chart) chart.remove();
      if (ddRef) ddRef.remove();
      chart = null;
      ddRef = null;
    },
  };
}
