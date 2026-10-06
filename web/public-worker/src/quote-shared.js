var IQ = (function () {
  var NET_MARGIN_OK = 0.15, FCF_MARGIN_OK = 0.10;
  var S = {
    es: {
      nodata: "sin dato", pass: "Cumple", fail: "No cumple", unknown: "Sin datos",
      cNet: "Margen neto \u2265 15\u00a0%", cFcf: "Margen de flujo de caja libre \u2265 10\u00a0%", cCash: "Efectivo \u2265 deuda a largo plazo",
      value: "Valor", noNet: "No hay margen neto calculable (faltan ingresos o resultado neto del mismo ejercicio).",
      noFcf: "No hay margen FCF calculable (faltan flujo de explotaci\u00f3n, capex o ingresos del mismo ejercicio).",
      noCash: "Faltan cifras de efectivo o de deuda LP en el 10-K.",
      cash: "Efectivo", debt: "Deuda LP",
      matches: function (p, m) { return m ? "Coincide con " + p + " de " + m + " criterios medibles." : "Ning\u00fan criterio es medible con los datos disponibles."; },
      note: "Checklist transparente. No es una puntuaci\u00f3n ni una se\u00f1al de compra o venta.",
      noSec: "Sin cifras SEC para este s\u00edmbolo: el checklist no se calcula (no inventamos datos).",
      usNote: "Las cifras de los informes anuales solo est\u00e1n disponibles para cotizaciones de Estados Unidos por ahora.",
      secDown: "No se han podido consultar las cifras de los informes anuales.",
      loading: "Consultando\u2026", notFound: "No hay resultado para ese s\u00edmbolo.", failed: "No se ha podido consultar. Int\u00e9ntalo de nuevo.", tooShort: "Escribe al menos 2 caracteres.",
      fy: "ejercicio", end: "cierre", src: "fuente SEC", price: "Precio"
    },
    en: {
      nodata: "no data", pass: "Meets", fail: "Does not meet", unknown: "No data",
      cNet: "Net margin \u2265 15%", cFcf: "Free cash flow margin \u2265 10%", cCash: "Cash \u2265 long-term debt",
      value: "Value", noNet: "Net margin cannot be calculated (revenue or net income missing for the same fiscal year).",
      noFcf: "FCF margin cannot be calculated (operating cash flow, capex or revenue missing for the same fiscal year).",
      noCash: "Cash or long-term debt figures are missing from the 10-K.",
      cash: "Cash", debt: "LT debt",
      matches: function (p, m) { return m ? "Matches " + p + " of " + m + " measurable criteria." : "No criterion is measurable with the available data."; },
      note: "Transparent checklist. Not a score and not a buy or sell signal.",
      noSec: "No SEC figures for this symbol: the checklist is not computed (we do not invent data).",
      usNote: "Annual report figures are only available for U.S. listings for now.",
      secDown: "Annual report figures could not be retrieved.",
      loading: "Looking up\u2026", notFound: "No result for that symbol.", failed: "The lookup failed. Please try again.", tooShort: "Type at least 2 characters.",
      fy: "fiscal year", end: "period end", src: "SEC source", price: "Price"
    }
  };
  function lang() { return document.documentElement.getAttribute("lang") === "en" ? "en" : "es"; }
  function t(k) { var p = S[lang()]; return p[k] != null ? p[k] : S.es[k]; }
  function locale() { return lang() === "en" ? "en-US" : "es-ES"; }
  function nf(a, b) { return new Intl.NumberFormat(locale(), { minimumFractionDigits: a, maximumFractionDigits: b }); }
  function isNum(n) { return typeof n === "number" && isFinite(n); }
  function money(n) {
    if (!isNum(n)) return null;
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
  function pct(n) { if (!isNum(n)) return null; var s = nf(1, 1).format(n * 100); return lang() === "en" ? s + "%" : s + "\u00a0%"; }
  function price(n, cur) { if (!isNum(n)) return null; return nf(2, 2).format(n) + (cur ? " " + cur : ""); }
  function factVal(f) { return f && isNum(f.val) ? f.val : null; }
  function munger(filings) {
    var f = filings || {};
    var items = [];
    if (isNum(f.netMargin)) items.push({ k: "net", title: t("cNet"), detail: t("value") + ": " + pct(f.netMargin), status: f.netMargin >= NET_MARGIN_OK ? "pass" : "fail" });
    else items.push({ k: "net", title: t("cNet"), detail: t("noNet"), status: "unknown" });
    if (isNum(f.freeCashFlowMargin)) items.push({ k: "fcf", title: t("cFcf"), detail: t("value") + ": " + pct(f.freeCashFlowMargin), status: f.freeCashFlowMargin >= FCF_MARGIN_OK ? "pass" : "fail" });
    else items.push({ k: "fcf", title: t("cFcf"), detail: t("noFcf"), status: "unknown" });
    var c = factVal(f.cash), d = factVal(f.longTermDebt);
    if (c != null && d != null) items.push({ k: "cash", title: t("cCash"), detail: t("cash") + " " + money(c) + " \u00b7 " + t("debt") + " " + money(d), status: c >= d ? "pass" : "fail" });
    else items.push({ k: "cash", title: t("cCash"), detail: t("noCash"), status: "unknown" });
    var m = 0, p = 0;
    items.forEach(function (it) { if (it.status !== "unknown") { m++; if (it.status === "pass") p++; } });
    return { items: items, passed: p, measurable: m };
  }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }
  function badge(status) {
    var cls = status === "pass" ? "badge-pass" : status === "fail" ? "badge-fail" : "badge-unknown";
    return el("span", "status-badge " + cls, t(status === "pass" ? "pass" : status === "fail" ? "fail" : "unknown"));
  }
  function fetchQuote(q) {
    return fetch("/api/quote?q=" + encodeURIComponent(q), { headers: { Accept: "application/json" } })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: "error" }; }); })
      .catch(function () { return { ok: false, error: "error" }; });
  }
  function filingsNote(data) {
    var n = data && data.filingsNote;
    if (typeof n !== "string") return t("noSec");
    if (n.indexOf("Estados Unidos") !== -1) return t("usNote");
    if (n.indexOf("No se han podido") !== -1) return t("secDown");
    return n;
  }
  return { S: S, t: t, lang: lang, money: money, pct: pct, price: price, factVal: factVal, munger: munger, el: el, clear: clear, badge: badge, fetchQuote: fetchQuote, filingsNote: filingsNote, isNum: isNum };
})();
