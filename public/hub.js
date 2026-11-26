import { actionReasons, fundamentalRatio, FUNDAMENTAL_FORMULA, closeness } from "/shared/indicators.js";
import { classifyAsset, simulatorAllowed, CLASS_LABEL, SPOT_PROXY } from "/shared/assets.js";
import { AFFILIATE_DISCLOSURE, RISK_WARNING, etoroHref } from "/shared/etoro.js";
import { madridToday, markReviewed } from "/shared/streak.js";
import { portfolioWeights, applyBuy, applySell, SIM_START_EUR } from "/shared/portfolio.js";
import { load, save, exportJson, sanitize } from "/store.js";
import { mountChart } from "/chart.js";

const RANK = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "JPM", "SAN.MC", "ITX.MC", "SPY", "VWCE.DE", "^GSPC", "^IBEX", "GLD", "SLV"];
const SUGGEST = ["AAPL", "MSFT", "SAN.MC", "SPY", "GLD", "^IBEX"];
const state = load();
const quotes = new Map();
const ratios = new Map();
let filter = "all";
let chartApi = null;
let sortKey = "rs1m";
let sortDir = -1;

const main = document.getElementById("main");
document.getElementById("aff-banner").textContent = AFFILIATE_DISCLOSURE;
document.getElementById("risk-foot").textContent = RISK_WARNING;

const TAGS = [["all", "Todos"], ["stock", "Acción"], ["etf", "ETF"], ["fund", "Fondo / Índice"], ["commodity", "Materias Primas"]];
const tags = document.getElementById("tags");
tags.innerHTML = TAGS.map(([id, lab]) => `<button type="button" data-tag="${id}" aria-pressed="${id === filter}">${lab}</button>`).join("");
tags.addEventListener("click", (e) => {
  const b = e.target.closest("[data-tag]");
  if (!b) return;
  filter = b.dataset.tag;
  tags.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.tag === filter)));
  render();
});

function persist() { save(state); }
function go(href) { history.pushState(null, "", href); render(); }
function nf(n, d = 2) {
  if (n == null || !Number.isFinite(+n)) return "n/d";
  return Number(n).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function pct(n) {
  if (n == null || !Number.isFinite(+n)) return "n/d";
  const v = Number(n);
  return (v > 0 ? "+" : "") + nf(v, 2) + " %";
}
function cls(n) { return n > 0 ? "up" : n < 0 ? "down" : ""; }
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

function isHub(path) {
  return path === "/" || /^\/(charts|cartera|ranking|legal|activo)\/?$/.test(path);
}
document.body.addEventListener("click", (e) => {
  const a = e.target.closest("a[href]");
  if (!a || a.target === "_blank") return;
  const url = new URL(a.href, location.origin);
  if (url.origin !== location.origin || !isHub(url.pathname)) return;
  e.preventDefault();
  go(url.pathname + url.search);
});
window.addEventListener("popstate", () => render());

async function api(path) {
  const res = await fetch(path, { headers: { Accept: "application/json" } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) throw Object.assign(new Error(body.error || "error"), { body });
  return body;
}
async function pulse(symbols) {
  const uniq = [...new Set(symbols.map((s) => String(s).toUpperCase()))].slice(0, 30);
  if (!uniq.length) return [];
  const data = await api("/api/pulse?symbols=" + encodeURIComponent(uniq.join(",")));
  for (const row of data.rows || []) if (row && row.symbol) quotes.set(row.symbol, row);
  return uniq.map((s) => quotes.get(s)).filter(Boolean);
}
function priceOf(symbol) {
  const row = quotes.get(symbol);
  return row && row.price > 0 ? row.price : null;
}
function targetsFor(symbol) {
  const out = [];
  const zone = state.zones.find((z) => z.symbol === symbol);
  if (zone && zone.buy) out.push(zone.buy);
  if (zone && zone.trim) out.push(zone.trim);
  for (const a of state.alerts) if (a.symbol === symbol) out.push(a.price);
  return out;
}
function firedAlerts() {
  const hits = [];
  for (const a of state.alerts) {
    const px = priceOf(a.symbol);
    if (!(px > 0)) continue;
    if ((a.op === ">=" && px >= a.price) || (a.op === "<=" && px <= a.price)) hits.push({ ...a, px });
  }
  return hits;
}
function etoroBlock(symbol) {
  return `<div class="etoro">
    <a class="btn ghost" href="${esc(etoroHref(symbol))}" target="_blank" rel="sponsored nofollow noopener">Ver activo en eToro</a>
    <p class="aff-next">${esc(AFFILIATE_DISCLOSURE)}</p>
    <div class="warn tight">${esc(RISK_WARNING)}</div>
  </div>`;
}
function zoneClass(price, zone) {
  if (!(price > 0) || !zone) return "";
  if (zone.buy > 0 && price <= zone.buy * 1.002) return "buy";
  if (zone.trim > 0 && price >= zone.trim * 0.998) return "trim";
  return "";
}

function renderNav() {
  const path = location.pathname.replace(/\/$/, "") || "/";
  document.querySelectorAll("#nav a").forEach((a) => {
    const href = a.getAttribute("href");
    const on = href === "/" ? path === "/" : path === href;
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}

async function render() {
  if (chartApi) { chartApi.destroy(); chartApi = null; }
  renderNav();
  const path = location.pathname.replace(/\/$/, "") || "/";
  const q = new URLSearchParams(location.search);
  if (path === "/charts") return renderChart(q);
  if (path === "/cartera") return renderCartera();
  if (path === "/ranking") return renderRanking();
  if (path === "/legal") return renderLegal();
  if (path === "/activo") return renderAsset(q.get("symbol") || "");
  return renderPulse();
}

function renderPulse() {
  const today = madridToday();
  main.innerHTML = `
    <h1>Pulse (2 min)</h1>
    <p class="lead">Mercado y cartera en una pasada. El radar solo enseña lo que hoy cumple una condición. El resto se queda en silencio.</p>
    <section class="card" id="radar">
      <h2>Radar de Acción</h2>
      <div class="row">
        <input id="add-sym" placeholder="Añadir ticker" maxlength="24" aria-label="Añadir a la lista"/>
        <button class="btn solid" id="add-btn" type="button">Añadir</button>
        <button class="btn" id="export" type="button">Exportar JSON</button>
        <label class="btn">Importar<input id="import" type="file" accept="application/json" hidden/></label>
      </div>
      <div id="radar-body" class="grid"></div>
    </section>
    <section class="card">
      <h2>Zonas de compra / recorte</h2>
      <p class="dim">Verde si el precio entra en la zona de compra (precio ≤ compra). Ámbar si llega al recorte (precio ≥ recorte).</p>
      <div class="scroll" id="zones"></div>
      <button class="btn" id="add-zone" type="button">Añadir fila</button>
    </section>
    <section class="card">
      <h2>Bitácora de 30 segundos</h2>
      <div class="row">
        <button class="btn solid" id="reviewed" type="button">Mercado revisado hoy</button>
        <span id="streak" class="muted"></span>
      </div>
      <label class="dim" for="journal">Decisiones e ideas de hoy</label>
      <textarea id="journal" maxlength="2000"></textarea>
    </section>`;
  document.getElementById("journal").value = state.journal[today] || "";
  document.getElementById("journal").addEventListener("change", (e) => { state.journal[today] = e.target.value; persist(); });
  document.getElementById("streak").textContent = state.streak.count ? "Racha: " + state.streak.count + (state.streak.count === 1 ? " día" : " días") : "Sin racha todavía";
  document.getElementById("reviewed").addEventListener("click", () => {
    state.streak = markReviewed(state.streak, today);
    persist();
    render();
  });
  document.getElementById("add-btn").addEventListener("click", () => addWatch(document.getElementById("add-sym").value));
  document.getElementById("export").addEventListener("click", download);
  document.getElementById("import").addEventListener("change", onImport);
  document.getElementById("add-zone").addEventListener("click", () => {
    state.zones.push({ symbol: "", buy: null, trim: null, notes: "" });
    persist();
    paintZones();
  });
  paintRadar();
  paintZones();
}

async function addWatch(raw) {
  const symbol = String(raw || "").trim().toUpperCase();
  if (!/^[A-Z0-9^][A-Z0-9.\-=]{0,23}$/.test(symbol)) return;
  if (state.watchlist.some((w) => w.symbol === symbol) || state.watchlist.length >= 30) return;
  state.watchlist.push({ symbol, name: symbol, type: "other" });
  persist();
  render();
}

async function paintRadar() {
  const body = document.getElementById("radar-body");
  if (!body) return;
  if (!state.watchlist.length) {
    body.innerHTML = `<div class="empty" id="radar-empty"><p>La lista está vacía. Añade tickers para el radar de hoy.</p><div class="row">${SUGGEST.map((s) => `<button class="btn" data-sug="${s}" type="button">${s}</button>`).join("")}</div></div>`;
    body.querySelectorAll("[data-sug]").forEach((b) => b.addEventListener("click", () => addWatch(b.dataset.sug)));
    return;
  }
  body.innerHTML = `<p class="dim">Leyendo la lista…</p>`;
  let rows = [];
  try { rows = await pulse(state.watchlist.map((w) => w.symbol)); } catch { body.innerHTML = `<p class="empty">No se ha podido leer el mercado. Inténtalo de nuevo en unos minutos.</p>`; return; }
  if (!document.getElementById("radar-body")) return;
  const signals = [];
  for (const row of rows) {
    if (!row || row.error || !(row.price > 0)) continue;
    if (filter !== "all" && row.class && row.class.type !== filter) continue;
    const reasons = actionReasons(row, targetsFor(row.symbol));
    if (reasons.length) signals.push({ row, reasons });
  }
  const host = document.getElementById("radar-body");
  if (!signals.length) {
    host.innerHTML = `<p class="empty" id="radar-empty">Sin señales hoy: mantener plan</p>`;
  } else {
    host.innerHTML = `<div class="grid" id="radar-signals">${signals.map(({ row, reasons }) => `<button class="sig" data-open="${esc(row.symbol)}" type="button">
      <strong>${esc(row.symbol)} <span class="tag">${esc(row.class && row.class.label || "")}</span></strong>
      <span class="${cls(row.changePct)}">${nf(row.price)} ${esc(row.currency || "")} · ${pct(row.changePct)}</span>
      <span class="dim">${reasons.map((r) => esc(r.text)).join(" · ")}</span>
    </button>`).join("")}</div>`;
    host.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => go("/charts?symbol=" + encodeURIComponent(b.dataset.open) + "&overlays=1")));
  }
  paintZones();
  const alerts = firedAlerts();
  if (alerts.length && host) {
    host.insertAdjacentHTML("afterbegin", `<p class="live">${alerts.map((a) => esc(a.symbol) + " " + a.op + " " + nf(a.price) + " (ahora " + nf(a.px) + ")").join(" · ")}</p>`);
  }
}

function paintZones() {
  const host = document.getElementById("zones");
  if (!host) return;
  const rows = state.zones;
  host.innerHTML = `<table><thead><tr><th>Ticker</th><th>Precio compra</th><th>Precio recorte</th><th>Notas de tesis</th><th></th></tr></thead><tbody>
    ${rows.map((z, i) => {
      const px = priceOf(z.symbol);
      return `<tr class="${zoneClass(px, z)}" data-i="${i}">
        <td><input data-f="symbol" value="${esc(z.symbol)}" aria-label="Ticker"/></td>
        <td><input data-f="buy" type="number" step="any" value="${z.buy ?? ""}" aria-label="Precio compra"/></td>
        <td><input data-f="trim" type="number" step="any" value="${z.trim ?? ""}" aria-label="Precio recorte"/></td>
        <td><input data-f="notes" value="${esc(z.notes)}" aria-label="Notas"/></td>
        <td><button type="button" data-del="${i}" class="btn">Quitar</button>${px ? `<div class="dim">${nf(px)}</div>` : ""}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="5" class="muted">Sin zonas. Añade una fila.</td></tr>`}
  </tbody></table>`;
  host.querySelectorAll("input").forEach((input) => input.addEventListener("change", () => {
    const tr = input.closest("tr");
    const i = +tr.dataset.i;
    const f = input.dataset.f;
    if (f === "symbol") state.zones[i].symbol = input.value.trim().toUpperCase();
    else if (f === "notes") state.zones[i].notes = input.value;
    else state.zones[i][f] = input.value === "" ? null : Number(input.value);
    persist();
    paintRadar();
  }));
  host.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
    state.zones.splice(+b.dataset.del, 1);
    persist();
    paintZones();
  }));
  host.querySelectorAll("tr[data-i]").forEach((tr) => tr.addEventListener("click", (e) => {
    if (e.target.closest("input, button")) return;
    const sym = state.zones[+tr.dataset.i] && state.zones[+tr.dataset.i].symbol;
    if (sym) go("/charts?symbol=" + encodeURIComponent(sym) + "&overlays=1");
  }));
}

function download() {
  const blob = new Blob([exportJson(state)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "invest-hub.json";
  a.click();
  URL.revokeObjectURL(a.href);
}
async function onImport(e) {
  const file = e.target.files && e.target.files[0];
  if (!file || file.size > 500000) return;
  try {
    const next = sanitize(JSON.parse(await file.text()));
    if (!next) return;
    Object.assign(state, next);
    persist();
    render();
  } catch { /* ignore broken files */ }
}

async function renderChart(q) {
  const symbol = (q.get("symbol") || "AAPL").toUpperCase();
  const range = (q.get("range") || "1Y").toUpperCase();
  main.innerHTML = `<h1>Terminal Charts</h1><p class="lead">El mismo gráfico de área, rangos y línea de máximos, con velas, volumen y capas que se calculan en el navegador.</p><div id="terminal"></div>`;
  chartApi = await mountChart(document.getElementById("terminal"), {
    symbol,
    range,
    overlays: q.get("overlays") === "1",
    ath: q.get("ath") || "1",
    onSymbol: (sym, rng) => {
      const u = new URL(location.href);
      u.pathname = "/charts";
      u.searchParams.set("symbol", sym);
      u.searchParams.set("range", rng);
      history.replaceState(null, "", u.pathname + u.search);
    },
  });
}

function munger(filings) {
  if (!filings) return `<p class="muted">Sin cifras SEC para este símbolo.</p>`;
  const items = [];
  const net = filings.netMargin;
  const fcf = filings.freeCashFlowMargin;
  const cash = filings.cash && filings.cash.val;
  const debt = filings.longTermDebt && filings.longTermDebt.val;
  items.push(["Margen neto ≥ 15 %", typeof net === "number" ? (net >= 0.15 ? "Cumple" : "No cumple") + " · " + nf(net * 100, 1) + " %" : "Sin dato"]);
  items.push(["Margen FCF ≥ 10 %", typeof fcf === "number" ? (fcf >= 0.10 ? "Cumple" : "No cumple") + " · " + nf(fcf * 100, 1) + " %" : "Sin dato"]);
  items.push(["Efectivo ≥ deuda LP", cash != null && debt != null ? (cash >= debt ? "Cumple" : "No cumple") : "Sin dato"]);
  return `<ul>${items.map(([a, b]) => `<li><strong>${esc(a)}</strong> — ${esc(b)}</li>`).join("")}</ul><p class="dim">Checklist transparente. No es una puntuación ni una señal de compra o venta.</p>`;
}

async function renderCartera() {
  main.innerHTML = `
    <h1>Cartera y tesis</h1>
    <p class="lead">Diario, alertas y un simulador de 100.000 € en dinero virtual. Solo contado: acciones, ETF, fondos o índices y materias primas al contado.</p>
    <div id="alert-live"></div>
    <section class="card">
      <h2>Notas y niveles</h2>
      <label class="dim" for="notes">Notas de mercado</label>
      <textarea id="notes">${esc(state.checklist.notes)}</textarea>
      <label class="dim" for="levels">Niveles objetivo</label>
      <textarea id="levels">${esc(state.checklist.levels)}</textarea>
    </section>
    <section class="card">
      <h2>Alertas de precio</h2>
      <p class="dim">Se evalúan en el navegador mientras la página está abierta.</p>
      <div id="alerts"></div>
      <form class="row" id="alert-form">
        <input name="symbol" placeholder="Ticker" required maxlength="24"/>
        <select name="op" aria-label="Condición"><option value=">=">≥</option><option value="<=">≤</option></select>
        <input name="price" type="number" step="any" placeholder="Precio" required/>
        <button class="btn solid" type="submit">Añadir alerta</button>
      </form>
    </section>
    <section class="card" id="sim">
      <h2>Simulador 100.000 €</h2>
      <p class="dim">Efectivo inicial ${nf(SIM_START_EUR, 0)} €. Las compras usan el último precio del hub. No hay CFDs, futuros ni productos apalancados.</p>
      <div id="sim-body"><p class="dim">Cargando precios…</p></div>
      <form class="row" id="buy-form">
        <input name="symbol" id="buy-sym" placeholder="Ticker" required maxlength="24"/>
        <input name="euros" type="number" min="1" step="0.01" placeholder="Importe €" required/>
        <button class="btn solid" type="submit">Comprar</button>
      </form>
      <p class="dim" id="buy-msg"></p>
      <button class="btn" id="reset-sim" type="button">Reiniciar a 100.000 €</button>
    </section>
    <section class="card">
      <h2>Investigación</h2>
      <p class="dim">Ticker, nombre o ISIN, cotización y cifras 10-K cuando existen. El comparador clásico sigue en <a href="/comparar/">/comparar/</a> y la checklist larga en <a href="/munger/">/munger/</a>.</p>
      <form class="row" id="lookup"><input name="q" placeholder="AAPL, Inditex, IE00B4L5Y983" required/><button class="btn" type="submit">Consultar</button></form>
      <div id="lookup-out"></div>
      <h3>Comparar dos activos</h3>
      <form class="row" id="cmp"><input name="a" placeholder="A" required/><input name="b" placeholder="B" required/><button class="btn" type="submit">Lado a lado</button></form>
      <div id="cmp-out" class="split"></div>
    </section>
    <section class="card">
      <h2>Bitácora</h2>
      <p class="dim">El botón «Mercado revisado hoy» y el texto del día viven en Pulse. Aquí se exporta todo junto.</p>
      <div class="row"><button class="btn" id="export" type="button">Exportar JSON</button><label class="btn">Importar<input id="import" type="file" accept="application/json" hidden/></label></div>
    </section>`;
  document.getElementById("notes").addEventListener("change", (e) => { state.checklist.notes = e.target.value; persist(); });
  document.getElementById("levels").addEventListener("change", (e) => { state.checklist.levels = e.target.value; persist(); });
  document.getElementById("export").addEventListener("click", download);
  document.getElementById("import").addEventListener("change", onImport);
  document.getElementById("alert-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const symbol = String(fd.get("symbol") || "").toUpperCase().trim();
    if (!/^[A-Z0-9^][A-Z0-9.\-=]{0,23}$/.test(symbol)) return;
    state.alerts.push({ id: Math.random().toString(36).slice(2, 10), symbol, op: fd.get("op") === "<=" ? "<=" : ">=", price: Number(fd.get("price")), note: "" });
    persist();
    render();
  });
  document.getElementById("reset-sim").addEventListener("click", () => {
    state.simulator = { cash: SIM_START_EUR, positions: [] };
    persist();
    render();
  });
  document.getElementById("lookup").addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = new FormData(e.target).get("q");
    const out = document.getElementById("lookup-out");
    out.textContent = "Consultando…";
    try {
      const data = await api("/api/quote?q=" + encodeURIComponent(q));
      const quote = data.quote || {};
      out.innerHTML = `<p><strong>${esc(quote.name || "")}</strong> ${esc(quote.symbol || "")} · ${nf(quote.regularMarketPrice)} ${esc(quote.currency || "")} <span class="${cls(quote.regularMarketChangePercent)}">${pct(quote.regularMarketChangePercent)}</span></p>${data.filingsNote ? `<p class="dim">${esc(data.filingsNote)}</p>` : ""}${munger(data.filings)}<p><a href="/charts?symbol=${encodeURIComponent(quote.symbol || "")}">Abrir gráfico</a> · <a href="/activo?symbol=${encodeURIComponent(quote.symbol || "")}">Ficha</a></p>`;
    } catch { out.textContent = "No hay resultado para esa consulta."; }
  });
  document.getElementById("cmp").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const out = document.getElementById("cmp-out");
    out.innerHTML = "";
    for (const key of ["a", "b"]) {
      const card = document.createElement("div");
      card.className = "card";
      card.textContent = "Consultando…";
      out.appendChild(card);
      try {
        const data = await api("/api/quote?q=" + encodeURIComponent(fd.get(key)));
        const quote = data.quote || {};
        const ratio = fundamentalRatio(data.filings);
        card.innerHTML = `<h3>${esc(quote.symbol || "")}</h3><p>${esc(quote.name || "")}</p><p>${nf(quote.regularMarketPrice)} ${esc(quote.currency || "")}</p><p class="dim">${ratio ? (ratio.basis === "fcf" ? "Margen FCF " : "Margen neto ") + nf(ratio.value * 100, 1) + " %" : "Sin ratio 10-K"}</p>`;
      } catch { card.textContent = "Sin dato"; }
    }
  });
  paintAlerts();
  paintSim();
}

function paintAlerts() {
  const host = document.getElementById("alerts");
  if (!host) return;
  host.innerHTML = state.alerts.map((a, i) => `<div class="row"><span>${esc(a.symbol)} ${esc(a.op)} ${nf(a.price)}</span><button class="btn" data-i="${i}" type="button">Quitar</button></div>`).join("") || `<p class="muted">Sin alertas.</p>`;
  host.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { state.alerts.splice(+b.dataset.i, 1); persist(); paintAlerts(); }));
}

async function paintSim() {
  const host = document.getElementById("sim-body");
  const msg = document.getElementById("buy-msg");
  if (!host) return;
  const symbols = state.simulator.positions.map((p) => p.symbol);
  if (symbols.length) { try { await pulse(symbols); } catch { /* keep average cost */ } }
  if (!document.getElementById("sim-body")) return;
  const prices = {};
  for (const p of state.simulator.positions) prices[p.symbol] = priceOf(p.symbol) || p.avg;
  const w = portfolioWeights(state.simulator.cash, state.simulator.positions, prices);
  const bar = w.classes.map((c) => `<i class="w-${c.type}" style="width:${c.pct}%"></i>`).join("") + `<i class="w-cash" style="width:${w.cashPct}%"></i>`;
  const legend = w.classes.map((c) => `${CLASS_LABEL[c.type] || c.type} ${nf(c.pct, 1)} %`).join(" · ");
  host.innerHTML = `
    <div class="kpis"><div><span class="dim">Valor</span><br/><b>${nf(w.equity, 0)} €</b></div><div><span class="dim">Efectivo</span><br/><b>${nf(state.simulator.cash, 0)} €</b></div></div>
    <div class="weights" aria-hidden="true">${bar}</div>
    <p class="dim">Peso por clase: ${legend || "sin posiciones"} · efectivo ${nf(w.cashPct, 1)} %</p>
    <div class="scroll"><table><thead><tr><th>Ticker</th><th>Clase</th><th>Títulos</th><th>Precio</th><th>Peso</th><th></th></tr></thead><tbody>
      ${state.simulator.positions.map((p) => {
        const px = prices[p.symbol];
        const mv = px * p.shares;
        const weight = w.equity > 0 ? (mv / w.equity) * 100 : 0;
        const show = filter === "all" || p.type === filter;
        return show ? `<tr><td><a href="/charts?symbol=${encodeURIComponent(p.symbol)}&overlays=1">${esc(p.symbol)}</a></td><td>${esc(CLASS_LABEL[p.type] || p.type)}</td><td>${nf(p.shares, 4)}</td><td>${nf(px)}</td><td>${nf(weight, 1)} %</td><td><button class="btn" data-sell="${esc(p.symbol)}" type="button">Vender</button></td></tr>` : "";
      }).join("") || `<tr><td colspan="6" class="muted">Sin posiciones${filter !== "all" ? " de este tipo" : ""}.</td></tr>`}
    </tbody></table></div>`;
  host.querySelectorAll("[data-sell]").forEach((b) => b.addEventListener("click", () => {
    const p = state.simulator.positions.find((x) => x.symbol === b.dataset.sell);
    const px = priceOf(p.symbol) || p.avg;
    const next = applySell(state.simulator, p.symbol, p.shares, px);
    if (!next.ok) return;
    state.simulator = next.simulator;
    persist();
    paintSim();
  }));
  const form = document.getElementById("buy-form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const symbol = String(fd.get("symbol") || "").trim().toUpperCase();
    msg.textContent = "Comprobando…";
    let row;
    try { [row] = await pulse([symbol]); } catch { msg.textContent = "No se ha podido leer el precio."; return; }
    if (!row || !(row.price > 0)) { msg.textContent = "Sin precio para ese ticker."; return; }
    const asset = row.class || classifyAsset(symbol, "", row.name);
    if (filter !== "all" && asset.type !== filter) { msg.textContent = "Ese ticker no entra en el filtro " + TAGS.find((t) => t[0] === filter)[1] + "."; return; }
    if (!simulatorAllowed(asset)) {
      const proxy = asset.proxy || SPOT_PROXY[symbol];
      msg.textContent = (asset.reason || "No operable.") + (proxy ? " Alternativa al contado: " + proxy + "." : "");
      return;
    }
    const next = applyBuy(state.simulator, { symbol, name: row.name, type: asset.type, price: row.price }, Number(fd.get("euros")));
    if (!next.ok) { msg.textContent = next.error === "efectivo" ? "Efectivo insuficiente." : "Importe no válido."; return; }
    state.simulator = next.simulator;
    persist();
    msg.textContent = "Compra registrada en el simulador.";
    paintSim();
  };
  const live = document.getElementById("alert-live");
  const hits = firedAlerts();
  if (live) live.innerHTML = hits.length ? `<div class="card live">${hits.map((a) => `<p>${esc(a.symbol)} ha cruzado ${esc(a.op)} ${nf(a.price)} (ahora ${nf(a.px)}).</p>`).join("")}</div>` : "";
}

async function renderRanking() {
  main.innerHTML = `
    <h1>Ranking</h1>
    <p class="lead">Métricas comprobables, ordenables. No es una lista de compra. ${esc(FUNDAMENTAL_FORMULA)}</p>
    <div class="scroll card" id="rank"><p class="dim">Calculando…</p></div>`;
  const symbols = [...new Set(RANK.concat(state.watchlist.map((w) => w.symbol)))].slice(0, 30);
  let rows = [];
  try { rows = await pulse(symbols); } catch {
    document.getElementById("rank").innerHTML = `<p class="empty">No se han podido leer las métricas.</p>`;
    return;
  }
  rows = rows.filter((r) => r && !r.error && r.price > 0 && r.class && r.class.type !== "blocked");
  if (filter !== "all") rows = rows.filter((r) => r.class.type === filter);
  paintRank(rows);
  for (const row of rows) {
    if (!/^[A-Z]{1,5}$/.test(row.symbol)) continue;
    loadRatio(row.symbol).then(() => { if (document.getElementById("rank")) paintRank(rows); });
  }
}
async function loadRatio(symbol) {
  if (ratios.has(symbol)) return ratios.get(symbol);
  try {
    const data = await api("/api/quote?q=" + encodeURIComponent(symbol));
    const ratio = fundamentalRatio(data.filings);
    ratios.set(symbol, ratio);
    return ratio;
  } catch {
    ratios.set(symbol, null);
    return null;
  }
}
function paintRank(rows) {
  const host = document.getElementById("rank");
  if (!host) return;
  const value = (row, key) => {
    if (key === "close") return closeness(row);
    if (key === "fundamental") { const r = ratios.get(row.symbol); return r ? r.value : null; }
    return row[key];
  };
  const sorted = rows.slice().sort((a, b) => {
    if (sortKey === "symbol") return a.symbol.localeCompare(b.symbol) * sortDir;
    const av = value(a, sortKey);
    const bv = value(b, sortKey);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return (av - bv) * sortDir;
  });
  const th = (key, label) => `<th><button type="button" data-sort="${key}">${label}${sortKey === key ? (sortDir < 0 ? " ↓" : " ↑") : ""}</button></th>`;
  host.innerHTML = `<table><thead><tr>
      ${th("symbol", "Ticker")}${th("rs1m", "Fuerza 1M")}${th("rsYtd", "Fuerza YTD")}${th("close", "Cerca de soporte / POC")}${th("drawdown", "Caída desde máximos")}${th("fundamental", "Ratio fundamental")}<th></th>
    </tr></thead><tbody>${sorted.map((row) => {
      const ratio = ratios.get(row.symbol);
      const near = closeness(row);
      return `<tr class="rowlink" data-sym="${esc(row.symbol)}">
        <td><strong>${esc(row.symbol)}</strong><div class="dim">${esc(row.name || "")} · <span class="tag">${esc(row.class.label)}</span></div></td>
        <td class="${cls(row.rs1m)}">${pct(row.rs1m)}</td>
        <td class="${cls(row.rsYtd)}">${pct(row.rsYtd)}</td>
        <td>${near == null ? "n/d" : nf(near, 2) + " %"}</td>
        <td class="${cls(row.drawdown)}">${pct(row.drawdown)}</td>
        <td>${ratio ? nf(ratio.value * 100, 1) + " % " + (ratio.basis === "fcf" ? "FCF" : "neto") : (/^[A-Z]{1,5}$/.test(row.symbol) ? "…" : "n/d")}</td>
        <td>${etoroBlock(row.symbol)}<div class="dim"><a href="/activo?symbol=${encodeURIComponent(row.symbol)}">Ficha</a></div></td>
      </tr>`;
    }).join("") || `<tr><td colspan="7">Sin filas para este filtro.</td></tr>`}</tbody></table>
    <p class="dim">Fuerza relativa = variación del cierre a 21 sesiones y desde el primer cierre del año. Cercanía = la menor distancia absoluta al POC de 90 días o al soporte (último pivote por debajo). Caída = cierre frente al máximo del histórico diario usado (5 años). ${esc(FUNDAMENTAL_FORMULA)}</p>`;
  host.querySelectorAll("[data-sort]").forEach((b) => b.addEventListener("click", () => {
    if (sortKey === b.dataset.sort) sortDir *= -1; else { sortKey = b.dataset.sort; sortDir = sortKey === "close" ? 1 : -1; }
    paintRank(rows);
  }));
  host.querySelectorAll("tr[data-sym]").forEach((tr) => tr.addEventListener("click", (e) => {
    if (e.target.closest("a, button, .etoro")) return;
    go("/charts?symbol=" + encodeURIComponent(tr.dataset.sym) + "&overlays=1");
  }));
}

async function renderAsset(symbol) {
  const sym = String(symbol || "").toUpperCase();
  main.innerHTML = `<h1>Ficha</h1><div id="asset"><p class="dim">Cargando…</p></div>`;
  if (!/^[A-Z0-9^][A-Z0-9.\-=]{0,23}$/.test(sym)) {
    document.getElementById("asset").textContent = "Símbolo no válido.";
    return;
  }
  let quote = null;
  let filings = null;
  let note = "";
  try {
    const data = await api("/api/quote?q=" + encodeURIComponent(sym));
    quote = data.quote;
    filings = data.filings;
    note = data.filingsNote || "";
  } catch { /* chart data may still exist */ }
  let row = quotes.get(sym);
  if (!row) { try { [row] = await pulse([sym]); } catch { row = null; } }
  const name = (quote && quote.name) || (row && row.name) || sym;
  const price = (quote && quote.regularMarketPrice) || (row && row.price);
  const change = (quote && quote.regularMarketChangePercent) || (row && row.changePct);
  const asset = (row && row.class) || classifyAsset(sym, quote && quote.type, name);
  const host = document.getElementById("asset");
  if (!host) return;
  host.innerHTML = `
    <p class="kpis"><b>${esc(name)}</b></p>
    <p>${esc(sym)} · <span class="tag">${esc(asset.label || "")}</span></p>
    <p class="kpis"><b>${nf(price)}</b> <span class="${cls(change)}">${pct(change)}</span></p>
    ${asset.type === "blocked" ? `<p class="dim">${esc(asset.reason || "")}${asset.proxy ? " Contado: " + esc(asset.proxy) : ""}</p>` : ""}
    <p><a href="/charts?symbol=${encodeURIComponent(sym)}&overlays=1">Abrir en Terminal Charts</a></p>
    ${etoroBlock(sym)}
    <section class="card"><h2>10-K</h2>${note ? `<p class="dim">${esc(note)}</p>` : ""}${munger(filings)}</section>`;
}

function renderLegal() {
  main.innerHTML = `
    <h1>Aviso legal y política de afiliación</h1>
    <div class="card">
      <p>INVEST Hub es una herramienta independiente de análisis y de seguimiento personal. No es una empresa de servicios de inversión, no está registrada en la CNMV y no ejecuta órdenes.</p>
      <p>El simulador de 100.000 € usa dinero virtual. Las compras y las ventas no son operaciones reales y no se transmiten a ningún bróker.</p>
      <p>No se promocionan CFDs, futuros ni productos apalancados. El buscador y el simulador rechazan esos instrumentos. Las materias primas que se pueden anotar son referencias al contado (ETC/ETF físicos, sin leva).</p>
      <p>El uso de esta herramienta está reservado a personas adultas, de 18 años o más.</p>
      <p>${esc(AFFILIATE_DISCLOSURE)}</p>
      <div class="warn">${esc(RISK_WARNING)}</div>
      <p class="dim">El titular debe revisar este texto frente a las condiciones vigentes de eToro Partners antes de publicar el enlace de afiliado. La constante <code>ETORO_AFFILIATE_URL</code> en <code>shared/etoro.js</code> es un marcador de posición.</p>
      <p>También siguen publicados el <a href="/aviso-legal/">aviso legal</a>, la <a href="/privacidad/">privacidad</a> y las <a href="/cookies/">cookies</a> de INVEST.</p>
    </div>`;
}

const form = document.getElementById("search-form");
const hits = document.getElementById("hits");
let searchTimer = 0;
form.addEventListener("submit", (e) => e.preventDefault());
document.getElementById("q").addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  const q = e.target.value.trim();
  if (q.length < 2) { hits.hidden = true; hits.innerHTML = ""; return; }
  searchTimer = setTimeout(() => runSearch(q), 250);
});
document.addEventListener("click", (e) => { if (!form.contains(e.target)) hits.hidden = true; });

async function runSearch(q) {
  let data;
  try { data = await api("/api/search?q=" + encodeURIComponent(q)); } catch { hits.hidden = true; return; }
  const rows = (data.results || []).filter((r) => {
    const asset = r.class || classifyAsset(r.symbol, r.type, r.name);
    if (filter === "all") return true;
    if (asset.type === filter) return true;
    if (asset.proxy && filter === "commodity") return true;
    return false;
  });
  if (!rows.length) { hits.hidden = false; hits.innerHTML = `<p class="dim" style="padding:0.6rem">Sin resultados para este filtro.</p>`; return; }
  hits.hidden = false;
  hits.innerHTML = rows.map((r) => {
    const asset = r.class || classifyAsset(r.symbol, r.type, r.name);
    const blocked = asset.type === "blocked";
    return `<button type="button" class="hit-btn" data-sym="${esc(r.symbol)}" data-proxy="${esc(asset.proxy || "")}" ${blocked && !asset.proxy ? "disabled" : ""}>
      <span><strong>${esc(r.symbol)}</strong> ${esc(r.name || "")}${blocked ? `<span class="dim"> · ${esc(asset.reason || "no disponible")}</span>` : ""}</span>
      <span class="tag">${esc(blocked && asset.proxy ? "usar " + asset.proxy : asset.label || r.type || "")}</span>
    </button>`;
  }).join("");
  hits.querySelectorAll(".hit-btn").forEach((b) => b.addEventListener("click", () => {
    const sym = b.dataset.proxy || b.dataset.sym;
    hits.hidden = true;
    document.getElementById("q").value = "";
    if (location.pathname.replace(/\/$/, "") === "/cartera") {
      const input = document.getElementById("buy-sym");
      if (input) { input.value = sym; return; }
    }
    go("/charts?symbol=" + encodeURIComponent(sym));
  }));
}

render();
