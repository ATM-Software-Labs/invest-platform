// Builds dist/worker.js (single ASCII-only ES module) from the sources in this folder.
// Usage: npm ci && TURNSTILE_SITEKEY=<site key> npm run build   (see ../README.md)
import fs from "fs";
import os from "os";
import path from "path";
import zlib from "zlib";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import * as esbuild from "esbuild";
import { head, topbar, footer, themeScript, setCompiledCss } from "./chrome-snippet.mjs";
import { PROSE, mungerIntro, mungerBody, modelosBody, glosarioBody, privBody, cookiesBody, subscribeInfo } from "./content.mjs";

const D = path.dirname(fileURLToPath(import.meta.url)); // web/public-worker/src
const ROOT = path.resolve(D, "..");
const OUT = path.join(ROOT, "dist");
fs.mkdirSync(OUT, { recursive: true });
const read = (f) => fs.readFileSync(D + "/" + f, "utf8").replace(/\r\n/g, "\n");
// Optional untracked file with build-time values (KEY=value per line), e.g. TURNSTILE_SITEKEY.
const localEnv = path.join(ROOT, "build.local.env");
if (fs.existsSync(localEnv)) for (const line of fs.readFileSync(localEnv, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
// Public Turnstile site key for invest.trujillomingorance.com (the secret stays in TURNSTILE_SECRET).
// Workers Builds has no build variables, so the live widget key is the default. Override with TURNSTILE_SITEKEY.
const TURNSTILE_SITEKEY = process.env.TURNSTILE_SITEKEY || "0x4AAAAAAFPPcyCR1BCpeR5_";
const ICON = fs.readFileSync(D + "/icon.png").toString("base64");
const homeJs = read("profile-shared.js") + "\n" + read("home-app.js");
const perfilJs = read("profile-shared.js") + "\n" + read("perfil-app.js");
const quoteShared = read("quote-shared.js");
const mungerJs = quoteShared + "\n" + read("munger-app.js");
const compareJs = quoteShared + "\n" + read("compare-app.js");
const subscribeJs = read("subscribe-app.js");
const minCache = new Map();
const minify = (js) => { if (!minCache.has(js)) minCache.set(js, esbuild.transformSync(js, { minify: true, target: "es2017", charset: "ascii" }).code.trim()); return minCache.get(js); };
const script = (js) => `<script>${minify(js)}</script>`;

const ARROW = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>`;
function card(href, eyebrowKey, eyebrow, titleKey, title, leadKey, lead, extra) {
  return `<a href="${href}" class="atm-card group rounded-2xl p-5 no-underline">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-semibold uppercase tracking-[0.14em] text-accent" data-i18n="${eyebrowKey}">${eyebrow}</p>
            <h2 class="mt-2 font-sans text-lg font-bold text-ink" data-i18n="${titleKey}">${title}</h2>
            <p class="mt-2 text-sm leading-relaxed text-mute" data-i18n="${leadKey}">${lead}</p>${extra || ""}
          </div>
          <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent transition-colors group-hover:bg-accent group-hover:text-white" aria-hidden="true">${ARROW}</span>
        </div>
      </a>`;
}

function subForm(id, opts) {
  opts = opts || {};
  return `<form id="${id}" class="sub-form" action="/api/subscribe" method="post" novalidate data-state="soon">
  <div class="sub-live space-y-3">
    <fieldset class="space-y-2">
      <legend class="mb-2 font-sans text-xs font-medium text-mute" data-i18n="subStreamsLegend">Listas</legend>
      <label class="stream-opt"><input type="checkbox" name="markets" value="1"/><span class="min-w-0"><span class="block font-sans text-sm font-semibold text-ink"><span data-i18n="subMarkets">Markets</span> <span class="font-mono text-[11px] font-normal text-dim" data-i18n="subMarketsFrom">desde markets@trujillomingorance.com</span></span><span class="mt-0.5 block font-sans text-xs leading-relaxed text-mute" data-i18n="subMarketsDesc">Actualizaciones de mercado en cada franja del d\u00eda: ma\u00f1ana 09:00, mediod\u00eda 15:00 y cierre 22:15 (hora de Madrid).</span></span></label>
      <label class="stream-opt"><input type="checkbox" name="invest" value="1" checked/><span class="min-w-0"><span class="block font-sans text-sm font-semibold text-ink"><span data-i18n="subInvest">INVEST</span> <span class="font-mono text-[11px] font-normal text-dim" data-i18n="subInvestFrom">desde invest@trujillomingorance.com</span></span><span class="mt-0.5 block font-sans text-xs leading-relaxed text-mute" data-i18n="subInvestDesc">Educaci\u00f3n, modelos mentales e ideas de inversi\u00f3n con fin educativo. No es asesoramiento.</span></span></label>
    </fieldset>
    <div>
      <label for="${id}-email" class="mb-1.5 block font-sans text-xs font-medium text-mute" data-i18n="subEmailLabel">Correo electr\u00f3nico</label>
      <input id="${id}-email" name="email" type="email" inputmode="email" autocomplete="email" maxlength="254" required placeholder="tu@correo.com" data-i18n="subEmailPh" class="atm-input w-full rounded-xl px-3 py-2.5 font-sans text-sm"/>
    </div>
    <div class="hp-field" aria-hidden="true"><label for="${id}-website">Web</label><input id="${id}-website" name="website" type="text" tabindex="-1" autocomplete="off"/></div>
    <label class="consent-row flex items-start gap-2 font-sans text-xs leading-relaxed text-mute"><input type="checkbox" name="consent" value="1"/><span><span data-i18n="subConsentText">Acepto recibir las listas marcadas y he le\u00eddo la</span> <a href="/privacidad/" class="text-accent hover:underline" data-i18n="subConsentLink">pol\u00edtica de privacidad</a>.</span></label>
    <div class="ts-slot min-h-[1px]"></div>
    <button type="submit" class="inline-flex items-center justify-center rounded-full bg-pill px-5 py-2.5 font-sans text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60" data-i18n="subBtn">Suscribirme</button>
  </div>
  <p class="sub-msg mt-3" role="status" aria-live="polite">Suscripci\u00f3n disponible pronto. Todav\u00eda no se recoge ning\u00fan correo.</p>
  <p class="mt-3 font-mono text-[11px] leading-relaxed text-dim" data-i18n="subFine">Informaci\u00f3n general y educativa, no es asesoramiento de inversi\u00f3n (MiFID II / Ley 6/2023). Baja en un clic en cada correo.</p>
</form>`;
}

const HASH_REDIRECT = `<script>if(location.hash==='#munger-help'){location.replace('/munger/');}</script>\n`;

function buildPages() {
  const homeHtml = `${head("INVEST \u00b7 Comparador de acciones, ETF y cripto con datos p\u00fablicos", "Consulta y compara acciones, ETF, \u00edndices y criptomonedas por ticker, nombre o ISIN: cotizaci\u00f3n, cifras 10-K de la SEC y checklist Munger. Informaci\u00f3n general, no es asesoramiento.", HASH_REDIRECT)}
<body class="min-h-screen bg-bg text-ink font-sans antialiased flex flex-col">
${topbar("#q", "Analizar", "/")}
<main class="flex-1">
  <div class="mx-auto max-w-content px-5 py-10 md:py-14">
    <p class="text-xs font-medium uppercase tracking-[0.16em] text-accent" data-i18n="heroEyebrow">Consulta</p>
    <h1 class="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-ink md:text-4xl" data-i18n="heroTitle">Analizar un activo con criterios medibles</h1>
    <p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-mute" data-i18n="heroLead">Precio de mercado y, cuando existen, cifras anuales de EE.&nbsp;UU. (SEC). Checklist Munger transparente. No es una recomendacion de compra ni de venta.</p>

    <form id="buscar" action="/api/quote" method="get" role="search" class="mt-8">
      <label for="q" class="mb-2 block font-sans text-xs font-medium text-mute" data-i18n="searchLabel">Ticker o simbolo</label>
      <div class="relative">
        <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-dim" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        </span>
        <input id="q" name="q" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" placeholder="Ticker, nombre o ISIN... p. ej. AAPL, Inditex" data-i18n="searchPh"
          class="atm-input w-full rounded-2xl py-3.5 pl-11 pr-28 font-mono text-sm shadow-sm"/>
        <button type="submit" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-pill px-3.5 py-2 font-sans text-xs font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] max-[390px]:px-2.5 max-[390px]:text-[11px]" data-i18n="searchBtn">Analizar</button>
      </div>
    </form>

    <div class="mt-4 flex flex-wrap items-center gap-2" id="filtros" role="toolbar" aria-label="Filtros">
      <button type="button" data-filter="todos" data-i18n="filterTodos" class="filter-btn filter-active rounded-full px-3 py-1.5 font-sans text-xs font-medium">Todos</button>
      <button type="button" data-filter="acciones" data-i18n="filterAcciones" class="filter-btn rounded-full px-3 py-1.5 font-sans text-xs font-medium">Acciones</button>
      <button type="button" data-filter="etfs" data-i18n="filterEtfs" class="filter-btn rounded-full px-3 py-1.5 font-sans text-xs font-medium">ETFs</button>
      <button type="button" data-filter="analizados" data-i18n="filterAnalizados" class="filter-btn rounded-full px-3 py-1.5 font-sans text-xs font-medium">Mas analizados</button>
      <button type="button" data-filter="favoritos" data-i18n="filterFavoritos" class="filter-btn rounded-full px-3 py-1.5 font-sans text-xs font-medium">Favoritos</button>
      <a href="/ensayos/redundancia-de-efectivo/" class="ml-auto inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 font-sans text-xs font-semibold text-accent no-underline transition-colors hover:bg-accent/20">
        <span data-i18n="essayChip">Ensayo</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
      </a>
    </div>

    <p class="mt-3 font-sans text-xs text-dim" data-i18n="disclaimer">Informacion general, no es una recomendacion personal ni un servicio de inversion.</p>
    <div id="estado" class="mt-5 hidden rounded-xl border border-line bg-elev px-4 py-3 font-sans text-sm text-mute fade-in" role="status" aria-live="polite"></div>

    <div id="resultado" class="mt-6 space-y-4" aria-live="polite"></div>

    <section class="mt-10">
      <div class="flex items-center justify-between gap-3">
        <h2 class="font-sans text-sm font-semibold text-ink" data-i18n="recentTitle">Recientes y listas</h2>
        <span class="font-mono text-[10px] uppercase tracking-wide text-dim" id="filtro-label">filtro: todos</span>
      </div>
      <div id="grid" class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"></div>
      <div id="empty-grid" class="mt-4 hidden rounded-2xl border border-dashed border-line bg-elev/50 px-5 py-8 text-center fade-in">
        <p id="empty-grid-text" class="font-sans text-sm text-mute" data-i18n="emptyGrid">Nada que mostrar con este filtro. Busca un ticker o crea una lista.</p>
      </div>
    </section>

    <section class="mt-8 flex flex-wrap gap-2 items-center">
      <label for="lista-nombre" class="sr-only" data-i18n="listNameLabel">Nombre de la lista</label>
      <input id="lista-nombre" type="text" maxlength="80" autocomplete="off" placeholder="Nombre de la lista" data-i18n="listPh"
        class="atm-input min-w-0 w-full min-[360px]:min-w-[12rem] flex-1 rounded-xl px-3 py-2 font-sans text-sm"/>
      <button id="crear-lista" type="button" class="atm-btn rounded-full px-3 py-2 font-sans text-xs font-medium text-ink" data-i18n="listCreate">Crear lista</button>
    </section>
    <div id="listas-panel" class="mt-4"></div>

    <section id="perfil-suggest" class="mt-10 hidden" aria-label="Perfil"></section>

    <div class="mt-12 grid gap-4 md:grid-cols-2">
      ${card("/munger/", "mungerEyebrow", "Checklist", "mungerTitle", "Que tan Munger es la accion", "mungerLead", "Criterios medibles a partir de cifras anuales: margen neto, margen FCF, efectivo frente a deuda. Sin puntuacion 1-10.")}
      ${card("/ensayos/redundancia-de-efectivo/", "essayKicker", "ENSAYO", "essayTitle", "Por que la redundancia de efectivo supera al apalancamiento", "essayLead", "Por que la holgura de caja supera al apalancamiento. LTCM como caso real.", `\n            <p class="mt-3 font-mono text-[11px] text-dim" data-i18n="essayRead">~6 min de lectura</p>`)}
      ${card("/modelos/", "cardModelsEyebrow", "Modelos", "cardModelsTitle", "Modelos mentales", "cardModelsLead", "Margen de seguridad, c\u00edrculo de competencia, inversi\u00f3n, coste de oportunidad, redundancia, tasas base e incentivos.")}
      ${card("/comparar/", "cardCompareEyebrow", "Comparar", "cardCompareTitle", "Comparar 2\u20133 activos", "cardCompareLead", "Cifras lado a lado tal como las devuelve la consulta. Lo que falta se muestra como \u00absin dato\u00bb.")}
      ${card("/glosario/", "cardGlossaryEyebrow", "Glosario", "cardGlossaryTitle", "T\u00e9rminos del panel", "cardGlossaryLead", "Qu\u00e9 significan FCF, margen neto, deuda LP, 10-K y el resto de cifras que muestra la consulta.")}
      ${card("/suscribirse/", "cardSubEyebrow", "Notas", "cardSubTitle", "Suscribirse", "cardSubLead", "Markets e INVEST, cada una con su casilla. Doble confirmaci\u00f3n y baja en un clic.")}
    </div>

    <section id="suscribirse" class="atm-card mt-10 rounded-2xl p-5 md:p-6" aria-labelledby="sub-home-title">
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-accent" data-i18n="subEyebrow">Notas por correo</p>
      <h2 id="sub-home-title" class="mt-2 font-sans text-lg font-bold text-ink" data-i18n="subTitle">Suscribirse a las notas</h2>
      <p class="mt-2 mb-4 text-sm leading-relaxed text-mute" data-i18n="subLead">Elige una lista o las dos. Recibir\u00e1s un correo para confirmar (doble opt-in); sin confirmaci\u00f3n no se guarda nada m\u00e1s de 48 horas.</p>
      ${subForm("sub-home")}
    </section>
  </div>
</main>
${footer()}
${themeScript()}
${script(homeJs)}
${script(subscribeJs)}
</body>
</html>`;

  function page({ title, description, active, crumb, crumbKey, h1, h1Key, lead, leadKey, inner, scripts, legalNote, esNote, date, wide }) {
    const note = legalNote
      ? `<p class="lang-only-note" data-i18n="legalNote">Legal text available in Spanish only.</p>`
      : esNote ? `<p class="lang-only-note" data-i18n="contentEsNote">Detailed text available in Spanish only.</p>` : "";
    return `${head(title, description)}
<body class="min-h-screen bg-bg text-ink font-sans antialiased flex flex-col">
${topbar("/", "Analizar", active)}
<main class="flex-1">
  <article class="mx-auto ${wide ? "max-w-content" : "max-w-3xl"} px-5 sm:px-6 py-12">
    <p class="text-sm text-dim"${crumbKey ? ` data-i18n="${crumbKey}"` : ""}>${crumb}</p>
    <h1 class="mt-3 text-3xl font-bold tracking-tight text-ink md:text-4xl"${h1Key ? ` data-i18n="${h1Key}"` : ""}>${h1}</h1>
    ${date ? `<p class="mt-3 text-sm text-dim">${date}</p>` : ""}
    ${lead ? `<p class="mt-3 max-w-2xl text-[15px] leading-relaxed text-mute"${leadKey ? ` data-i18n="${leadKey}"` : ""}>${lead}</p>` : ""}
    <div class="mt-6">${note}</div>
${inner}
  </article>
</main>
${footer()}
${themeScript()}
${(scripts || []).map(script).join("\n")}
</body>
</html>`;
  }
  const prose = (html) => `    <div class="${PROSE} mt-6">\n${html}\n    </div>`;

  const mungerTool = `
    <section class="atm-card mt-8 rounded-2xl p-5 md:p-6" aria-labelledby="munger-tool-t">
      <h2 id="munger-tool-t" class="font-sans text-base font-semibold text-ink" data-i18n="mungerToolTitle">Probar el checklist con un ticker</h2>
      <form id="munger-form" action="/munger/" method="get" role="search" class="mt-3 flex flex-col gap-2 min-[420px]:flex-row">
        <label for="mq" class="sr-only" data-i18n="searchLabel">Ticker o s\u00edmbolo</label>
        <input id="mq" name="q" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" placeholder="AAPL, MSFT, KO\u2026" class="atm-input min-w-0 flex-1 rounded-xl px-3 py-2.5 font-mono text-sm"/>
        <button type="submit" class="rounded-full bg-pill px-4 py-2.5 font-sans text-sm font-semibold text-white transition-all hover:brightness-110" data-i18n="mungerToolBtn">Ver checklist</button>
      </form>
      <div id="munger-result" class="mt-4" aria-live="polite"></div>
    </section>`;

  const compareInner = `
    <form id="cmp-form" action="/comparar/" method="get" class="atm-card mt-6 grid gap-3 rounded-2xl p-5 sm:grid-cols-3 md:p-6">
      <div><label for="ca" class="mb-1.5 block font-sans text-xs font-medium text-mute" data-i18n="compareA">Activo 1 (ticker, nombre o ISIN)</label><input id="ca" type="text" autocomplete="off" spellcheck="false" placeholder="AAPL" class="atm-input w-full rounded-xl px-3 py-2.5 font-mono text-sm"/></div>
      <div><label for="cb" class="mb-1.5 block font-sans text-xs font-medium text-mute" data-i18n="compareB">Activo 2</label><input id="cb" type="text" autocomplete="off" spellcheck="false" placeholder="Inditex" class="atm-input w-full rounded-xl px-3 py-2.5 font-mono text-sm"/></div>
      <div><label for="cc" class="mb-1.5 block font-sans text-xs font-medium text-mute" data-i18n="compareC">Activo 3 (opcional)</label><input id="cc" type="text" autocomplete="off" spellcheck="false" placeholder="IE00B4L5Y983" class="atm-input w-full rounded-xl px-3 py-2.5 font-mono text-sm"/></div>
      <div class="sm:col-span-3"><button type="submit" class="rounded-full bg-pill px-5 py-2.5 font-sans text-sm font-semibold text-white transition-all hover:brightness-110" data-i18n="compareBtn">Comparar</button></div>
    </form>
    <div id="cmp-result" class="mt-6" aria-live="polite"></div>
    <p class="mt-6 font-mono text-[11px] leading-relaxed text-dim" data-i18n="disclaimer">Informaci\u00f3n general, no es una recomendaci\u00f3n personal ni un servicio de inversi\u00f3n.</p>`;

  const pages = {
    "/": homeHtml,
    "/perfil/": `${head("Perfil inversor \u00b7 INVEST", "Perfil local estilo Peter Lynch: sectores que conoce. Solo en el navegador. No es asesoramiento.")}
<body class="min-h-screen bg-bg text-ink font-sans antialiased flex flex-col">
${topbar("/", "Analizar", "/perfil/")}
<main class="flex-1">
  <div class="mx-auto max-w-content px-5 py-10 md:py-14">
    <p class="text-sm text-dim" data-i18n="crumbProfile">INVEST \u203a PERFIL</p>
    <h1 class="mt-3 text-3xl font-bold tracking-tight text-ink md:text-4xl" data-i18n="profileH1">Perfil inversor</h1>
    <div id="perfil-app" class="mt-8"></div>
  </div>
</main>
${footer()}
${themeScript()}
${script(perfilJs)}
</body>
</html>`,
    "/munger/": page({
      title: "Checklist Munger \u00b7 INVEST", description: "C\u00f3mo se calcula el checklist Munger de INVEST a partir de cifras 10-K de la SEC: margen neto, margen FCF y efectivo frente a deuda. L\u00edmites y aviso.",
      active: "/munger/", crumb: "INVEST \u203a CHECKLIST", crumbKey: "crumbMunger", h1: "Checklist Munger", h1Key: "mungerH1", esNote: true,
      inner: prose(mungerIntro) + mungerTool + prose(mungerBody), scripts: [mungerJs],
    }),
    "/modelos/": page({
      title: "Modelos mentales \u00b7 INVEST", description: "Margen de seguridad, c\u00edrculo de competencia, inversi\u00f3n, coste de oportunidad, redundancia, tasas base e incentivos. Textos educativos.",
      active: "/modelos/", crumb: "INVEST \u203a MODELOS", crumbKey: "crumbModels", h1: "Modelos mentales", h1Key: "modelsH1", esNote: true, inner: prose(modelosBody),
    }),
    "/glosario/": page({
      title: "Glosario \u00b7 INVEST", description: "Qu\u00e9 significan FCF, margen neto, deuda a largo plazo, 10-K, XBRL y el resto de t\u00e9rminos del panel de consulta.",
      active: "/glosario/", crumb: "INVEST \u203a GLOSARIO", crumbKey: "crumbGlossary", h1: "Glosario", h1Key: "glossaryH1", esNote: true, inner: prose(glosarioBody),
    }),
    "/comparar/": page({
      title: "Comparador de activos: acciones, ETF y cripto \u00b7 INVEST", description: "Compara 2 o 3 activos lado a lado por ticker, nombre o ISIN (acciones, ETF, \u00edndices, cripto): precio, m\u00e1rgenes y flujo de caja 10-K. Sin ranking ni recomendaciones.",
      active: "/comparar/", crumb: "INVEST \u203a COMPARAR", crumbKey: "crumbCompare", h1: "Comparador de activos", h1Key: "compareH1", wide: true,
      lead: "Cifras lado a lado tal como las devuelve la consulta. Lo que falta se muestra como \u00absin dato\u00bb.", leadKey: "cardCompareLead",
      inner: compareInner, scripts: [compareJs],
    }),
    "/suscribirse/": page({
      title: "Suscribirse \u00b7 INVEST", description: "Suscripci\u00f3n opcional a dos listas: Markets (franjas del d\u00eda) e INVEST (educaci\u00f3n y modelos mentales). Doble opt-in y baja en un clic.",
      active: "/suscribirse/", crumb: "INVEST \u203a SUSCRIPCI\u00d3N", crumbKey: "crumbSubscribe", h1: "Suscribirse a las notas", h1Key: "subscribeH1",
      lead: "Elige una lista o las dos. Recibir\u00e1s un correo para confirmar (doble opt-in); sin confirmaci\u00f3n no se guarda nada m\u00e1s de 48 horas.", leadKey: "subLead",
      inner: `    <section class="atm-card mt-6 rounded-2xl p-5 md:p-6" aria-label="Formulario">${subForm("sub-page")}</section>\n` + prose(subscribeInfo), scripts: [subscribeJs],
    }),
    "/confirmado/": page({
      title: "Suscripci\u00f3n confirmada \u00b7 INVEST", description: "Suscripci\u00f3n confirmada.", active: "/suscribirse/",
      crumb: "INVEST \u203a SUSCRIPCI\u00d3N", crumbKey: "crumbSubscribe", h1: "Gracias, suscripci\u00f3n confirmada",
      inner: prose(`<p>Tu direcci\u00f3n ya est\u00e1 en las listas que marcaste. Cada correo incluye un enlace para darte de baja o cambiar de lista.</p><p><em>English:</em> your subscription is confirmed. Every email includes a link to unsubscribe or change lists.</p><p><a href="/">Volver a INVEST</a> \u00b7 <a href="/modelos/">Modelos mentales</a></p>`),
    }),
    "/aviso-legal/": page({ title: "Aviso legal \u00b7 INVEST", description: "Informacion societaria y descargo de responsabilidad de invest.trujillomingorance.com.", crumb: "INVEST \u203a CUMPLIMIENTO", crumbKey: "crumbCompliance", h1: "Aviso legal", date: "Ultima actualizacion: 20 de septiembre de 2026", legalNote: true, inner: prose(avisoBody) }),
    "/privacidad/": page({ title: "Privacidad \u00b7 INVEST", description: "Informacion sobre el tratamiento de datos personales en invest.trujillomingorance.com.", crumb: "INVEST \u203a CUMPLIMIENTO", crumbKey: "crumbCompliance", h1: "Politica de privacidad", date: "\u00daltima actualizaci\u00f3n: 6 de octubre de 2026", legalNote: true, inner: prose(privBody) }),
    "/cookies/": page({ title: "Cookies \u00b7 INVEST", description: "Informacion sobre cookies y almacenamiento local de invest.trujillomingorance.com.", crumb: "INVEST \u203a CUMPLIMIENTO", crumbKey: "crumbCompliance", h1: "Cookies y almacenamiento", date: "\u00daltima actualizaci\u00f3n: 6 de octubre de 2026", legalNote: true, inner: prose(cookiesBody) }),
    "/ensayos/redundancia-de-efectivo/": page({
      title: "Por que la redundancia de efectivo supera al apalancamiento \u00b7 INVEST", description: "Ensayo sobre redundancia de efectivo, apalancamiento y riesgo de ruina. Informacion general, no una recomendacion.",
      active: "/ensayos/redundancia-de-efectivo/", crumb: "INVEST \u203a ENSAYO", crumbKey: "crumbEssay", h1: "Por que la redundancia de efectivo supera al apalancamiento", h1Key: "essayH1",
      inner: prose(essayIntro + essayBodyEs + essayBodyEn),
    }),
  };
  return pages;
}

const avisoBody = read("aviso-body.html");

const essayRaw = read("c-essay.html");
const sections = [];
{
  const re = new RegExp('<section[^>]*aria-labelledby="([^"]+)"[\\s\\S]*?<h2[^>]*>([^<]+)</h2>([\\s\\S]*?)</section>', 'g');
  let m;
  while ((m = re.exec(essayRaw))) sections.push({ id: m[1], title: m[2], body: m[3].trim() });
}
let essayBodyEs = "";
for (const s of sections) {
  const isCase = s.id === "caso";
  essayBodyEs += `<div class="callout" data-lang-block="es">
  <div class="flex items-center gap-2">
    <span class="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">${isCase ? "Caso" : "Modelo"}</span>
    <h2 id="${s.id}" class="!mt-0 text-base font-semibold text-ink">${s.title}</h2>
  </div>
  <div class="mt-3 space-y-3 text-mute">${s.body.replace(/class="[^"]*"/g, "")}</div>
</div>\n`;
}
const essayBodyEn = read("essay-en.html");
const essayIntro = `<p class="flex flex-wrap gap-2"><span class="rounded-full border border-line bg-elev px-2.5 py-0.5 text-xs text-mute">Modelos mentales</span><span class="rounded-full border border-line bg-elev px-2.5 py-0.5 text-xs text-mute">Riesgo de ruina</span></p>`;

// --- Pass 1: render pages without CSS, use them + JS as Tailwind content ---
setCompiledCss("");
let pages = buildPages();
const twDir = fs.mkdtempSync(path.join(os.tmpdir(), "invest-tw-")); // scratch dir, removed at the end
fs.mkdirSync(twDir + "/content", { recursive: true });
fs.copyFileSync(D + "/input.css", twDir + "/input.css");
for (const k of Object.keys(pages)) fs.writeFileSync(twDir + "/content/page" + k.replace(/\//g, "_") + ".html", pages[k]);
fs.writeFileSync(twDir + "/tailwind.config.js", `module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['${twDir}/content/*.html', '${D}/*.js', '${D}/chrome-snippet.mjs', '${D}/content.mjs', '${D}/essay-en.html'],
  safelist: ['hidden','sr-only','fade-in','filter-active','status-error','badge-pass','badge-fail','badge-unknown','status-badge','star-btn','is-on','change-up','change-down','change-flat','count-pill','is-null','is-ok','is-err',
    { pattern: /^(bg|text|border|ring)-(accent|pill|ink|mute|dim|bg|elev|card|line|white)(\\/\\d+)?$/ }],
  theme: { extend: {
    colors: { bg: 'var(--bg)', elev: 'var(--elev)', card: 'var(--card)', 'card-hover': 'var(--card-hover)', line: 'var(--line-solid)', accent: 'var(--accent)', pill: 'var(--pill)', ink: 'var(--text)', mute: 'var(--muted)', dim: 'var(--dim)' },
    fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'], mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'] },
    maxWidth: { content: '56rem', prose: '48rem' }
  } }
};
`);
const twBin = path.join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "tailwindcss.cmd" : "tailwindcss");
execFileSync(twBin, ["-c", twDir + "/tailwind.config.js", "-i", twDir + "/input.css", "-o", twDir + "/app.css", "--minify"], { cwd: twDir, stdio: "pipe", shell: process.platform === "win32" });
let compiled = fs.readFileSync(twDir + "/app.css", "utf8").replace(/[^\x00-\x7F]/g, (ch) => "\\" + ch.codePointAt(0).toString(16) + " ");
fs.writeFileSync(OUT + "/app.css", compiled);
console.log("tailwind css bytes", compiled.length);

// --- Pass 2: real pages with inlined compiled CSS ---
setCompiledCss(compiled);
pages = buildPages();
for (const f of fs.readdirSync(OUT)) if (/^page_.*\.html$/.test(f)) fs.unlinkSync(OUT + "/" + f);
for (const k of Object.keys(pages)) fs.writeFileSync(OUT + "/page" + k.replace(/\//g, "_") + ".html", pages[k]);

// --- Worker assembly ---
const asciiJsonTop = (str) => JSON.stringify(str).replace(/[\u007f-\uffff]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
let api = read("worker-quote.js").replace(/"cache-control":\s*"no-store"\s*}\s*}\);\n}\nasync function html/, (m) => m);
api = api.replace(/"cache-control":"no-store"/g, '"cache-control":"no-cache, max-age=0, must-revalidate"');
let sub = read("worker-sub.js").replace("__TURNSTILE_SITEKEY__", TURNSTILE_SITEKEY);
const cssRoute = `if (url.pathname === "/assets/app.css") {
      return new Response(BLOCKS[0].replace(/^<style>/, "").replace(/<\\/style>$/, ""), { headers: { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=31536000, immutable" } });
    }`;
if (!sub.includes("/*__CSS_ROUTE__*/")) throw new Error("css marker missing");
sub = sub.replace("/*__CSS_ROUTE__*/", cssRoute);

// Dedupe blocks shared by several pages (style, theme script, header, footer, inline scripts): stored once, injected at request time.
const asciiJson = (str) => JSON.stringify(str).replace(/[\u007f-\uffff]/g, (c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
const candidates = [pages["/"].match(/<style>[\s\S]*?<\/style>/)[0], themeScript(), footer(), topbar("#q", "Analizar"), topbar("/", "Analizar")];
for (const h of Object.values(pages)) for (const m of h.match(/<script>[\s\S]*?<\/script>/g) || []) if (m.length > 2000 && !candidates.includes(m)) candidates.push(m);
const BLOCKS = [];
const dedup = {};
for (const [k, h0] of Object.entries(pages)) dedup[k] = h0;
for (const blk of candidates) {
  const users = Object.keys(dedup).filter((k) => dedup[k].includes(blk));
  if (users.length < 1) continue;
  const idx = BLOCKS.length; BLOCKS.push(blk);
  for (const k of users) dedup[k] = dedup[k].split(blk).join("<!--B" + idx + "-->");
}
const htmlFn = `async function html(page, path) {
  let text = page.replace(/<!--B(\\d+)-->/g, function (m, i) { return BLOCKS[+i]; });
  if (path) text = text.split('<a href="' + path + '" data-i18n="nav').join('<a href="' + path + '" aria-current="page" data-i18n="nav');
  text = withSeo(text, path || "/");
  return new Response(text, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache, max-age=0, must-revalidate", "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin" } });
}`;
const hs = api.indexOf("async function html(");
const he = api.indexOf("\n}\n", hs) + 3;
if (hs < 0 || he < 3) throw new Error("html() not found");
api = api.slice(0, hs) + htmlFn + "\n" + api.slice(he);
let out = "const PAGES = {\n" + Object.entries(dedup).map(([p, h]) => `${JSON.stringify(p)}:${asciiJson(h)}`).join(",\n") + "\n};\n";
out += "const BLOCKS = [\n" + BLOCKS.map(asciiJson).join(",\n") + "\n];\n";
out += `const ICON = "${ICON}";\n` + api + "\n" + sub;
for (let i = 0; i < out.length; i++) if (out.charCodeAt(i) > 127) throw new Error("non-ascii at " + i + " ctx=" + JSON.stringify(out.slice(i - 40, i + 10)));
fs.writeFileSync(OUT + "/worker.js", out);
fs.rmSync(twDir, { recursive: true, force: true });
console.log("wrote", path.relative(process.cwd(), OUT + "/worker.js"), out.length, "bytes");
console.log("worker bytes", out.length);
console.log("pages", Object.fromEntries(Object.entries(pages).map(([k, v]) => [k, v.length])));
console.log("munger-help refs:", Object.entries(pages).filter(([k, v]) => v.includes("munger-help")).map(([k, v]) => k + ":" + (v.match(/munger-help/g) || []).length));
