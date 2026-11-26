import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AFFILIATE_DISCLOSURE, RISK_WARNING, ETORO_WIDGET_SLOT_ID } from "../../../shared/etoro.js";

const assetV = (() => {
  try {
    return fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../public/asset-version.txt"), "utf8").trim() || "1";
  } catch {
    return "1";
  }
})();

const TW_CONFIG = `
tailwind.config = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        elev: 'var(--elev)',
        card: 'var(--card)',
        'card-hover': 'var(--card-hover)',
        line: 'var(--line-solid)',
        accent: 'var(--accent)',
        pill: 'var(--pill)',
        ink: 'var(--text)',
        mute: 'var(--muted)',
        dim: 'var(--dim)'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace']
      },
      maxWidth: { content: '56rem', prose: '48rem' }
    }
  }
};
`.trim();

let COMPILED_CSS = "";
function setCompiledCss(css) { COMPILED_CSS = css || ""; }

const SHARED_CSS = `
  html,body{background:var(--bg);color:var(--text);transition:background-color .2s ease,color .2s ease}
  :root,[data-theme="dark"]{
    color-scheme:dark;
    --bg:#0b0f14;--elev:#11161d;--card:#11161d;--card-hover:#171d26;
    --text:#f8fafc;--muted:#94a3b8;--dim:#8291a7;
    --accent:#3b82f6;--pill:#2563eb;
    --line:rgba(255,255,255,.08);--line-solid:#1e293b;
    --header:rgba(11,15,20,.92);--btn-border:rgba(255,255,255,.1);
    --shadow:0 8px 30px rgba(0,0,0,.35)
  }
  [data-theme="light"]{
    color-scheme:light;
    --bg:#ffffff;--elev:#f8fafc;--card:#ffffff;--card-hover:#f1f5f9;
    --text:#0f172a;--muted:#334155;--dim:#64748b;
    --accent:#2563eb;--pill:#1d4ed8;
    --line:rgba(15,23,42,.1);--line-solid:#e2e8f0;
    --header:rgba(255,255,255,.92);--btn-border:rgba(15,23,42,.12);
    --shadow:0 8px 30px rgba(15,23,42,.08)
  }
  .atm-top{background:var(--header);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-color:var(--btn-border)!important;transition:background-color .2s ease,border-color .2s ease}
  .atm-btn{border:1px solid var(--btn-border);background:var(--elev);color:var(--muted);transition:border-color .15s ease,color .15s ease,background-color .15s ease,transform .15s ease}
  .atm-btn:hover{border-color:var(--accent);color:var(--text)}
  .atm-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  .atm-card{background:var(--elev);border:1px solid var(--btn-border);transition:border-color .2s ease,background-color .2s ease,box-shadow .2s ease,transform .15s ease}
  .atm-card:hover{border-color:color-mix(in srgb,var(--accent) 45%,transparent);background:var(--card-hover);box-shadow:var(--shadow)}
  .atm-input{background:var(--elev);border:1px solid var(--btn-border);color:var(--text);transition:border-color .15s ease,box-shadow .15s ease}
  .atm-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 30%,transparent);outline:none}
  .atm-input::placeholder{color:var(--dim)}
  .filter-btn{border:1px solid var(--btn-border);background:var(--elev);color:var(--muted);transition:background-color .15s ease,color .15s ease,border-color .15s ease,transform .12s ease}
  .filter-btn:hover{color:var(--text);border-color:color-mix(in srgb,var(--accent) 40%,var(--btn-border))}
  .filter-btn.filter-active{background:var(--pill);color:#fff;border-color:var(--pill)}
  .lang-menu{position:absolute;right:0;top:calc(100% + 6px);min-width:9.5rem;border:1px solid var(--btn-border);background:var(--card);border-radius:.75rem;box-shadow:var(--shadow);padding:.35rem;z-index:50;opacity:0;transform:translateY(-4px);pointer-events:none;transition:opacity .15s ease,transform .15s ease}
  .lang-menu.open{opacity:1;transform:translateY(0);pointer-events:auto}
  .lang-option{display:flex;width:100%;align-items:center;gap:.5rem;border:0;background:transparent;color:var(--text);border-radius:.5rem;padding:.45rem .6rem;font-size:.75rem;cursor:pointer;transition:background-color .12s ease}
  .lang-option:hover,.lang-option[aria-selected="true"]{background:color-mix(in srgb,var(--accent) 12%,transparent)}
  .icon-sun,.icon-moon{display:none}
  [data-theme="dark"] .icon-sun{display:block}
  [data-theme="light"] .icon-moon{display:block}
  .prose-atm code{overflow-wrap:anywhere;word-break:break-word}
  .prose-atm a,.consent-row a,.disclaimer-links a{color:var(--accent);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:2px;transition:color .15s ease}
  .prose-atm a:hover{text-decoration:underline;filter:brightness(1.1)}
  .callout{background:color-mix(in srgb,var(--elev) 85%,transparent);border:1px solid var(--line-solid);border-radius:.75rem;padding:1.25rem}
  details > summary{list-style:none}
  details > summary::-webkit-details-marker{display:none}
  .fade-in{animation:fadeIn .25s ease}
  @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
  html{scroll-behavior:smooth;scroll-padding-top:5.5rem}
  [id]{scroll-margin-top:7rem}
  .atm-subnav{display:flex;gap:.25rem;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
  .atm-subnav::-webkit-scrollbar{display:none}
  .atm-subnav a{flex-shrink:0;color:var(--muted);text-decoration:none;font-size:.75rem;font-weight:500;padding:.4rem .65rem;border-radius:.5rem;border:1px solid transparent;transition:color .15s ease,background-color .15s ease,border-color .15s ease;white-space:nowrap}
  .atm-subnav a:hover{color:var(--text);background:var(--elev)}
  .atm-subnav a[aria-current="page"]{color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent);border-color:color-mix(in srgb,var(--accent) 30%,transparent);font-weight:600}
  .atm-sub-card{background:var(--elev);border:1px solid var(--btn-border)}
  .stream-opt{display:flex;gap:.75rem;align-items:flex-start;border:1px solid var(--btn-border);background:var(--bg);border-radius:.85rem;padding:.75rem .85rem;cursor:pointer;transition:border-color .15s ease,background-color .15s ease}
  .stream-opt:hover{border-color:color-mix(in srgb,var(--accent) 45%,var(--btn-border))}
  .stream-opt:has(input:checked){border-color:color-mix(in srgb,var(--accent) 55%,transparent);background:color-mix(in srgb,var(--accent) 8%,var(--bg))}
  .stream-opt input,.consent-row input{margin-top:.2rem;accent-color:var(--pill);width:1rem;height:1rem;flex-shrink:0}
  .hp-field{position:absolute!important;left:-10000px!important;width:1px;height:1px;overflow:hidden}
  .sub-msg{border:1px solid var(--line-solid);background:var(--bg);color:var(--muted);border-radius:.75rem;padding:.65rem .85rem;font-size:.8rem;line-height:1.5}
  .sub-msg.is-ok{border-color:color-mix(in srgb,var(--accent) 45%,transparent);color:var(--text)}
  .sub-msg.is-err{border-color:#94a3b8;color:var(--text)}
  .sub-form[data-state="soon"] .sub-live{opacity:.55;pointer-events:none}
  .cmp-table{width:100%;border-collapse:separate;border-spacing:0;font-size:.8rem}
  .cmp-table th,.cmp-table td{padding:.6rem .7rem;border-bottom:1px solid var(--line-solid);text-align:left;vertical-align:top}
  .cmp-table thead th{color:var(--text);font-weight:600;background:var(--elev);position:sticky;top:0}
  .cmp-table tbody th{color:var(--muted);font-weight:500;white-space:nowrap}
  .cmp-table td{color:var(--text);font-family:'IBM Plex Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums}
  .cmp-table td.is-null{color:var(--dim);font-style:italic}
  .term dt{color:var(--text);font-weight:600}
  .atm-brand-mark{box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 35%,transparent),inset 0 1px 0 rgba(255,255,255,.12)}
  .atm-brand-sub{font-size:.65rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);line-height:1}
  .atm-actions{display:flex;align-items:center;gap:.5rem;flex-shrink:0}
  @media (max-width:420px){
    .atm-brand-sub{display:none}
    .atm-actions{gap:.35rem}
    #lang-code{display:none}
    #cta-btn{padding:.4rem .75rem;font-size:.7rem}
  }
  .atm-foot{background:var(--elev);border-top:1px solid var(--line-solid)}
  .atm-foot-legal{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem .75rem}
  .atm-foot-legal a{color:var(--accent);text-decoration:none;font-weight:500;transition:color .15s ease,opacity .15s ease}
  .atm-foot-legal a:hover{text-decoration:underline;filter:brightness(1.1)}
  .atm-foot-sep{color:var(--dim);opacity:.5;user-select:none}
  .atm-foot-notice{margin-top:1rem;padding:.85rem 1rem;border-radius:.75rem;border:1px solid var(--line-solid);background:color-mix(in srgb,var(--bg) 70%,var(--elev));color:var(--muted);font-size:.8rem;line-height:1.55}
  .atm-foot-notice strong{color:var(--text);font-weight:600}
  [data-theme="light"] .atm-foot{background:#f8fafc}
  [data-theme="light"] .atm-foot-notice{background:#fff;border-color:#e2e8f0}
  /* ATM Software Labs: shared network strip */
  /* ATM Software Labs: shared network footer strip (v1, 2026-10-20).
     Copy this file into each site; it has no runtime dependency on another origin.
     Theme-agnostic: inherits the site's text colour and background (works in light and dark). */
  .atm-net{border-top:1px solid color-mix(in srgb,currentColor 14%,transparent);margin-top:0;padding:18px 0 22px;font-family:var(--atm-font-sans,Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif);font-size:13px;line-height:1.5;text-align:left}
  .atm-net__in{box-sizing:border-box;width:min(70rem,calc(100% - 2.5rem));margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;gap:6px 20px}
  .atm-net a{color:inherit;text-decoration:none}
  .atm-net__brand{font-family:var(--atm-font-mono,"JetBrains Mono","IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:12px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;padding:6px 0}
  .atm-net__sites{display:flex;flex-wrap:wrap;gap:0 2px;margin:0;padding:0;list-style:none;flex:1 1 auto}
  .atm-net__sites a{display:inline-block;padding:6px 8px;border-radius:6px;color:color-mix(in srgb,currentColor 78%,transparent)}
  .atm-net__sites a:hover,.atm-net__sites a:focus-visible,.atm-net__sites a[aria-current]{color:inherit;background:color-mix(in srgb,currentColor 8%,transparent)}
  .atm-net__legal{margin:0;color:color-mix(in srgb,currentColor 78%,transparent);white-space:nowrap}
  .atm-net__legal a{text-decoration:underline;text-underline-offset:2px}
  .atm-net a:focus-visible{outline:2px solid currentColor;outline-offset:2px}
  @media (max-width:640px){.atm-net__in{flex-direction:column;align-items:flex-start}.atm-net__sites{margin-left:-8px}.atm-net__legal{white-space:normal}}
  @media print{.atm-net{display:none}}
  .atm-foot .atm-net{color:var(--text)}

  .status-error{border-color:#94a3b8;background:color-mix(in srgb,var(--elev) 80%,#64748b);color:var(--text)}
  .status-badge{display:inline-flex;align-items:center;border-radius:9999px;padding:.2rem .55rem;font-family:Inter,ui-sans-serif,system-ui,sans-serif;font-size:.65rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;border:1px solid transparent;line-height:1.2}
  .badge-pass{color:#1e3a8a;background:#dbeafe;border-color:#93c5fd}
  .badge-fail{color:#1e293b;background:#e2e8f0;border-color:#94a3b8}
  .badge-unknown{color:#334155;background:#f1f5f9;border-color:#cbd5e1}
  [data-theme="dark"] .badge-pass{color:#bfdbfe;background:rgba(37,99,235,.22);border-color:rgba(96,165,250,.45)}
  [data-theme="dark"] .badge-fail{color:#e2e8f0;background:rgba(148,163,184,.18);border-color:rgba(148,163,184,.4)}
  [data-theme="dark"] .badge-unknown{color:#cbd5e1;background:rgba(71,85,105,.28);border-color:rgba(148,163,184,.35)}
  .star-btn{border:1px solid var(--btn-border);background:var(--elev);color:var(--dim);transition:color .15s ease,border-color .15s ease,background-color .15s ease}
  .star-btn:hover{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 45%,var(--btn-border))}
  .star-btn.is-on{color:#a16207;background:#fef9c3;border-color:#fde047}
  .star-btn.is-on svg{fill:currentColor}
  [data-theme="dark"] .star-btn.is-on{color:#fde68a;background:rgba(202,138,4,.22);border-color:rgba(250,204,21,.45)}
  .change-up,.change-down,.change-flat{color:var(--text)}
  .count-pill{background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent);border:1px solid color-mix(in srgb,var(--accent) 35%,transparent)}
  .lang-only-note{display:none;margin:0 0 1rem;padding:.65rem .85rem;border-radius:.75rem;border:1px solid var(--line-solid);background:var(--elev);color:var(--muted);font-size:.8rem;line-height:1.45}
  html[lang="en"] .lang-only-note{display:block}
  html[lang="en"] [data-lang-block="es"]{display:none!important}
  html[lang="es"] [data-lang-block="en"]{display:none!important}
  .sector-chip{border:1px solid var(--btn-border);background:var(--elev);color:var(--muted);border-radius:9999px;padding:.4rem .75rem;font-size:.75rem;font-weight:500;cursor:pointer;transition:background-color .12s ease,color .12s ease,border-color .12s ease}
  .sector-chip:hover{color:var(--text);border-color:color-mix(in srgb,var(--accent) 40%,var(--btn-border))}
  .sector-chip.is-on,.sector-chip[aria-pressed="true"]{background:color-mix(in srgb,var(--accent) 16%,transparent);color:var(--accent);border-color:color-mix(in srgb,var(--accent) 45%,transparent);font-weight:600}
  .profile-match-tag{display:inline-flex;align-items:center;border-radius:9999px;padding:.2rem .55rem;font-size:.65rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#1e3a8a;background:#dbeafe;border:1px solid #93c5fd}
  [data-theme="dark"] .profile-match-tag{color:#bfdbfe;background:rgba(37,99,235,.22);border-color:rgba(96,165,250,.45)}
  html{overflow-x:clip}
  body{overflow-x:clip;min-width:0}
  .tabular-nums{font-variant-numeric:tabular-nums}
  @media (max-width:390px){
    .atm-input.pr-28{padding-right:5.5rem}
    #cta-btn{padding:.35rem .7rem}
  }
`.trim();

const NAV = [
  ["/", "navHome", "Consulta"],
  ["/munger/", "navMunger", "Checklist Munger"],
  ["/modelos/", "navModels", "Modelos mentales"],
  ["/comparar/", "navCompare", "Comparar"],
  ["/glosario/", "navGlossary", "Glosario"],
  ["/ensayos/redundancia-de-efectivo/", "navEssay", "Ensayo"],
  ["/perfil/", "navProfile", "Perfil"],
  ["/suscribirse/", "navSubscribe", "Suscribirse"],
];

function head(title, description, extraHead) {
  return `<!DOCTYPE html>
<html lang="es" data-theme="dark" class="dark">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<meta name="description" content="${description}"/>
<meta name="theme-color" content="#0b0f14" id="theme-color-meta"/>
<link rel="icon" href="/favicon.png"/>
<link rel="preload" href="/fonts/inter-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin=""/>
<link rel="preload" href="/fonts/inter-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin=""/>
<style>@font-face{font-family:"Inter";font-style:normal;font-weight:400;font-display:swap;src:url(/fonts/inter-latin-400-normal.woff2) format("woff2")}@font-face{font-family:"Inter";font-style:normal;font-weight:500;font-display:swap;src:url(/fonts/inter-latin-500-normal.woff2) format("woff2")}@font-face{font-family:"Inter";font-style:normal;font-weight:600;font-display:swap;src:url(/fonts/inter-latin-600-normal.woff2) format("woff2")}@font-face{font-family:"Inter";font-style:normal;font-weight:700;font-display:swap;src:url(/fonts/inter-latin-700-normal.woff2) format("woff2")}@font-face{font-family:"Inter";font-style:normal;font-weight:800;font-display:swap;src:url(/fonts/inter-latin-800-normal.woff2) format("woff2")}@font-face{font-family:"IBM Plex Mono";font-style:normal;font-weight:400;font-display:swap;src:url(/fonts/ibm-plex-mono-latin-400-normal.woff2) format("woff2")}@font-face{font-family:"IBM Plex Mono";font-style:normal;font-weight:500;font-display:swap;src:url(/fonts/ibm-plex-mono-latin-500-normal.woff2) format("woff2")}</style>
${extraHead || ""}<script>
(function(){try{document.documentElement.setAttribute('data-theme','dark');document.documentElement.classList.add('dark');var l=localStorage.getItem('invest.lang.v1');if(l==='en'||l==='es')document.documentElement.setAttribute('lang',l);}catch(e){}})();
</script>
<style>
${SHARED_CSS}
${COMPILED_CSS}
</style>
<link rel="stylesheet" href="/hub.css?v=${assetV}"/>
</head>`;
}

const HUB_TABS = [
  ["/", "Pulse (2 min)"],
  ["/charts", "Terminal Charts"],
  ["/cartera", "Cartera &amp; Tesis"],
  ["/ranking", "Ranking"],
  ["/comparar/", "Comparar"],
  ["/munger/", "Checklist"],
  ["/suscribirse/", "Notas"],
];

function tabOn(active, href) {
  if (!active) return false;
  const a = String(active).replace(/\/$/, "") || "/";
  const h = href.replace(/\/$/, "") || "/";
  if (h === "/") return a === "/";
  if (h === "/suscribirse" && (a === "/suscribirse" || a === "/confirmado")) return true;
  return a === h || a.startsWith(h + "/");
}

function topbar(_ctaHref, _ctaLabel, active) {
  const links = HUB_TABS.map(function (tab) {
    const href = tab[0];
    const label = tab[1];
    return '<a href="' + href + '"' + (tabOn(active, href) ? ' aria-current="page"' : "") + ">" + label + "</a>";
  }).join("");
  return `<p class="aff">${AFFILIATE_DISCLOSURE}</p>
<header class="top">
  <a class="brand" href="/">INVEST <span>Hub</span></a>
  <nav id="nav" aria-label="Secciones">${links}</nav>
  <form id="search-form" action="/" method="get" role="search">
    <label class="dim" for="hub-q">Buscar</label>
    <input id="hub-q" name="q" type="search" placeholder="Ticker, nombre o ISIN" autocomplete="off" enterkeyhint="search"/>
  </form>
</header>`;
}

function footer() {
  return `<footer class="foot">
  <div class="warn">${RISK_WARNING}</div>
  <div class="slot" id="${ETORO_WIDGET_SLOT_ID}" data-slot="etoro-risk-widget">
    <p class="slot-label">Espacio para el banner oficial de eToro Partners</p>
  </div>
  <p class="fine">
    <a href="/legal">Aviso legal y afiliación</a>
    · <a href="/aviso-legal/">Aviso clásico</a>
    · <a href="/privacidad/">Privacidad</a>
    · <a href="/cookies/">Cookies</a>
    · <a href="/suscribirse/">Notas</a>
    · <a href="/perfil/">Perfil</a>
  </p>
  <p class="fine">Información general y educativa. El simulador usa dinero virtual. No es asesoramiento financiero.</p>
</footer>`;
}

function themeScript() {
  return `<script>
(function(){
  var root=document.documentElement;
  var I18N={
    es:{
      ctaAnalizar:'Analizar',ctaEnsayo:'Leer ensayo',
      langTitle:'Idioma',themeTitle:'Cambiar tema',
      heroEyebrow:'Consulta',heroTitle:'Analizar un activo con criterios medibles',
      heroLead:'Precio de mercado y, cuando existen, cifras anuales de EE. UU. (SEC). Checklist Munger transparente. No es una recomendación de compra ni de venta.',
      searchPh:'Ticker, nombre o ISIN… p. ej. AAPL, Inditex',searchBtn:'Analizar',
      filterTodos:'Todos',filterAcciones:'Acciones',filterEtfs:'ETFs',filterAnalizados:'Más analizados',filterFavoritos:'Favoritos',
      essayChip:'Ensayo',disclaimer:'Información general, no es una recomendación personal ni un servicio de inversión.',
      recentTitle:'Recientes y listas',emptyGrid:'Nada que mostrar con este filtro. Busca un ticker o crea una lista.',
      listPh:'Nombre de la lista',listCreate:'Crear lista',
      mungerEyebrow:'Checklist',mungerTitle:'Qué tan Munger es la acción',mungerLead:'Criterios medibles a partir de cifras anuales: margen neto, margen FCF, efectivo frente a deuda. Sin puntuación 1–10.',
      essayEyebrow:'Ensayo',essayKicker:'ENSAYO',essayTitle:'Por qué la redundancia de efectivo supera al apalancamiento',essayLead:'Por qué la holgura de caja supera al apalancamiento. LTCM como caso real.',essayRead:'~6 min de lectura',searchLabel:'Ticker o símbolo',listNameLabel:'Nombre de la lista',legalNote:'Legal text available in Spanish only.',essayH1:'Por qué la redundancia de efectivo supera al apalancamiento',
      transparencyEyebrow:'Transparencia',mungerHelpTitle:'Checklist Munger — cómo se calcula',mungerHelpNote:'Sin puntuación 1–10. Solo criterios medibles a partir de cifras anuales reales.',transparencyLead:'El checklist solo usa campos que ya devolvemos cuando hay filings SEC (margen neto, margen de flujo de caja libre, efectivo vs deuda a largo plazo). Si faltan informes anuales de EE. UU., no se inventa afinidad ni veredicto.',
      foot1:'Esta web ofrece información general sobre sociedades cotizadas. No es una recomendación personalizada ni un servicio de inversión. No estamos registrados en la CNMV como empresa de servicios de inversión.',
      foot2:'INVEST es una página informativa de Trujillo Mingorance. Resume contexto de mercado a partir de información pública. No constituye asesoramiento en materia de inversión, oferta pública ni recomendación personalizada con arreglo a la Directiva 2014/65/UE (MiFID II) ni a la Ley 6/2023, de 17 de marzo, de los Mercados de Valores y de los Servicios de Inversión.',
      foot3:'Las rentabilidades pasadas no predicen rentabilidades futuras. Puede perderse la totalidad del capital. Los precios pueden ir retrasados y los datos, incompletos.',
      foot4:'El titular no está inscrito en el registro de empresas de servicios de inversión de la CNMV ni presta el servicio de asesoramiento del artículo 140 de la Ley 6/2023.',
      navLegal:'Aviso legal',navPrivacy:'Privacidad',navCookies:'Cookies',navProfile:'Perfil',crumbProfile:'INVEST › PERFIL',profileH1:'Perfil inversor',profileTitle:'Perfil inversor · INVEST',
      footBrand:'Información general · Trujillo Mingorance / ATM Labs',footCnmvLabel:'CNMV / MiFID II',
      navHome:'Consulta',navMunger:'Checklist Munger',navModels:'Modelos mentales',navCompare:'Comparar',navGlossary:'Glosario',navEssay:'Ensayo',navSubscribe:'Suscribirse',
      footSubTitle:'Suscribirse a las notas',footSubLead:'Dos listas opcionales: Markets (franjas del día) e INVEST (educación y modelos mentales). Doble confirmación, baja en un clic.',footSubBtn:'Suscribirse',netAria:'Sitios de ATM Software Labs',netGuides:'Guías',
      cardMungerEyebrow:'Checklist',cardModelsEyebrow:'Modelos',cardModelsTitle:'Modelos mentales',cardModelsLead:'Margen de seguridad, círculo de competencia, inversión, coste de oportunidad, redundancia, tasas base e incentivos.',
      cardGlossaryEyebrow:'Glosario',cardGlossaryTitle:'Términos del panel',cardGlossaryLead:'Qué significan FCF, margen neto, deuda LP, 10-K y el resto de cifras que muestra la consulta.',
      cardCompareEyebrow:'Comparar',cardCompareTitle:'Comparar 2–3 activos',cardCompareLead:'Cifras lado a lado tal como las devuelve la consulta. Lo que falta se muestra como «sin dato».',
      cardSubEyebrow:'Notas',cardSubTitle:'Suscribirse',cardSubLead:'Markets e INVEST, cada una con su casilla. Doble confirmación y baja en un clic.',
      subEyebrow:'Notas por correo',subTitle:'Suscribirse a las notas',subLead:'Elige una lista o las dos. Recibirás un correo para confirmar (doble opt-in); sin confirmación no se guarda nada más de 48 horas.',
      subMarketsLang:'Idioma de los correos Markets',subMarketsCountry:'País de residencia (tu índice primero)',subMarketsCountryNone:'Sin país (correo estándar)',subEmailLabel:'Correo electrónico',subEmailPh:'tu@correo.com',subMarkets:'Markets',subMarketsFrom:'desde markets@trujillomingorance.com',subMarketsDesc:'Actualizaciones de mercado en cada franja del día: mañana 09:00, mediodía 15:00 y cierre 22:45 (hora de Madrid).',
      subInvest:'INVEST',subInvestFrom:'desde invest@trujillomingorance.com',subInvestDesc:'Educación, modelos mentales e ideas de inversión con fin educativo. No es asesoramiento.',
      subConsentText:'Acepto recibir las listas marcadas y he leído la',subConsentLink:'política de privacidad',subBtn:'Suscribirme',subStreamsLegend:'Listas',subSoon:'Suscripción disponible pronto.',subFine:'Información general y educativa, no es asesoramiento de inversión (MiFID II / Ley 6/2023). Baja en un clic en cada correo.',
      crumbMunger:'INVEST › CHECKLIST',mungerH1:'Checklist Munger',crumbModels:'INVEST › MODELOS',modelsH1:'Modelos mentales',crumbGlossary:'INVEST › GLOSARIO',glossaryH1:'Glosario',crumbCompare:'INVEST › COMPARAR',compareH1:'Comparador de activos',crumbSubscribe:'INVEST › SUSCRIPCIÓN',nfH1:'Página no encontrada',nfLead:'Esta dirección no existe o se ha movido.',nfHome:'Volver a INVEST',nfModels:'Modelos mentales',subscribeH1:'Suscribirse a las notas',
      contentEsNote:'Detailed text available in Spanish only.',
      mungerToolTitle:'Probar el checklist con un ticker',mungerToolBtn:'Ver checklist',compareBtn:'Comparar',compareA:'Activo 1 (ticker, nombre o ISIN)',compareB:'Activo 2',compareC:'Activo 3 (opcional)',
      crumbCompliance:'INVEST › CUMPLIMIENTO',crumbEssay:'INVEST › ENSAYO'
    },
    en:{
      ctaAnalizar:'Analyze',ctaEnsayo:'Read essay',
      langTitle:'Language',themeTitle:'Toggle theme',
      heroEyebrow:'Lookup',heroTitle:'Analyze an asset with measurable criteria',
      heroLead:'Market price and, when available, U.S. annual figures (SEC). Transparent Munger checklist. Not a buy or sell recommendation.',
      searchPh:'Ticker, name or ISIN… e.g. AAPL, Inditex',searchBtn:'Analyze',
      filterTodos:'All',filterAcciones:'Stocks',filterEtfs:'ETFs',filterAnalizados:'Most analyzed',filterFavoritos:'Favorites',
      essayChip:'Essay',disclaimer:'General information — not personal advice or an investment service.',
      recentTitle:'Recent and lists',emptyGrid:'Nothing to show for this filter. Search a ticker or create a list.',
      listPh:'List name',listCreate:'Create list',
      mungerEyebrow:'Checklist',mungerTitle:'How Munger-like is the stock',mungerLead:'Measurable criteria from annual figures: net margin, FCF margin, cash vs debt. No 1–10 score.',
      essayEyebrow:'Essay',essayKicker:'ESSAY',essayTitle:'Why cash redundancy beats leverage',essayLead:'Why a cash cushion beats leverage. LTCM as a real case.',essayRead:'~6 min read',searchLabel:'Ticker or symbol',listNameLabel:'List name',legalNote:'Legal text available in Spanish only.',essayH1:'Why cash redundancy beats leverage',
      transparencyEyebrow:'Transparency',mungerHelpTitle:'Munger checklist — how it is calculated',mungerHelpNote:'No 1–10 score. Only measurable criteria from real annual figures.',transparencyLead:'The checklist only uses fields we already return when SEC filings exist. If U.S. annual reports are missing, we invent neither affinity nor verdict.',
      foot1:'This site offers general information on listed companies. It is not personalized advice or an investment service. We are not registered with the CNMV as an investment firm.',
      foot2:'INVEST is an informational page by Trujillo Mingorance. It summarizes market context from public information. It is not investment advice, a public offer, or personalized recommendation under MiFID II or Spanish Securities Market Law 6/2023.',
      foot3:'Past performance does not predict future results. You can lose all capital. Prices may be delayed and data incomplete.',
      foot4:'The publisher is not registered as an investment firm with the CNMV and does not provide the advisory service under article 140 of Law 6/2023.',
      navLegal:'Legal notice',navPrivacy:'Privacy',navCookies:'Cookies',navProfile:'Profile',crumbProfile:'INVEST › PROFILE',profileH1:'Investor profile',profileTitle:'Investor profile · INVEST',
      footBrand:'General information · Trujillo Mingorance / ATM Labs',footCnmvLabel:'CNMV / MiFID II',
      navHome:'Lookup',navMunger:'Munger checklist',navModels:'Mental models',navCompare:'Compare',navGlossary:'Glossary',navEssay:'Essay',navSubscribe:'Subscribe',
      footSubTitle:'Subscribe to the notes',footSubLead:'Two optional lists: Markets (daily time slots) and INVEST (education and mental models). Double opt-in, one-click unsubscribe.',footSubBtn:'Subscribe',netAria:'ATM Software Labs sites',netGuides:'Guides',
      cardMungerEyebrow:'Checklist',cardModelsEyebrow:'Models',cardModelsTitle:'Mental models',cardModelsLead:'Margin of safety, circle of competence, inversion, opportunity cost, redundancy, base rates and incentives.',
      cardGlossaryEyebrow:'Glossary',cardGlossaryTitle:'Panel terms',cardGlossaryLead:'What FCF, net margin, LT debt, 10-K and the other lookup figures mean.',
      cardCompareEyebrow:'Compare',cardCompareTitle:'Compare 2–3 assets',cardCompareLead:'Figures side by side exactly as the lookup returns them. Missing values show as “no data”.',
      cardSubEyebrow:'Notes',cardSubTitle:'Subscribe',cardSubLead:'Markets and INVEST, each with its own checkbox. Double opt-in and one-click unsubscribe.',
      subEyebrow:'Notes by email',subTitle:'Subscribe to the notes',subLead:'Pick one list or both. You will get an email to confirm (double opt-in); without confirmation nothing is kept beyond 48 hours.',
      subMarketsLang:'Markets email language',subMarketsCountry:'Country of residence (your index first)',subMarketsCountryNone:'No country (standard email)',subEmailLabel:'Email',subEmailPh:'you@email.com',subMarkets:'Markets',subMarketsFrom:'from markets@trujillomingorance.com',subMarketsDesc:'Market updates at each slot of the day: 09:00, 15:00 and 22:45 (Madrid time).',
      subInvest:'INVEST',subInvestFrom:'from invest@trujillomingorance.com',subInvestDesc:'Education, mental models and investment ideas for educational purposes. Not advice.',
      subConsentText:'I agree to receive the selected lists and have read the',subConsentLink:'privacy policy',subBtn:'Subscribe',subStreamsLegend:'Lists',subSoon:'Subscription available soon.',subFine:'General and educational information, not investment advice (MiFID II / Law 6/2023). One-click unsubscribe in every email.',
      crumbMunger:'INVEST › CHECKLIST',mungerH1:'Munger checklist',crumbModels:'INVEST › MODELS',modelsH1:'Mental models',crumbGlossary:'INVEST › GLOSSARY',glossaryH1:'Glossary',crumbCompare:'INVEST › COMPARE',compareH1:'Asset comparison',crumbSubscribe:'INVEST › SUBSCRIBE',nfH1:'Page not found',nfLead:'This address does not exist or has moved.',nfHome:'Back to INVEST',nfModels:'Mental models',subscribeH1:'Subscribe to the notes',
      contentEsNote:'Detailed text available in Spanish only.',
      mungerToolTitle:'Try the checklist with a ticker',mungerToolBtn:'Show checklist',compareBtn:'Compare',compareA:'Asset 1 (ticker, name or ISIN)',compareB:'Asset 2',compareC:'Asset 3 (optional)',
      crumbCompliance:'INVEST › COMPLIANCE',crumbEssay:'INVEST › ESSAY'
    }
  };
  function currentLang(){
    var l=root.getAttribute('lang')||'es';
    return (l==='en')?'en':'es';
  }
  function applyTheme(next){
    root.setAttribute('data-theme',next);
    root.classList.toggle('dark', next!=='light');
    var meta=document.getElementById('theme-color-meta');
    if(meta) meta.setAttribute('content', next==='light'?'#ffffff':'#0b0f14');
    try{localStorage.setItem('invest.theme.v1',next)}catch(e){}
  }
  function applyLang(lang){
    root.setAttribute('lang',lang);
    try{localStorage.setItem('invest.lang.v1',lang)}catch(e){}
    var pack=I18N[lang]||I18N.es;
    var flag=document.getElementById('lang-flag');
    var code=document.getElementById('lang-code');
    if(flag){var fo=document.querySelector('.lang-option[data-lang="'+lang+'"] img');if(fo)flag.src=fo.getAttribute('src');}
    if(code) code.textContent=lang.toUpperCase();
    document.querySelectorAll('.lang-option').forEach(function(opt){
      opt.setAttribute('aria-selected', opt.getAttribute('data-lang')===lang ? 'true':'false');
    });
    var langBtn=document.getElementById('lang-btn');
    if(langBtn){ langBtn.title=pack.langTitle; langBtn.setAttribute('aria-label',pack.langTitle); }
    var themeBtn=document.getElementById('theme-btn');
    if(themeBtn){ themeBtn.title=pack.themeTitle; themeBtn.setAttribute('aria-label',pack.themeTitle); }
    var netNav=document.getElementById('atm-net-nav');
    if(netNav&&pack.netAria){ netNav.setAttribute('aria-label',pack.netAria); }
    document.querySelectorAll('[data-i18n]').forEach(function(node){
      var key=node.getAttribute('data-i18n');
      if(!key||pack[key]==null) return;
      if(node.tagName==='INPUT'){ node.setAttribute('placeholder', pack[key]); return; }
      node.textContent=pack[key];
    });
    var cta=document.getElementById('cta-btn');
    if(cta){
      var href=cta.getAttribute('href')||'';
      if(href.indexOf('ensayos')!==-1) cta.textContent=pack.ctaEnsayo;
      else if(href==='/' || href==='#q') cta.textContent=pack.ctaAnalizar;
    }
    document.dispatchEvent(new CustomEvent('invest:lang',{detail:{lang:lang}}));
  }
  function closeLangMenu(){
    var menu=document.getElementById('lang-menu');
    var btn=document.getElementById('lang-btn');
    if(!menu||!btn) return;
    menu.classList.remove('open');
    menu.hidden=true;
    btn.setAttribute('aria-expanded','false');
  }
  function openLangMenu(){
    var menu=document.getElementById('lang-menu');
    var btn=document.getElementById('lang-btn');
    if(!menu||!btn) return;
    menu.hidden=false;
    requestAnimationFrame(function(){ menu.classList.add('open'); });
    btn.setAttribute('aria-expanded','true');
  }
  // boot theme already applied in head; sync class/meta
  try{ applyTheme('dark'); }catch(e){}
  try{
    var l=localStorage.getItem('invest.lang.v1');
    applyLang((l==='en'||l==='es')?l:currentLang());
  }catch(e){ applyLang('es'); }

  var themeBtn=document.getElementById('theme-btn');
  if(themeBtn) themeBtn.addEventListener('click',function(){
    var next=root.getAttribute('data-theme')==='light'?'dark':'light';
    applyTheme(next);
  });
  var langBtn=document.getElementById('lang-btn');
  var langMenu=document.getElementById('lang-menu');
  if(langBtn&&langMenu){
    langBtn.addEventListener('click',function(ev){
      ev.stopPropagation();
      if(langMenu.hidden) openLangMenu(); else closeLangMenu();
    });
    langMenu.addEventListener('click',function(ev){ ev.stopPropagation(); });
    document.querySelectorAll('.lang-option').forEach(function(opt){
      opt.addEventListener('click',function(){
        applyLang(opt.getAttribute('data-lang')||'es');
        closeLangMenu();
      });
    });
    document.addEventListener('click',closeLangMenu);
    document.addEventListener('keydown',function(ev){ if(ev.key==='Escape') closeLangMenu(); });
  }
  var cta=document.getElementById('cta-btn');
  if(cta && (cta.getAttribute('href')==='#q')){
    cta.addEventListener('click',function(ev){
      var q=document.getElementById('q');
      if(q){ ev.preventDefault(); q.focus(); q.scrollIntoView({behavior:'smooth',block:'center'}); }
    });
  }
})();
</script>`;
}

export { TW_CONFIG, SHARED_CSS, COMPILED_CSS, setCompiledCss, head, topbar, footer, themeScript };
