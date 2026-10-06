(function () {
  var lang = function () { return document.documentElement.getAttribute("lang") === "en" ? "en" : "es"; };
  var root = document.getElementById("perfil-app");
  if (!root) return;

  var T = {
    es: {
      lead: "Peter Lynch populariz\u00f3 invertir en lo que uno entiende. Guarde aqu\u00ed edad, pa\u00eds y sectores que conoce. Solo en este navegador (localStorage). No es un test de idoneidad MiFID ni una recomendaci\u00f3n.",
      ageBand: "Franja de edad",
      ageExact: "Edad (opcional)",
      country: "Pa\u00eds",
      countryPh: "Espa\u00f1a (ES)",
      sectors: "Sectores que conoce",
      save: "Guardar perfil",
      saved: "Perfil guardado en este dispositivo.",
      clear: "Borrar perfil",
      cleared: "Perfil borrado.",
      examplesTitle: "Ejemplos en sectores que conoce",
      examplesNote: "Lista curada de tickers conocidos por sector. Son ejemplos para explorar, no una recomendaci\u00f3n de compra ni de venta.",
      emptyExamples: "Elija al menos un sector para ver ejemplos.",
      mifid: "Informaci\u00f3n general. No es asesoramiento personalizado ni un servicio de inversi\u00f3n (MiFID II / Ley 6/2023). El titular no est\u00e1 inscrito en la CNMV como ESI.",
      none: "Sin seleccionar",
      analyze: "Analizar"
    },
    en: {
      lead: "Peter Lynch popularized investing in what you understand. Store age, country and sectors you know here. Browser-only (localStorage). Not a MiFID suitability test and not a recommendation.",
      ageBand: "Age band",
      ageExact: "Age (optional)",
      country: "Country",
      countryPh: "Spain (ES)",
      sectors: "Sectors you know",
      save: "Save profile",
      saved: "Profile saved on this device.",
      clear: "Clear profile",
      cleared: "Profile cleared.",
      examplesTitle: "Examples in sectors you know",
      examplesNote: "Curated well-known tickers by sector. Examples to explore \u2014 not buy or sell advice.",
      emptyExamples: "Pick at least one sector to see examples.",
      mifid: "General information. Not personalized advice or an investment service (MiFID II / Spanish Law 6/2023). The publisher is not registered with the CNMV as an investment firm.",
      none: "Not selected",
      analyze: "Analyze"
    }
  };
  function t(k) { return (T[lang()] || T.es)[k]; }

  function render() {
    var p = loadProfile();
    root.innerHTML = "";
    var lead = document.createElement("p");
    lead.className = "text-sm leading-relaxed text-mute";
    lead.textContent = t("lead");
    root.appendChild(lead);

    var form = document.createElement("form");
    form.className = "mt-6 space-y-5";
    form.setAttribute("novalidate", "novalidate");

    // age band
    var g1 = document.createElement("div");
    g1.appendChild(Object.assign(document.createElement("label"), { className: "block font-sans text-xs font-semibold uppercase tracking-wide text-dim", textContent: t("ageBand") }));
    var sel = document.createElement("select");
    sel.id = "pf-age-band";
    sel.className = "atm-input mt-2 w-full max-w-md rounded-xl px-3 py-2.5 font-sans text-sm text-ink";
    var opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = t("none");
    sel.appendChild(opt0);
    AGE_BANDS.forEach(function (b) {
      var o = document.createElement("option");
      o.value = b.id;
      o.textContent = lang() === "en" ? b.en : b.es;
      if (p.ageBand === b.id) o.selected = true;
      sel.appendChild(o);
    });
    g1.appendChild(sel);
    form.appendChild(g1);

    var g1b = document.createElement("div");
    g1b.appendChild(Object.assign(document.createElement("label"), { className: "block font-sans text-xs font-semibold uppercase tracking-wide text-dim", htmlFor: "pf-age", textContent: t("ageExact") }));
    var ageIn = document.createElement("input");
    ageIn.id = "pf-age";
    ageIn.type = "number";
    ageIn.min = "16";
    ageIn.max = "110";
    ageIn.inputMode = "numeric";
    ageIn.className = "atm-input mt-2 w-28 rounded-xl px-3 py-2.5 font-mono text-sm text-ink";
    if (p.age != null) ageIn.value = String(p.age);
    g1b.appendChild(ageIn);
    form.appendChild(g1b);

    var g2 = document.createElement("div");
    g2.appendChild(Object.assign(document.createElement("label"), { className: "block font-sans text-xs font-semibold uppercase tracking-wide text-dim", htmlFor: "pf-country", textContent: t("country") }));
    var country = document.createElement("input");
    country.id = "pf-country";
    country.type = "text";
    country.autocomplete = "country-name";
    country.maxLength = 80;
    country.placeholder = t("countryPh");
    country.className = "atm-input mt-2 w-full max-w-md rounded-xl px-3 py-2.5 font-sans text-sm text-ink";
    country.value = p.country || "";
    g2.appendChild(country);
    form.appendChild(g2);

    var g3 = document.createElement("div");
    g3.appendChild(Object.assign(document.createElement("p"), { className: "font-sans text-xs font-semibold uppercase tracking-wide text-dim", textContent: t("sectors") }));
    var chips = document.createElement("div");
    chips.className = "mt-3 flex flex-wrap gap-2";
    chips.id = "pf-sectors";
    SECTORS.forEach(function (s) {
      var on = p.sectors.indexOf(s.id) !== -1;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sector-chip" + (on ? " is-on" : "");
      b.setAttribute("data-sector", s.id);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.textContent = lang() === "en" ? s.en : s.es;
      b.addEventListener("click", function () {
        var pressed = b.getAttribute("aria-pressed") === "true";
        b.setAttribute("aria-pressed", pressed ? "false" : "true");
        b.classList.toggle("is-on", !pressed);
        renderExamples();
      });
      chips.appendChild(b);
    });
    g3.appendChild(chips);
    form.appendChild(g3);

    var actions = document.createElement("div");
    actions.className = "flex flex-wrap gap-2 items-center pt-2";
    var save = document.createElement("button");
    save.type = "submit";
    save.className = "rounded-full bg-pill px-4 py-2 font-sans text-xs font-semibold text-white transition-all hover:brightness-110";
    save.textContent = t("save");
    var clear = document.createElement("button");
    clear.type = "button";
    clear.className = "atm-btn rounded-full px-4 py-2 font-sans text-xs font-medium text-ink";
    clear.textContent = t("clear");
    var status = document.createElement("p");
    status.id = "pf-status";
    status.className = "w-full font-mono text-[11px] text-dim";
    status.setAttribute("role", "status");
    actions.appendChild(save);
    actions.appendChild(clear);
    actions.appendChild(status);
    form.appendChild(actions);

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var sectors = [];
      chips.querySelectorAll(".sector-chip[aria-pressed='true']").forEach(function (b) {
        sectors.push(b.getAttribute("data-sector"));
      });
      var ageVal = ageIn.value.trim() ? Number(ageIn.value) : null;
      if (ageVal != null && (!isFinite(ageVal) || ageVal < 16 || ageVal > 110)) ageVal = null;
      saveProfile({
        ageBand: sel.value,
        age: ageVal,
        country: country.value.trim(),
        sectors: sectors
      });
      status.textContent = t("saved");
      renderExamples();
    });
    clear.addEventListener("click", function () {
      saveProfile({ ageBand: "", age: null, country: "", sectors: [] });
      sel.value = "";
      ageIn.value = "";
      country.value = "";
      chips.querySelectorAll(".sector-chip").forEach(function (b) {
        b.setAttribute("aria-pressed", "false");
        b.classList.remove("is-on");
      });
      status.textContent = t("cleared");
      renderExamples();
    });

    root.appendChild(form);

    var ex = document.createElement("section");
    ex.className = "mt-10";
    ex.id = "pf-examples";
    root.appendChild(ex);

    var mifid = document.createElement("p");
    mifid.className = "mt-8 rounded-xl border border-line bg-elev px-4 py-3 font-sans text-xs leading-relaxed text-mute";
    mifid.textContent = t("mifid");
    root.appendChild(mifid);

    function renderExamples() {
      var sectors = [];
      chips.querySelectorAll(".sector-chip[aria-pressed='true']").forEach(function (b) {
        sectors.push(b.getAttribute("data-sector"));
      });
      ex.innerHTML = "";
      ex.appendChild(Object.assign(document.createElement("h2"), { className: "font-sans text-sm font-semibold text-ink", textContent: t("examplesTitle") }));
      ex.appendChild(Object.assign(document.createElement("p"), { className: "mt-2 font-mono text-[11px] text-dim", textContent: t("examplesNote") }));
      if (!sectors.length) {
        ex.appendChild(Object.assign(document.createElement("p"), { className: "mt-4 text-sm text-mute", textContent: t("emptyExamples") }));
        return;
      }
      var grid = document.createElement("div");
      grid.className = "mt-4 grid gap-3 sm:grid-cols-2";
      sectors.forEach(function (sid) {
        var list = SECTOR_EXAMPLES[sid] || [];
        var card = document.createElement("div");
        card.className = "atm-card rounded-2xl p-4";
        card.appendChild(Object.assign(document.createElement("p"), {
          className: "text-xs font-semibold uppercase tracking-wide text-accent",
          textContent: sectorLabel(sid, lang())
        }));
        var wrap = document.createElement("div");
        wrap.className = "mt-3 flex flex-wrap gap-2";
        list.forEach(function (row) {
          var a = document.createElement("a");
          a.href = "/?q=" + encodeURIComponent(row.s);
          a.className = "inline-flex items-center gap-1.5 rounded-full border border-line bg-bg px-2.5 py-1 font-mono text-xs text-ink no-underline hover:border-accent";
          a.innerHTML = "<span>" + row.s + "</span><span class=\"text-dim\">" + row.name + "</span>";
          a.setAttribute("aria-label", t("analyze") + " " + row.s);
          wrap.appendChild(a);
        });
        card.appendChild(wrap);
        grid.appendChild(card);
      });
      ex.appendChild(grid);
    }
    renderExamples();
  }

  render();
  document.addEventListener("invest:lang", render);
})();
