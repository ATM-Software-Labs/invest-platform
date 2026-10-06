(function () {
  var SEARCH_KEY = "invest.searches.v1";
  var LIST_KEY = "invest.lists.v1";
  var FAV_KEY = "invest.favorites.v1";
  var COUNT_KEY = "invest.analysis.v1";
  var form = document.getElementById("buscar");
  var input = document.getElementById("q");
  var out = document.getElementById("resultado");
  var estado = document.getElementById("estado");
  var grid = document.getElementById("grid");
  var emptyGrid = document.getElementById("empty-grid");
  var emptyGridText = document.getElementById("empty-grid-text");
  var listsPanel = document.getElementById("listas-panel");
  var listName = document.getElementById("lista-nombre");
  var filtroLabel = document.getElementById("filtro-label");
  var timer = null;
  var seq = 0;
  var current = null;
  var lastEstado = null;
  var activeFilter = "todos";
  var NET_MARGIN_OK = 0.15;
  var FCF_MARGIN_OK = 0.10;

  var S = {
    es: {
      loading: "Consultando\u2026", tooShort: "Escribe al menos 2 caracteres.",
      notFound: "No hay resultado para esa consulta. No se guarda en recientes.",
      failed: "No se ha podido consultar. Int\u00e9ntalo de nuevo.",
      price: "Precio", change: "Variaci\u00f3n diaria", source: "Fuente: Yahoo", sourceSec: "Fuente: Yahoo \u00b7 SEC",
      favAdd: "A\u00f1adir a favoritos", favRemove: "Quitar de favoritos",
      typeEquity: "Acci\u00f3n", typeEtf: "ETF", typeOther: "Otro", typeUnknown: "Tipo desconocido",
      mungerTitle: "Checklist Munger", howCalculated: "C\u00f3mo se calcula", annualTitle: "Cifras anuales (SEC)", expand: "Expandir", close: "Cerrar",
      matches: function (p, m) { return "Coincide con " + p + " de " + m + " criterios Munger medibles."; },
      mungerNote: "Checklist transparente. No es una puntuaci\u00f3n 1\u201310 ni una se\u00f1al de compra o venta.",
      pass: "Cumple", fail: "No cumple", unknown: "Sin datos",
      cNet: "Margen neto elevado", cFcf: "Margen de flujo de caja libre elevado", cCash: "Efectivo frente a deuda a largo plazo",
      threshold: "Umbral", value: "Valor",
      noNet: "No hay margen neto calculable.", noFcf: "No hay margen FCF calculable.", noCash: "Faltan cifras de efectivo o deuda LP.",
      cashDetail: function (c, d) { return "Efectivo " + c + " frente a deuda LP " + d + ". Criterio: efectivo \u2265 deuda LP."; },
      noMungerTitle: "Checklist Munger no disponible",
      noMungerText: "El checklist Munger necesita informes anuales de EE. UU. (SEC). Solo se muestra el precio.",
      usNote: "Las cifras de los informes anuales solo est\u00e1n disponibles para cotizaciones de Estados Unidos por ahora.",
      secDown: "No se han podido consultar las cifras de los informes anuales.",
      revenue: "Ingresos", netIncome: "Resultado neto", ocf: "Flujo de caja de explotaci\u00f3n", capex: "Pagos por inmovilizado",
      ltDebt: "Deuda a largo plazo", cash: "Efectivo", netMargin: "Margen neto", fcfMargin: "Margen de flujo de caja libre",
      fiscal: "ejercicio", periodEnd: "cierre", secSource: "fuente SEC",
      recent: "Reciente", recentMeta: "B\u00fasqueda reciente", favorite: "Favorito", favMeta: "En favoritos",
      analyses: function (n) { return n === 1 ? "1 an\u00e1lisis" : n + " an\u00e1lisis"; },
      emptyTodos: "Todav\u00eda no hay b\u00fasquedas con resultado. Busca un ticker para empezar.",
      emptyAcciones: "Ninguna b\u00fasqueda guardada es una acci\u00f3n (EQUITY).",
      emptyEtfs: "Ninguna b\u00fasqueda guardada es un ETF.",
      emptyAnalizados: "A\u00fan no hay an\u00e1lisis con resultado para ordenar.",
      emptyFavoritos: "No hay favoritos. Pulsa la estrella en un resultado o en una tarjeta.",
      filterPrefix: "filtro: ",
      fTodos: "todos", fAcciones: "acciones", fEtfs: "etfs", fAnalizados: "m\u00e1s analizados", fFavoritos: "favoritos",
      addTo: function (s) { return "A\u00f1adir " + s; }, listSelect: "Lista",
      noLists: "Todav\u00eda no hay listas. Crea una para agrupar tickers (los favoritos no la necesitan).",
      emptyList: "Lista vac\u00eda.",
      profMatch: "Coincide con su perfil",
      profSector: "Sector (mapa de ejemplos)",
      profWhyTitle: "Por qu\u00e9 encaja con su perfil",
      profWhyAlign: "El ticker est\u00e1 en el mapa de ejemplos del sector que usted marc\u00f3 como conocido.",
      profWhyOther: "El ticker est\u00e1 mapeado a otro sector que no marc\u00f3 en su perfil.",
      profWhyUnknown: "No hay sector de ejemplo para este ticker en nuestro mapa curado (no inventamos el GICS).",
      profWhyEmpty: "Rellene sectores en Perfil para ver solapamiento transparente.",
      profMungerLink: "Criterios Munger (cuando hay SEC): ver checklist abajo o en /munger/.",
      profSuggestTitle: "Ejemplos en sectores que conoce",
      profSuggestNote: "Ejemplos curados, no una recomendaci\u00f3n.",
      profOpen: "Editar perfil",
      profTag: "Perfil"
    },
    en: {
      loading: "Looking up\u2026", tooShort: "Type at least 2 characters.",
      notFound: "No result for that query. It is not saved to recents.",
      failed: "The lookup failed. Please try again.",
      price: "Price", change: "Daily change", source: "Source: Yahoo", sourceSec: "Source: Yahoo \u00b7 SEC",
      favAdd: "Add to favorites", favRemove: "Remove from favorites",
      typeEquity: "Stock", typeEtf: "ETF", typeOther: "Other", typeUnknown: "Unknown type",
      mungerTitle: "Munger checklist", howCalculated: "How it is calculated", annualTitle: "Annual figures (SEC)", expand: "Expand", close: "Close",
      matches: function (p, m) { return "Matches " + p + " of " + m + " measurable Munger criteria."; },
      mungerNote: "Transparent checklist. Not a 1\u201310 score and not a buy or sell signal.",
      pass: "Meets", fail: "Does not meet", unknown: "No data",
      cNet: "High net margin", cFcf: "High free cash flow margin", cCash: "Cash versus long-term debt",
      threshold: "Threshold", value: "Value",
      noNet: "Net margin cannot be calculated.", noFcf: "FCF margin cannot be calculated.", noCash: "Cash or long-term debt figures are missing.",
      cashDetail: function (c, d) { return "Cash " + c + " versus LT debt " + d + ". Criterion: cash \u2265 LT debt."; },
      noMungerTitle: "Munger checklist not available",
      noMungerText: "The Munger checklist needs U.S. annual reports (SEC). Only the price is shown.",
      usNote: "Annual report figures are only available for U.S. listings for now.",
      secDown: "Annual report figures could not be retrieved.",
      revenue: "Revenue", netIncome: "Net income", ocf: "Operating cash flow", capex: "Capital expenditures",
      ltDebt: "Long-term debt", cash: "Cash", netMargin: "Net margin", fcfMargin: "Free cash flow margin",
      fiscal: "fiscal year", periodEnd: "period end", secSource: "SEC source",
      recent: "Recent", recentMeta: "Recent search", favorite: "Favorite", favMeta: "In favorites",
      analyses: function (n) { return n === 1 ? "1 analysis" : n + " analyses"; },
      emptyTodos: "No successful searches yet. Search a ticker to start.",
      emptyAcciones: "No saved search is a stock (EQUITY).",
      emptyEtfs: "No saved search is an ETF.",
      emptyAnalizados: "No successful analyses to rank yet.",
      emptyFavoritos: "No favorites yet. Tap the star on a result or a card.",
      filterPrefix: "filter: ",
      fTodos: "all", fAcciones: "stocks", fEtfs: "etfs", fAnalizados: "most analyzed", fFavoritos: "favorites",
      addTo: function (s) { return "Add " + s; }, listSelect: "List",
      noLists: "No lists yet. Create one to group tickers (favorites do not need one).",
      emptyList: "Empty list.",
      profMatch: "Matches your profile",
      profSector: "Sector (example map)",
      profWhyTitle: "Why this fits your profile",
      profWhyAlign: "This ticker is on the example map for a sector you marked as known.",
      profWhyOther: "This ticker is mapped to another sector you did not mark.",
      profWhyUnknown: "No example-map sector for this ticker (we do not invent GICS).",
      profWhyEmpty: "Fill sectors in Profile to see transparent overlap.",
      profMungerLink: "Munger criteria (when SEC exists): see checklist below or at /munger/.",
      profSuggestTitle: "Examples in sectors you know",
      profSuggestNote: "Curated examples, not a recommendation.",
      profOpen: "Edit profile",
      profTag: "Profile"
    }
  };
  function lang() { return document.documentElement.getAttribute("lang") === "en" ? "en" : "es"; }
  function t(key) { var p = S[lang()]; return p[key] != null ? p[key] : S.es[key]; }
  function locale() { return lang() === "en" ? "en-US" : "es-ES"; }

  function loadJSON(key, fallback) {
    try { var raw = localStorage.getItem(key); if (!raw) return fallback; return JSON.parse(raw); } catch (err) { return fallback; }
  }
  function saveJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) {} }

  function normType(raw) {
    var v = String(raw || "").toUpperCase();
    if (v === "EQUITY") return "equity";
    if (v === "ETF") return "etf";
    if (!v || v === "UNKNOWN") return "unknown";
    return "other";
  }
  function cleanEntry(e) {
    if (!e || typeof e !== "object" || e.ok !== true || typeof e.s !== "string" || !e.s) return null;
    var type = e.type === "equity" || e.type === "etf" || e.type === "other" ? e.type : "unknown";
    return { s: e.s, ok: true, type: type, name: typeof e.name === "string" ? e.name : "", ts: typeof e.ts === "number" ? e.ts : 0 };
  }
  function searches() {
    var items = loadJSON(SEARCH_KEY, []);
    if (!Array.isArray(items)) return [];
    var outList = [], seen = {};
    for (var i = 0; i < items.length; i++) {
      var c = cleanEntry(items[i]);
      if (!c || seen[c.s]) continue;
      seen[c.s] = true; outList.push(c);
    }
    return outList.slice(0, 20);
  }
  function purgeInvalid() {
    var raw = loadJSON(SEARCH_KEY, []);
    var clean = searches();
    if (!Array.isArray(raw) || raw.length !== clean.length) saveJSON(SEARCH_KEY, clean);
    var counts = loadJSON(COUNT_KEY, {});
    if (!counts || typeof counts !== "object" || Array.isArray(counts)) saveJSON(COUNT_KEY, {});
    var favs = loadJSON(FAV_KEY, []);
    if (!Array.isArray(favs)) saveJSON(FAV_KEY, []);
  }
  function counts() {
    var c = loadJSON(COUNT_KEY, {});
    return c && typeof c === "object" && !Array.isArray(c) ? c : {};
  }
  function favorites() {
    var f = loadJSON(FAV_KEY, []);
    if (!Array.isArray(f)) return [];
    var res = [], seen = {};
    for (var i = 0; i < f.length; i++) {
      var e = f[i];
      if (typeof e === "string") e = { s: e };
      if (!e || typeof e.s !== "string" || seen[e.s]) continue;
      seen[e.s] = true;
      res.push({ s: e.s, name: typeof e.name === "string" ? e.name : "", type: e.type === "equity" || e.type === "etf" || e.type === "other" ? e.type : "unknown" });
    }
    return res;
  }
  function isFav(sym) { var f = favorites(); for (var i = 0; i < f.length; i++) if (f[i].s === sym) return true; return false; }
  function toggleFav(entry) {
    var f = favorites();
    var idx = -1;
    for (var i = 0; i < f.length; i++) if (f[i].s === entry.s) idx = i;
    if (idx >= 0) f.splice(idx, 1); else f.unshift({ s: entry.s, name: entry.name || "", type: entry.type || "unknown" });
    saveJSON(FAV_KEY, f);
  }
  function rememberSuccess(quote) {
    var sym = quote.symbol;
    var entry = { s: sym, ok: true, type: normType(quote.type), name: typeof quote.name === "string" ? quote.name : "", ts: Date.now() };
    var items = searches().filter(function (it) { return it.s !== sym; });
    items.unshift(entry);
    saveJSON(SEARCH_KEY, items.slice(0, 20));
    var c = counts();
    c[sym] = (typeof c[sym] === "number" ? c[sym] : 0) + 1;
    saveJSON(COUNT_KEY, c);
    var f = favorites(), changed = false;
    for (var i = 0; i < f.length; i++) if (f[i].s === sym) { f[i].type = entry.type; f[i].name = entry.name; changed = true; }
    if (changed) saveJSON(FAV_KEY, f);
    return entry;
  }
  function lists() {
    var data = loadJSON(LIST_KEY, []);
    if (!Array.isArray(data)) return [];
    var clean = [];
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      if (!item || typeof item.name !== "string" || !Array.isArray(item.symbols)) continue;
      var symbols = [];
      for (var j = 0; j < item.symbols.length; j++) {
        if (typeof item.symbols[j] === "string" && symbols.indexOf(item.symbols[j]) === -1) symbols.push(item.symbols[j]);
      }
      clean.push({ name: item.name, symbols: symbols });
    }
    return clean;
  }
  function saveLists(items) { saveJSON(LIST_KEY, items); }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function setEstado(key, kind) {
    lastEstado = key ? { key: key, kind: kind } : null;
    if (!key) { estado.classList.add("hidden"); clear(estado); return; }
    estado.className = "mt-5 rounded-xl border px-4 py-3 font-sans text-sm fade-in ";
    if (kind === "error") estado.className += "status-error";
    else estado.className += "border-line bg-elev text-mute";
    estado.textContent = t(key);
  }

  function nf(min, max) { return new Intl.NumberFormat(locale(), { minimumFractionDigits: min, maximumFractionDigits: max }); }
  function fmtMoney(n) {
    if (typeof n !== "number" || !isFinite(n)) return "\u2014";
    var abs = Math.abs(n), sign = n < 0 ? "\u2212" : "", f = nf(2, 2);
    if (lang() === "en") {
      if (abs >= 1e12) return sign + f.format(abs / 1e12) + " T";
      if (abs >= 1e9) return sign + f.format(abs / 1e9) + " B";
      if (abs >= 1e6) return sign + f.format(abs / 1e6) + " M";
    } else {
      if (abs >= 1e12) return sign + f.format(abs / 1e12) + " bill.";
      if (abs >= 1e9) return sign + f.format(abs / 1e9) + " mil M";
      if (abs >= 1e6) return sign + f.format(abs / 1e6) + " M";
    }
    return sign + nf(0, 0).format(abs);
  }
  function fmtPct(n) {
    if (typeof n !== "number" || !isFinite(n)) return "\u2014";
    var s = nf(1, 1).format(n * 100);
    return lang() === "en" ? s + "%" : s + "\u00a0%";
  }
  function fmtChange(p) {
    if (typeof p !== "number" || !isFinite(p)) return { text: "\u2014", dir: "flat" };
    var r = Math.round(p * 100) / 100;
    var num = nf(2, 2).format(Math.abs(r));
    var pct = lang() === "en" ? num + "%" : num + "\u00a0%";
    if (r > 0) return { text: "+" + pct + " \u25b2", dir: "up" };
    if (r < 0) return { text: "\u2212" + pct + " \u25bc", dir: "down" };
    return { text: pct + " \u25cf", dir: "flat" };
  }
  function fmtPrice(n, cur) {
    if (typeof n !== "number" || !isFinite(n)) return "\u2014";
    return nf(2, 2).format(n) + (cur ? " " + cur : "");
  }
  function initials(sym, name) {
    if (name && typeof name === "string") {
      var parts = name.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
    }
    return String(sym || "?").slice(0, 2).toUpperCase();
  }
  function typeLabel(type) {
    return type === "equity" ? t("typeEquity") : type === "etf" ? t("typeEtf") : type === "other" ? t("typeOther") : t("typeUnknown");
  }

  function starButton(entry, onChange, big) {
    var on = isFav(entry.s);
    var b = el("button", "star-btn " + (big ? "h-9 w-9" : "h-8 w-8") + " inline-flex shrink-0 items-center justify-center rounded-lg" + (on ? " is-on" : ""));
    b.type = "button";
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.title = on ? t("favRemove") : t("favAdd");
    b.setAttribute("aria-label", (on ? t("favRemove") : t("favAdd")) + " " + entry.s);
    b.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>';
    b.addEventListener("click", function (ev) {
      ev.stopPropagation();
      toggleFav(entry);
      if (onChange) onChange();
    });
    return b;
  }

  function statusBadge(status) {
    var cls = status === "pass" ? "badge-pass" : status === "fail" ? "badge-fail" : "badge-unknown";
    var key = status === "pass" ? "pass" : status === "fail" ? "fail" : "unknown";
    return el("span", "status-badge " + cls, t(key));
  }

  function buildMunger(filings) {
    var items = [];
    if (typeof filings.netMargin === "number") {
      items.push({ title: t("cNet"), detail: t("threshold") + ": \u2265 " + fmtPct(NET_MARGIN_OK) + ". " + t("value") + ": " + fmtPct(filings.netMargin), status: filings.netMargin >= NET_MARGIN_OK ? "pass" : "fail" });
    } else items.push({ title: t("cNet"), detail: t("noNet"), status: "unknown" });
    if (typeof filings.freeCashFlowMargin === "number") {
      items.push({ title: t("cFcf"), detail: t("threshold") + ": \u2265 " + fmtPct(FCF_MARGIN_OK) + ". " + t("value") + ": " + fmtPct(filings.freeCashFlowMargin), status: filings.freeCashFlowMargin >= FCF_MARGIN_OK ? "pass" : "fail" });
    } else items.push({ title: t("cFcf"), detail: t("noFcf"), status: "unknown" });
    var cash = filings.cash && typeof filings.cash.val === "number" ? filings.cash.val : null;
    var debt = filings.longTermDebt && typeof filings.longTermDebt.val === "number" ? filings.longTermDebt.val : null;
    if (cash != null && debt != null) {
      items.push({ title: t("cCash"), detail: S[lang()].cashDetail(fmtMoney(cash), fmtMoney(debt)), status: cash >= debt ? "pass" : "fail" });
    } else items.push({ title: t("cCash"), detail: t("noCash"), status: "unknown" });
    return items;
  }

  function detailsCard(title, open, buildBody, opts) {
    opts = opts || {};
    var wrap = el("details", "group atm-card rounded-2xl overflow-hidden");
    if (open) wrap.open = true;
    var summary = el("summary", "cursor-pointer px-4 py-4 sm:px-5 flex items-center justify-between gap-3 select-none");
    var left = el("div", "min-w-0 flex flex-wrap items-center gap-2");
    left.appendChild(el("span", "font-sans font-semibold text-ink", title));
    if (opts.helpHref) {
      var help = el("a", "font-mono text-[11px] font-medium text-accent no-underline hover:underline", opts.helpLabel || t("howCalculated"));
      help.href = opts.helpHref;
      help.addEventListener("click", function (ev) { ev.stopPropagation(); });
      left.appendChild(help);
    }
    summary.appendChild(left);
    var right = el("span", "shrink-0");
    right.appendChild(el("span", "font-mono text-[11px] text-dim group-open:hidden", t("expand")));
    right.appendChild(el("span", "font-mono text-[11px] text-dim hidden group-open:inline", t("close")));
    summary.appendChild(right);
    wrap.appendChild(summary);
    var body = el("div", "border-t border-line px-4 py-4 sm:px-5 space-y-3");
    buildBody(body);
    wrap.appendChild(body);
    return wrap;
  }

  function renderFactRow(parent, label, fact) {
    if (!fact || typeof fact.val !== "number") return;
    var row = el("div", "flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 py-2 border-b border-line last:border-0");
    var left = el("div", "min-w-0");
    left.appendChild(el("p", "text-sm font-medium text-ink", label));
    var meta = [];
    if (typeof fact.fy === "number") meta.push(t("fiscal") + " " + String(fact.fy));
    if (typeof fact.end === "string") meta.push(t("periodEnd") + " " + fact.end);
    if (meta.length) left.appendChild(el("p", "font-mono text-[11px] text-dim", meta.join(" \u00b7 ")));
    row.appendChild(left);
    var right = el("div", "sm:text-right");
    right.appendChild(el("p", "font-mono tabular-nums text-sm text-ink", fmtMoney(fact.val)));
    if (typeof fact.url === "string") {
      var a = el("a", "font-mono text-[11px] text-accent hover:underline transition-colors", t("secSource"));
      a.href = fact.url; a.rel = "noopener noreferrer"; a.target = "_blank";
      right.appendChild(a);
    }
    row.appendChild(right);
    parent.appendChild(row);
  }

  function renderMunger(parent, filings) {
    var items = buildMunger(filings);
    var measurable = 0, passed = 0;
    for (var i = 0; i < items.length; i++) if (items[i].status !== "unknown") { measurable++; if (items[i].status === "pass") passed++; }
    parent.appendChild(el("p", "text-sm leading-relaxed text-ink", S[lang()].matches(passed, measurable)));
    parent.appendChild(el("p", "font-mono text-[11px] text-dim", t("mungerNote")));
    for (var j = 0; j < items.length; j++) {
      var item = items[j];
      var card = el("div", "rounded-xl border border-line bg-bg p-4");
      var head = el("div", "flex flex-wrap items-start justify-between gap-2");
      head.appendChild(el("p", "min-w-0 text-sm font-semibold text-ink", item.title));
      head.appendChild(statusBadge(item.status));
      card.appendChild(head);
      card.appendChild(el("p", "mt-2 font-mono text-xs leading-relaxed text-mute break-words", item.detail));
      parent.appendChild(card);
    }
  }

  function renderResult(data) {
    clear(out);
    if (!data || data.ok !== true || !data.quote) {
      current = null;
      var key = data && data.error === "not_found" ? "notFound" : data && data.error === "too_short" ? "tooShort" : "failed";
      setEstado(key, key === "failed" ? "error" : "empty");
      return;
    }
    setEstado("");
    current = data;
    var quote = data.quote;
    var type = normType(quote.type);
    var entry = { s: quote.symbol, name: quote.name || "", type: type };

    var hero = el("div", "atm-card rounded-2xl p-4 sm:p-5 fade-in");
    var top = el("div", "flex items-start gap-3 sm:gap-4");
    top.appendChild(el("div", "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-sm font-semibold text-accent", initials(quote.symbol, quote.name)));
    var info = el("div", "min-w-0 flex-1");
    if (typeof quote.name === "string") info.appendChild(el("h2", "break-words font-sans text-lg sm:text-xl font-bold tracking-tight text-ink", quote.name));
    var metaRow = el("div", "mt-2 flex flex-wrap gap-2 items-center");
    if (typeof quote.symbol === "string") metaRow.appendChild(el("span", "rounded-md border border-line bg-bg px-2 py-0.5 font-mono text-xs text-mute", quote.symbol));
    if (typeof quote.exchange === "string") metaRow.appendChild(el("span", "font-mono text-xs text-dim", quote.exchange));
    metaRow.appendChild(el("span", "rounded-md border border-line px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-mute", typeLabel(type)));
    info.appendChild(metaRow);
    top.appendChild(info);
    top.appendChild(starButton(entry, function () { renderResult(current); renderGrid(); }, true));
    hero.appendChild(top);

    var priceGrid = el("div", "mt-4 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2");
    var priceBox = el("div", "rounded-xl border border-line bg-bg p-3");
    priceBox.appendChild(el("p", "font-sans text-[10px] uppercase tracking-wide text-dim", t("price")));
    priceBox.appendChild(el("p", "mt-1 font-mono tabular-nums text-lg text-ink", fmtPrice(quote.regularMarketPrice, quote.currency)));
    if (data.resolved && data.resolved.currencyFallback) priceBox.appendChild(el("p", "mt-1 font-sans text-[11px] text-dim", lang() === "en" ? "No EUR pair at the source; price in " + (quote.currency || "USD") + "." : "Sin par en EUR en la fuente; precio en " + (quote.currency || "USD") + "."));
    priceGrid.appendChild(priceBox);
    var chBox = el("div", "rounded-xl border border-line bg-bg p-3");
    chBox.appendChild(el("p", "font-sans text-[10px] uppercase tracking-wide text-dim", t("change")));
    var ch = fmtChange(quote.regularMarketChangePercent);
    var chEl = el("p", "mt-1 font-mono tabular-nums text-lg text-ink change-" + ch.dir, ch.text);
    chBox.appendChild(chEl);
    priceGrid.appendChild(chBox);
    hero.appendChild(priceGrid);
    hero.appendChild(el("p", "mt-3 font-mono text-[11px] text-dim", data.filings ? t("sourceSec") : t("source")));
    out.appendChild(hero);

    // Profile overlap (transparent; localStorage only)
    (function () {
      if (typeof loadProfile !== "function" || typeof matchProfile !== "function") return;
      var prof = loadProfile();
      var match = matchProfile(quote, prof);
      var box = el("div", "atm-card rounded-2xl p-4 sm:p-5 fade-in");
      var head = el("div", "flex flex-wrap items-center justify-between gap-2");
      head.appendChild(el("p", "font-sans text-sm font-semibold text-ink", t("profWhyTitle")));
      var edit = el("a", "font-mono text-[11px] text-accent no-underline hover:underline", t("profOpen"));
      edit.href = "/perfil/";
      head.appendChild(edit);
      box.appendChild(head);
      if (!prof.sectors || !prof.sectors.length) {
        box.appendChild(el("p", "mt-2 text-sm text-mute", t("profWhyEmpty")));
      } else if (match.aligned) {
        var row = el("div", "mt-3 flex flex-wrap gap-2 items-center");
        row.appendChild(el("span", "profile-match-tag", t("profMatch")));
        if (match.sector) row.appendChild(el("span", "rounded-md border border-line px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-mute", t("profSector") + ": " + sectorLabel(match.sector, lang())));
        box.appendChild(row);
        box.appendChild(el("p", "mt-2 text-sm leading-relaxed text-mute", t("profWhyAlign")));
      } else if (match.reason === "sector_other") {
        box.appendChild(el("p", "mt-2 text-sm leading-relaxed text-mute", t("profWhyOther") + (match.sector ? " (" + sectorLabel(match.sector, lang()) + ")" : "")));
      } else {
        box.appendChild(el("p", "mt-2 text-sm leading-relaxed text-mute", t("profWhyUnknown")));
      }
      if (data.filings) box.appendChild(el("p", "mt-2 font-mono text-[11px] text-dim", t("profMungerLink")));
      out.appendChild(box);
    })();

    if (data.filings == null) {
      var note = el("div", "rounded-2xl border border-line bg-elev p-4 sm:p-5");
      note.appendChild(el("p", "font-sans font-semibold text-ink", t("noMungerTitle")));
      note.appendChild(el("p", "mt-2 text-sm leading-relaxed text-mute", t("noMungerText")));
      if (typeof data.filingsNote === "string") {
        var fn = data.filingsNote.indexOf("Estados Unidos") !== -1 ? t("usNote") : data.filingsNote.indexOf("No se han podido") !== -1 ? t("secDown") : data.filingsNote;
        note.appendChild(el("p", "mt-2 font-mono text-xs text-dim", fn));
      }
      out.appendChild(note);
    } else {
      var filings = data.filings;
      out.appendChild(detailsCard(t("mungerTitle"), true, function (body) { renderMunger(body, filings); }, { helpHref: "/munger/", helpLabel: t("howCalculated") }));
      out.appendChild(detailsCard(t("annualTitle"), false, function (body) {
        renderFactRow(body, t("revenue"), filings.revenue);
        renderFactRow(body, t("netIncome"), filings.netIncome);
        renderFactRow(body, t("ocf"), filings.operatingCashFlow);
        renderFactRow(body, t("capex"), filings.capex);
        renderFactRow(body, t("ltDebt"), filings.longTermDebt);
        renderFactRow(body, t("cash"), filings.cash);
        if (typeof filings.netMargin === "number") {
          var r1 = el("div", "flex justify-between gap-3 py-2 border-b border-line");
          r1.appendChild(el("p", "text-sm font-medium text-ink", t("netMargin")));
          r1.appendChild(el("p", "font-mono tabular-nums text-sm text-ink", fmtPct(filings.netMargin)));
          body.appendChild(r1);
        }
        if (typeof filings.freeCashFlowMargin === "number") {
          var r3 = el("div", "flex justify-between gap-3 py-2");
          r3.appendChild(el("p", "text-sm font-medium text-ink", t("fcfMargin")));
          r3.appendChild(el("p", "font-mono tabular-nums text-sm text-ink", fmtPct(filings.freeCashFlowMargin)));
          body.appendChild(r3);
        }
      }));
    }
    renderListsPanel();
  }

  function lookup(q) {
    var id = ++seq;
    clear(out);
    setEstado("loading", "loading");
    fetch("/api/quote?q=" + encodeURIComponent(q), { headers: { Accept: "application/json" } })
      .then(function (response) {
        return response.json().then(function (data) { return data; }, function () { return { ok: false, error: "error" }; });
      })
      .then(function (data) {
        if (id !== seq) return;
        if (data && data.ok === true && data.quote && typeof data.quote.symbol === "string") rememberSuccess(data.quote);
        renderResult(data);
        renderGrid();
      })
      .catch(function () {
        if (id !== seq) return;
        current = null;
        clear(out);
        setEstado("failed", "error");
        renderListsPanel();
      });
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      var q = input.value.trim();
      if (q.length < 2) {
        if (q.length === 0) { clear(out); setEstado(""); current = null; renderListsPanel(); }
        else setEstado("tooShort", "empty");
        return;
      }
      lookup(q);
    }, 400);
  }

  function collectCards() {
    var recent = searches();
    var c = counts();
    var cards;
    if (activeFilter === "favoritos") {
      var meta = {};
      recent.forEach(function (r) { meta[r.s] = r; });
      cards = favorites().map(function (f) {
        var r = meta[f.s];
        return { s: f.s, name: (r && r.name) || f.name, type: (r && r.type) || f.type, kind: "fav" };
      });
    } else if (activeFilter === "analizados") {
      cards = recent.filter(function (r) { return typeof c[r.s] === "number" && c[r.s] > 0; })
        .map(function (r) { return { s: r.s, name: r.name, type: r.type, kind: "count", count: c[r.s], ts: r.ts }; });
      cards.sort(function (a, b) { return b.count !== a.count ? b.count - a.count : b.ts - a.ts; });
    } else {
      cards = recent.map(function (r) { return { s: r.s, name: r.name, type: r.type, kind: "recent" }; });
      if (activeFilter === "acciones") cards = cards.filter(function (x) { return x.type === "equity"; });
      if (activeFilter === "etfs") cards = cards.filter(function (x) { return x.type === "etf"; });
    }
    return cards;
  }

  function assetCard(cd) {
    var card = el("div", "atm-card relative flex items-start gap-3 rounded-2xl p-4 fade-in");
    var open = el("button", "flex min-w-0 flex-1 items-start gap-3 text-left");
    open.type = "button";
    open.appendChild(el("div", "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-xs font-semibold text-accent", initials(cd.s, cd.name)));
    var mid = el("div", "min-w-0 flex-1");
    mid.appendChild(el("p", "truncate font-sans text-sm font-semibold text-ink", cd.name || cd.s));
    var badges = el("div", "mt-1.5 flex flex-wrap gap-1.5");
    badges.appendChild(el("span", "rounded-md border border-line bg-bg px-1.5 py-0.5 font-mono text-[10px] text-mute", cd.s));
    badges.appendChild(el("span", "rounded-md border border-line px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-mute", typeLabel(cd.type)));
    var tag = cd.kind === "fav" ? t("favorite") : cd.kind === "count" ? null : t("recent");
    if (tag) badges.appendChild(el("span", "rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-accent", tag));
    if (cd.kind === "count") badges.appendChild(el("span", "count-pill rounded-md px-1.5 py-0.5 font-mono tabular-nums text-[10px] font-semibold", S[lang()].analyses(cd.count)));
    mid.appendChild(badges);
    mid.appendChild(el("p", "mt-2 font-mono text-[11px] text-dim", cd.kind === "fav" ? t("favMeta") : cd.kind === "count" ? t("recentMeta") : t("recentMeta")));
    open.appendChild(mid);
    open.addEventListener("click", function () { input.value = cd.s; lookup(cd.s); });
    card.appendChild(open);
    card.appendChild(starButton({ s: cd.s, name: cd.name, type: cd.type }, function () { renderGrid(); if (current) renderResult(current); }, false));
    return card;
  }

  var EMPTY = { todos: "emptyTodos", acciones: "emptyAcciones", etfs: "emptyEtfs", analizados: "emptyAnalizados", favoritos: "emptyFavoritos" };
  var FLABEL = { todos: "fTodos", acciones: "fAcciones", etfs: "fEtfs", analizados: "fAnalizados", favoritos: "fFavoritos" };
  function renderGrid() {
    clear(grid);
    if (filtroLabel) filtroLabel.textContent = t("filterPrefix") + t(FLABEL[activeFilter] || "fTodos");
    var cards = collectCards();
    if (!cards.length) {
      if (emptyGridText) emptyGridText.textContent = t(EMPTY[activeFilter] || "emptyTodos");
      emptyGrid.classList.remove("hidden");
      return;
    }
    emptyGrid.classList.add("hidden");
    cards.forEach(function (cd) { grid.appendChild(assetCard(cd)); });
  }

  function renderListsPanel() {
    clear(listsPanel);
    var items = lists();
    var symbol = current && current.quote && typeof current.quote.symbol === "string" ? current.quote.symbol : "";
    if (symbol && items.length) {
      var row = el("div", "flex flex-wrap gap-2 items-center atm-card rounded-xl p-3");
      var select = document.createElement("select");
      select.className = "atm-input min-w-0 max-w-full rounded-lg px-3 py-2 font-sans text-xs text-ink";
      select.setAttribute("aria-label", t("listSelect"));
      for (var i = 0; i < items.length; i++) {
        var opt = document.createElement("option");
        opt.value = items[i].name; opt.textContent = items[i].name;
        select.appendChild(opt);
      }
      var add = el("button", "rounded-full bg-pill px-3 py-1.5 font-sans text-xs font-semibold text-white transition-all hover:brightness-110", S[lang()].addTo(symbol));
      add.type = "button";
      add.addEventListener("click", function () {
        var name = select.value, next = lists();
        for (var k = 0; k < next.length; k++) if (next[k].name === name && next[k].symbols.indexOf(symbol) === -1) next[k].symbols.push(symbol);
        saveLists(next);
        renderListsPanel();
      });
      row.appendChild(select); row.appendChild(add);
      listsPanel.appendChild(row);
    }
    if (!items.length) { listsPanel.appendChild(el("p", "font-sans text-xs text-dim", t("noLists"))); return; }
    items.forEach(function (item) {
      var card = el("div", "mt-3 atm-card rounded-xl p-4 fade-in");
      card.appendChild(el("p", "break-words font-sans text-sm font-semibold text-ink", item.name));
      if (!item.symbols.length) card.appendChild(el("p", "mt-2 font-mono text-xs text-dim", t("emptyList")));
      var chips = el("div", "mt-3 flex flex-wrap gap-2");
      item.symbols.forEach(function (sym) {
        var open = el("button", "atm-btn rounded-full px-3 py-1.5 font-mono text-xs text-ink", sym);
        open.type = "button";
        open.addEventListener("click", function () { input.value = sym; lookup(sym); });
        chips.appendChild(open);
      });
      card.appendChild(chips);
      listsPanel.appendChild(card);
    });
  }

  document.querySelectorAll(".filter-btn").forEach(function (btn) {
    btn.setAttribute("aria-pressed", btn.classList.contains("filter-active") ? "true" : "false");
    btn.addEventListener("click", function () {
      activeFilter = btn.getAttribute("data-filter") || "todos";
      document.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("filter-active"); b.setAttribute("aria-pressed", "false"); });
      btn.classList.add("filter-active");
      btn.setAttribute("aria-pressed", "true");
      renderGrid();
    });
  });
  document.addEventListener("invest:lang", function () {
    if (current) renderResult(current);
    else if (lastEstado) setEstado(lastEstado.key, lastEstado.kind);
    renderGrid();
    renderListsPanel();
    if (typeof renderProfileSuggestions === "function") renderProfileSuggestions();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    clearTimeout(timer);
    var q = input.value.trim();
    if (q.length < 2) { setEstado("tooShort", "empty"); return; }
    lookup(q);
  });
  input.addEventListener("input", schedule);
  document.getElementById("crear-lista").addEventListener("click", function () {
    var name = listName.value.trim();
    if (!name) return;
    var next = lists();
    for (var i = 0; i < next.length; i++) if (next[i].name === name) return;
    next.push({ name: name, symbols: [] });
    saveLists(next);
    listName.value = "";
    renderListsPanel();
  });
  function renderProfileSuggestions() {
    var host = document.getElementById("perfil-suggest");
    if (!host || typeof loadProfile !== "function") return;
    clear(host);
    var prof = loadProfile();
    if (!prof.sectors || !prof.sectors.length) {
      host.classList.add("hidden");
      return;
    }
    host.classList.remove("hidden");
    var head = el("div", "flex flex-wrap items-center justify-between gap-2");
    head.appendChild(el("h2", "font-sans text-sm font-semibold text-ink", t("profSuggestTitle")));
    var a = el("a", "font-mono text-[11px] text-accent no-underline hover:underline", t("profOpen"));
    a.href = "/perfil/";
    head.appendChild(a);
    host.appendChild(head);
    host.appendChild(el("p", "mt-1 font-mono text-[11px] text-dim", t("profSuggestNote")));
    var wrap = el("div", "mt-3 flex flex-wrap gap-2");
    var seen = {};
    prof.sectors.forEach(function (sid) {
      var list = (typeof SECTOR_EXAMPLES !== "undefined" && SECTOR_EXAMPLES[sid]) ? SECTOR_EXAMPLES[sid] : [];
      list.slice(0, 3).forEach(function (row) {
        if (seen[row.s]) return;
        seen[row.s] = true;
        var b = el("button", "inline-flex items-center gap-1.5 rounded-full border border-line bg-elev px-2.5 py-1 font-mono text-xs text-ink", row.s);
        b.type = "button";
        b.title = row.name;
        b.addEventListener("click", function () { input.value = row.s; lookup(row.s); });
        wrap.appendChild(b);
      });
    });
    host.appendChild(wrap);
  }

  // Prefill from ?q=
  try {
    var u = new URL(location.href);
    var qq = u.searchParams.get("q");
    if (qq && qq.trim().length >= 2) {
      input.value = qq.trim();
      lookup(qq.trim());
    }
  } catch (err) {}

  purgeInvalid();
  renderGrid();
  renderListsPanel();
  renderProfileSuggestions();
  document.addEventListener("invest:lang", function () { renderProfileSuggestions(); });
})();
