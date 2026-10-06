(function () {
  var form = document.getElementById("cmp-form");
  var out = document.getElementById("cmp-result");
  if (!form || !out) return;
  var el = IQ.el, t = IQ.t, last = null, seq = 0;
  var L = {
    es: { field: "Campo", name: "Nombre", price: "Precio", exchange: "Mercado", type: "Tipo", fy: "Ejercicio (cierre)", revenue: "Ingresos", netIncome: "Resultado neto", netMargin: "Margen neto", ocf: "Flujo de caja de explotaci\u00f3n", capex: "Pagos por inmovilizado (capex)", fcf: "Flujo de caja libre (FCF)", fcfMargin: "Margen FCF", cash: "Efectivo", debt: "Deuda a largo plazo", munger: "Checklist Munger", need2: "Escribe al menos dos tickers.", notFound: "sin resultado", note: "Datos tal como los devuelve /api/quote (Yahoo + SEC 10-K). Sin ordenar ni destacar: comparar no es recomendar.", of: " de ", crit: " criterios" },
    en: { field: "Field", name: "Name", price: "Price", exchange: "Exchange", type: "Type", fy: "Fiscal year (end)", revenue: "Revenue", netIncome: "Net income", netMargin: "Net margin", ocf: "Operating cash flow", capex: "Capital expenditures", fcf: "Free cash flow (FCF)", fcfMargin: "FCF margin", cash: "Cash", debt: "Long-term debt", munger: "Munger checklist", need2: "Type at least two tickers.", notFound: "no result", note: "Data exactly as /api/quote returns it (Yahoo + SEC 10-K). No ranking or highlighting: comparing is not recommending.", of: " of ", crit: " criteria" }
  };
  function l(k) { return L[IQ.lang()][k]; }
  function rows() {
    return [
      ["name", function (d) { return d.quote.name || null; }],
      ["price", function (d) { return IQ.price(d.quote.regularMarketPrice, d.quote.currency); }],
      ["exchange", function (d) { return d.quote.exchange || null; }],
      ["type", function (d) { return d.quote.type && d.quote.type !== "unknown" ? d.quote.type : null; }],
      ["fy", function (d) { var f = d.filings, r = f && (f.revenue || f.netIncome || f.cash); return r && r.end ? (typeof r.fy === "number" ? r.fy + " (" + r.end + ")" : r.end) : null; }],
      ["revenue", function (d) { return d.filings ? IQ.money(IQ.factVal(d.filings.revenue)) : null; }],
      ["netIncome", function (d) { return d.filings ? IQ.money(IQ.factVal(d.filings.netIncome)) : null; }],
      ["netMargin", function (d) { return d.filings ? IQ.pct(d.filings.netMargin) : null; }],
      ["ocf", function (d) { return d.filings ? IQ.money(IQ.factVal(d.filings.operatingCashFlow)) : null; }],
      ["capex", function (d) { return d.filings ? IQ.money(IQ.factVal(d.filings.capex)) : null; }],
      ["fcf", function (d) { return d.filings && IQ.isNum(d.filings.freeCashFlow) ? IQ.money(d.filings.freeCashFlow) : null; }],
      ["fcfMargin", function (d) { return d.filings ? IQ.pct(d.filings.freeCashFlowMargin) : null; }],
      ["cash", function (d) { return d.filings ? IQ.money(IQ.factVal(d.filings.cash)) : null; }],
      ["debt", function (d) { return d.filings ? IQ.money(IQ.factVal(d.filings.longTermDebt)) : null; }],
      ["munger", function (d) { if (!d.filings) return null; var m = IQ.munger(d.filings); return m.measurable ? m.passed + l("of") + m.measurable + l("crit") : null; }]
    ];
  }
  function render(syms, datas) {
    last = { syms: syms, datas: datas };
    IQ.clear(out);
    var wrap = el("div", "atm-card overflow-x-auto rounded-2xl fade-in");
    var table = el("table", "cmp-table");
    var thead = el("thead"), tr = el("tr");
    tr.appendChild(el("th", "", l("field")));
    syms.forEach(function (s, i) { var d = datas[i]; tr.appendChild(el("th", "font-mono", d && d.ok && d.quote && d.quote.symbol ? d.quote.symbol : s.toUpperCase())); });
    thead.appendChild(tr); table.appendChild(thead);
    var tb = el("tbody");
    rows().forEach(function (r) {
      var row = el("tr");
      row.appendChild(el("th", "", l(r[0])));
      datas.forEach(function (d) {
        var v = d && d.ok && d.quote ? r[1](d) : null;
        var txt = v == null || v === "" ? (d && d.ok ? t("nodata") : (r[0] === "name" ? l("notFound") : t("nodata"))) : String(v);
        row.appendChild(el("td", v == null || v === "" ? "is-null" : "", txt));
      });
      tb.appendChild(row);
    });
    table.appendChild(tb); wrap.appendChild(table); out.appendChild(wrap);
    out.appendChild(el("p", "mt-3 font-mono text-[11px] text-dim", l("note")));
  }
  function run(list) {
    var syms = list.map(function (s) { return (s || "").trim(); }).filter(function (s) { return s.length >= 2; }).slice(0, 3);
    IQ.clear(out);
    if (syms.length < 2) { out.appendChild(el("div", "rounded-xl border border-line bg-elev px-4 py-3 font-sans text-sm text-mute", l("need2"))); return; }
    var id = ++seq;
    out.appendChild(el("div", "rounded-xl border border-line bg-elev px-4 py-3 font-sans text-sm text-mute", t("loading")));
    Promise.all(syms.map(IQ.fetchQuote)).then(function (datas) { if (id === seq) render(syms, datas); });
  }
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    run(["ca", "cb", "cc"].map(function (id) { var n = document.getElementById(id); return n ? n.value : ""; }));
  });
  document.addEventListener("invest:lang", function () { if (last) render(last.syms, last.datas); });
  try {
    var p = new URL(location.href).searchParams.get("t");
    if (p) {
      var parts = p.split(",").slice(0, 3);
      ["ca", "cb", "cc"].forEach(function (id, i) { var n = document.getElementById(id); if (n && parts[i]) n.value = parts[i].trim(); });
      run(parts);
    }
  } catch (e) {}
})();
