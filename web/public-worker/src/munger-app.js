(function () {
  var form = document.getElementById("munger-form");
  var input = document.getElementById("mq");
  var out = document.getElementById("munger-result");
  if (!form || !input || !out) return;
  var last = null, seq = 0;
  var el = IQ.el, t = IQ.t;
  function status(msg) { IQ.clear(out); out.appendChild(el("div", "rounded-xl border border-line bg-elev px-4 py-3 font-sans text-sm text-mute", msg)); }
  function render(data) {
    last = data;
    IQ.clear(out);
    if (!data || data.ok !== true || !data.quote) { status(data && data.error === "not_found" ? t("notFound") : data && data.error === "too_short" ? t("tooShort") : t("failed")); return; }
    var q = data.quote;
    var card = el("div", "atm-card rounded-2xl p-4 sm:p-5 fade-in");
    var head = el("div", "flex flex-wrap items-baseline justify-between gap-2");
    var left = el("div", "min-w-0");
    left.appendChild(el("p", "break-words font-sans text-lg font-bold text-ink", q.name || q.symbol || ""));
    left.appendChild(el("p", "mt-1 font-mono text-xs text-dim", [q.symbol, q.exchange].filter(Boolean).join(" \u00b7 ")));
    head.appendChild(left);
    var pr = IQ.price(q.regularMarketPrice, q.currency);
    head.appendChild(el("p", "font-mono tabular-nums text-sm text-mute", t("price") + ": " + (pr || t("nodata"))));
    card.appendChild(head);
    if (!data.filings) {
      card.appendChild(el("p", "mt-4 text-sm leading-relaxed text-mute", t("noSec")));
      card.appendChild(el("p", "mt-2 font-mono text-xs text-dim", IQ.filingsNote(data)));
      out.appendChild(card);
      return;
    }
    var m = IQ.munger(data.filings);
    card.appendChild(el("p", "mt-4 text-sm font-semibold text-ink", IQ.S[IQ.lang()].matches(m.passed, m.measurable)));
    card.appendChild(el("p", "mt-1 font-mono text-[11px] text-dim", t("note")));
    var list = el("div", "mt-4 space-y-3");
    m.items.forEach(function (it) {
      var row = el("div", "rounded-xl border border-line bg-bg p-4");
      var h = el("div", "flex flex-wrap items-start justify-between gap-2");
      h.appendChild(el("p", "min-w-0 text-sm font-semibold text-ink", it.title));
      h.appendChild(IQ.badge(it.status));
      row.appendChild(h);
      row.appendChild(el("p", "mt-2 font-mono text-xs leading-relaxed text-mute break-words", it.detail));
      list.appendChild(row);
    });
    card.appendChild(list);
    var f = data.filings, ref = f.revenue || f.netIncome || f.cash || null;
    if (ref && ref.end) {
      var meta = el("p", "mt-3 font-mono text-[11px] text-dim");
      meta.textContent = (typeof ref.fy === "number" ? t("fy") + " " + ref.fy + " \u00b7 " : "") + t("end") + " " + ref.end + " \u00b7 10-K";
      if (ref.url) {
        meta.appendChild(document.createTextNode(" \u00b7 "));
        var a = el("a", "text-accent hover:underline", t("src"));
        a.href = ref.url; a.target = "_blank"; a.rel = "noopener noreferrer";
        meta.appendChild(a);
      }
      card.appendChild(meta);
    }
    out.appendChild(card);
  }
  function run(q) {
    q = (q || "").trim();
    if (q.length < 2) { status(t("tooShort")); return; }
    var id = ++seq;
    status(t("loading"));
    IQ.fetchQuote(q).then(function (d) { if (id === seq) render(d); });
  }
  form.addEventListener("submit", function (ev) { ev.preventDefault(); run(input.value); });
  document.addEventListener("invest:lang", function () { if (last) render(last); });
  try { var qq = new URL(location.href).searchParams.get("q"); if (qq) { input.value = qq; run(qq); } } catch (e) {}
})();
