// ---- Subscription: Turnstile + honeypot + rate limit here; lists + double opt-in in Brevo ----
const SITE_ORIGIN = "https://invest.trujillomingorance.com";
const SITE_HOST = "invest.trujillomingorance.com";
const TURNSTILE_SITEKEY = "__TURNSTILE_SITEKEY__";
const BREVO_API = "https://api.brevo.com/v3";
const DOI_SENDER = { name: "INVEST", email: "invest@trujillomingorance.com" };
// Reply-To of the double opt-in template: Worker var DOI_REPLY_TO (only used when the template is created).
function doiReplyTo(env) {
  const v = env && typeof env.DOI_REPLY_TO === "string" ? env.DOI_REPLY_TO.trim() : "";
  return v || null;
}
const DOI_TEMPLATE_NAME = "INVEST - Confirmacion doble opt-in";
const DOI_REDIRECT = SITE_ORIGIN + "/confirmado/";
const BREVO_FOLDER_NAME = "Trujillo Mingorance";
const EMAIL_COOLDOWN = 900; // seconds between DOI mails to the same address
const RL_LIMIT = 5; // attempts per IP per hour
const STREAMS = {
  markets: { list: "Markets Digest", env: "BREVO_LIST_MARKETS" },
  invest: { list: "INVEST Notas", env: "BREVO_LIST_INVEST" }
};
const STREAM_KEYS = ["markets", "invest"];
const DISPOSABLE = ["mailinator.com", "guerrillamail.com", "10minutemail.com", "yopmail.com", "tempmail.com", "temp-mail.org", "trashmail.com", "sharklasers.com", "getnada.com", "dispostable.com", "maildrop.cc"];

function subEnabled(env) {
  return !!(env && env.SUBSCRIBERS && env.TURNSTILE_SECRET && env.BREVO_API_KEY);
}
async function sha256hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
}
function validEmail(raw) {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  if (e.length < 6 || e.length > 254) return null;
  const at = e.lastIndexOf("@");
  if (at < 1 || at !== e.indexOf("@")) return null;
  const local = e.slice(0, at), domain = e.slice(at + 1);
  if (local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return null;
  if (!/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+$/.test(local)) return null;
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(domain)) return null;
  for (const d of DISPOSABLE) if (domain === d || domain.endsWith("." + d)) return null;
  return e;
}
function cleanStreams(v) {
  const out = [];
  const truthy = function (x) { return x === true || x === "on" || x === "true" || x === "1"; };
  if (Array.isArray(v)) { for (const k of STREAM_KEYS) if (v.indexOf(k) !== -1) out.push(k); }
  else if (v && typeof v === "object") { for (const k of STREAM_KEYS) if (truthy(v[k])) out.push(k); }
  return out;
}
async function verifyTurnstile(secret, token, ip) {
  if (typeof token !== "string" || !token || token.length > 2048) return { ok: false, codes: ["missing-input-response"] };
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  form.append("idempotency_key", crypto.randomUUID());
  let data = null;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    data = await res.json();
  } catch (err) {
    return { ok: false, codes: ["siteverify-unreachable"] };
  }
  if (!data || data.success !== true) return { ok: false, codes: (data && data["error-codes"]) || ["invalid"] };
  if (data.hostname && data.hostname !== SITE_HOST) return { ok: false, codes: ["bad-hostname"] };
  if (data.action && data.action !== "subscribe") return { ok: false, codes: ["bad-action"] };
  return { ok: true, codes: [] };
}
async function rateLimited(env, ip) {
  const hour = Math.floor(Date.now() / 3600000);
  const key = "rl:" + (await sha256hex("invest-rl|" + (ip || "unknown"))).slice(0, 32) + ":" + hour;
  const cur = parseInt((await env.SUBSCRIBERS.get(key)) || "0", 10) || 0;
  if (cur >= RL_LIMIT) return true;
  await env.SUBSCRIBERS.put(key, String(cur + 1), { expirationTtl: 3600 });
  return false;
}

// ---- Brevo API (key only from the Worker secret BREVO_API_KEY) ----
async function bv(env, method, path, body) {
  const init = { method: method, headers: { "api-key": env.BREVO_API_KEY, "accept": "application/json" } };
  if (body !== undefined) { init.headers["content-type"] = "application/json"; init.body = JSON.stringify(body); }
  let res;
  try { res = await fetch(BREVO_API + path, init); } catch (err) { return { ok: false, status: 0, data: null }; }
  let data = null;
  try { const txt = await res.text(); data = txt ? JSON.parse(txt) : null; } catch (err) { data = null; }
  return { ok: res.ok, status: res.status, data: data };
}
async function brevoFolderId(env) {
  const cached = await env.SUBSCRIBERS.get("cfg:brevo:folder");
  if (cached) return parseInt(cached, 10);
  let id = null;
  const r = await bv(env, "GET", "/contacts/folders?limit=50&offset=0");
  const folders = r.ok && r.data && Array.isArray(r.data.folders) ? r.data.folders : [];
  for (const f of folders) if (f && f.name === BREVO_FOLDER_NAME) { id = f.id; break; }
  if (!id) {
    const c = await bv(env, "POST", "/contacts/folders", { name: BREVO_FOLDER_NAME });
    if (c.ok && c.data && c.data.id) id = c.data.id;
  }
  if (!id && folders.length && folders[0].id) id = folders[0].id;
  if (id) await env.SUBSCRIBERS.put("cfg:brevo:folder", String(id));
  return id;
}
async function brevoListId(env, key) {
  const def = STREAMS[key];
  if (env[def.env]) return parseInt(env[def.env], 10);
  const cacheKey = "cfg:brevo:list:" + key;
  const cached = await env.SUBSCRIBERS.get(cacheKey);
  if (cached) return parseInt(cached, 10);
  let id = null;
  for (let offset = 0; offset < 500 && !id; offset += 50) {
    const r = await bv(env, "GET", "/contacts/lists?limit=50&offset=" + offset);
    const lists = r.ok && r.data && Array.isArray(r.data.lists) ? r.data.lists : [];
    for (const l of lists) if (l && l.name === def.list) { id = l.id; break; }
    if (lists.length < 50) break;
  }
  if (!id) {
    const folderId = await brevoFolderId(env);
    if (!folderId) return null;
    const c = await bv(env, "POST", "/contacts/lists", { name: def.list, folderId: folderId });
    if (c.ok && c.data && c.data.id) id = c.data.id;
  }
  if (id) await env.SUBSCRIBERS.put(cacheKey, String(id));
  return id;
}
function doiTemplateHtml() {
  const row = function (title, from, desc) {
    return '<tr><td style="padding:10px 12px;border:1px solid #e7e0cf;border-radius:10px;background:#ffffff;">' +
      '<p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;">' + title + ' <span style="font-weight:400;color:#64748b;font-size:12px;">&middot; ' + from + '</span></p>' +
      '<p style="margin:4px 0 0 0;font-size:13px;line-height:1.5;color:#475569;">' + desc + '</p></td></tr><tr><td style="height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>';
  };
  return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirma tu suscripci&oacute;n</title></head>' +
    '<body style="margin:0;padding:0;background:#0b0f14;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f14;"><tr><td align="center" style="padding:28px 14px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">' +
    '<tr><td style="padding:0 4px 18px 4px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>' +
    '<td style="background:#2563eb;color:#ffffff;font-weight:700;font-size:11px;letter-spacing:.06em;border-radius:10px;width:32px;height:32px;text-align:center;vertical-align:middle;">IN</td>' +
    '<td style="padding-left:10px;color:#f8fafc;font-size:14px;font-weight:600;">INVEST <span style="color:#64748b;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;">&nbsp;Trujillo Mingorance</span></td>' +
    '</tr></table></td></tr>' +
    '<tr><td style="background:#fbf8f1;border-radius:16px;padding:28px 26px;color:#1f2937;">' +
    '<p style="margin:0 0 6px 0;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#2563eb;">Doble confirmaci&oacute;n</p>' +
    '<h1 style="margin:0 0 14px 0;font-size:22px;line-height:1.3;color:#0f172a;">Confirma tu suscripci&oacute;n</h1>' +
    '<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;">Alguien (seguramente t&uacute;) ha pedido recibir una o las dos listas de correo de Trujillo Mingorance desde invest.trujillomingorance.com:</p>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
    row("Markets", "markets@trujillomingorance.com", "Actualizaciones de mercado en cada franja del d&iacute;a (ma&ntilde;ana 09:00, mediod&iacute;a 15:00 y cierre 22:15, hora de Madrid).") +
    row("INVEST", "invest@trujillomingorance.com", "Educaci&oacute;n, modelos mentales e ideas de inversi&oacute;n con fin educativo. No es asesoramiento.") +
    '</table>' +
    '<p style="margin:6px 0 0 0;font-size:13px;line-height:1.6;color:#475569;">Solo se te a&ntilde;adir&aacute; a las listas que marcaste en el formulario.</p>' +
    '<p style="margin:22px 0;"><a href="{{ doubleoptin }}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:999px;">Confirmar suscripci&oacute;n</a></p>' +
    '<p style="margin:0 0 14px 0;font-size:13px;line-height:1.6;color:#475569;">Si no lo has pedido, ignora este correo: sin confirmaci&oacute;n no se te a&ntilde;ade a ninguna lista.</p>' +
    '<p style="margin:0;font-size:13px;line-height:1.6;color:#475569;"><em>English:</em> someone asked to receive Markets and/or INVEST emails. Confirm with the button above, or simply ignore this email.</p>' +
    '</td></tr>' +
    '<tr><td style="padding:18px 6px 0 6px;color:#94a3b8;font-size:11px;line-height:1.6;">' +
    'INVEST &middot; Trujillo Mingorance / ATM Labs. Informaci&oacute;n general y educativa, no es asesoramiento de inversi&oacute;n (MiFID II / Ley 6/2023). Cada correo incluye un enlace de baja.<br>' +
    '<a href="' + SITE_ORIGIN + '/privacidad/" style="color:#93c5fd;">Privacidad</a> &middot; <a href="mailto:security@trujillomingorance.com" style="color:#93c5fd;">security@trujillomingorance.com</a>' +
    '</td></tr></table></td></tr></table></body></html>';
}
async function brevoDoiTemplateId(env) {
  if (env.BREVO_DOI_TEMPLATE_ID) return parseInt(env.BREVO_DOI_TEMPLATE_ID, 10);
  const cached = await env.SUBSCRIBERS.get("cfg:brevo:doi");
  if (cached) return parseInt(cached, 10);
  let id = null;
  for (let offset = 0; offset < 500 && !id; offset += 50) {
    const r = await bv(env, "GET", "/smtp/templates?limit=50&offset=" + offset);
    const ts = r.ok && r.data && Array.isArray(r.data.templates) ? r.data.templates : [];
    for (const t of ts) if (t && t.name === DOI_TEMPLATE_NAME) { id = t.id; break; }
    if (ts.length < 50) break;
  }
  if (!id) {
    const tpl = {
      templateName: DOI_TEMPLATE_NAME,
      subject: "Confirma tu suscripci\u00f3n \u00b7 INVEST",
      sender: DOI_SENDER,
      htmlContent: doiTemplateHtml(),
      isActive: true,
      tag: "optin"
    };
    const replyTo = doiReplyTo(env);
    if (replyTo) tpl.replyTo = replyTo;
    const c = await bv(env, "POST", "/smtp/templates", tpl);
    if (c.ok && c.data && c.data.id) id = c.data.id;
  }
  if (id) await env.SUBSCRIBERS.put("cfg:brevo:doi", String(id));
  return id;
}

async function handleSubscribe(request, env) {
  if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  if (!subEnabled(env)) return json({ ok: false, error: "not_configured" }, 503);
  const len = parseInt(request.headers.get("content-length") || "0", 10);
  if (len > 8192) return json({ ok: false, error: "too_large" }, 413);
  let body = {};
  const ct = request.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) body = await request.json();
    else {
      const fd = await request.formData();
      body = { email: fd.get("email"), website: fd.get("website"), consent: fd.get("consent"), token: fd.get("cf-turnstile-response"), streams: { markets: fd.get("markets"), invest: fd.get("invest") } };
    }
  } catch (err) {
    return json({ ok: false, error: "bad_request" }, 400);
  }
  if (!body || typeof body !== "object") return json({ ok: false, error: "bad_request" }, 400);
  // Honeypot: bots fill the hidden field. Pretend success, store nothing, send nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") return json({ ok: true, status: "pending" }, 200);
  const streams = cleanStreams(body.streams);
  if (!streams.length) return json({ ok: false, error: "stream_required" }, 400);
  const consent = body.consent === true || body.consent === "on" || body.consent === "true";
  if (!consent) return json({ ok: false, error: "consent_required" }, 400);
  const email = validEmail(body.email);
  if (!email) return json({ ok: false, error: "invalid_email" }, 400);
  const ip = request.headers.get("cf-connecting-ip") || "";
  if (await rateLimited(env, ip)) return json({ ok: false, error: "rate_limited" }, 429);
  // Temporary end-to-end test hook: inert unless BOTH the one-off SUB_TEST_TOKEN secret and the SUB_TEST_EMAIL
  // var exist (delete them after the test). Only that exact address may skip Turnstile.
  const testEmail = typeof env.SUB_TEST_EMAIL === "string" ? env.SUB_TEST_EMAIL.trim().toLowerCase() : "";
  const testBypass = !!(env.SUB_TEST_TOKEN && env.SUB_TEST_TOKEN.length >= 32 && testEmail && email === testEmail && request.headers.get("x-invest-test") === env.SUB_TEST_TOKEN);
  if (!testBypass) {
    const tv = await verifyTurnstile(env.TURNSTILE_SECRET, body.token, ip);
    if (!tv.ok) return json({ ok: false, error: "turnstile_failed" }, 400);
  }
  // Per-address cooldown (hash only, short TTL) so the form cannot be used to flood an inbox.
  const coolKey = "cool:" + (await sha256hex("invest-sub|" + email)).slice(0, 40);
  if (await env.SUBSCRIBERS.get(coolKey)) return json({ ok: true, status: "pending" }, 200);
  const listIds = [];
  for (const k of streams) {
    const id = await brevoListId(env, k);
    if (!id) return json({ ok: false, error: "provider_unavailable" }, 502);
    listIds.push(id);
  }
  const templateId = await brevoDoiTemplateId(env);
  if (!templateId) return json({ ok: false, error: "provider_unavailable" }, 502);
  const r = await bv(env, "POST", "/contacts/doubleOptinConfirmation", {
    email: email,
    includeListIds: listIds,
    templateId: templateId,
    redirectionUrl: DOI_REDIRECT
  });
  if (!r.ok) {
    // Already a contact in every requested list: answer generically (no enumeration, no extra mail).
    const c = await bv(env, "GET", "/contacts/" + encodeURIComponent(email));
    const inLists = c.ok && c.data && Array.isArray(c.data.listIds) ? c.data.listIds : [];
    if (c.ok && listIds.every(function (id) { return inLists.indexOf(id) !== -1; })) return json({ ok: true, status: "pending" }, 200);
    return json({ ok: false, error: "mail_failed" }, 502);
  }
  await env.SUBSCRIBERS.put(coolKey, "1", { expirationTtl: EMAIL_COOLDOWN });
  return json({ ok: true, status: "pending" }, 200);
}

// ---- SEO: canonical, Open Graph, Twitter card, robots and JSON-LD, injected per request from each page's title/description ----
const OG_IMAGE_SOURCE = "https://raw.githubusercontent.com/ATM-Software-Labs/invest-platform/master/docs/og-image.png";
async function ogImage() {
  try {
    const res = await fetch(OG_IMAGE_SOURCE, { cf: { cacheTtl: 86400, cacheEverything: true }, signal: AbortSignal.timeout(8000) });
    if (res.ok) return new Response(res.body, { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
  } catch (err) {}
  return Response.redirect(SITE_ORIGIN + "/favicon.png", 302);
}
function seoDecode(s) {
  return s.replace(/&quot;/g, '"').replace(/&laquo;/g, "\u00ab").replace(/&raquo;/g, "\u00bb").replace(/&amp;/g, "&");
}
function seoAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function seoLd(o) {
  return '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, "\\u003c") + "</script>";
}
function withSeo(text, path) {
  const anchor = text.match(/<meta name="description" content="([^"]*)"\/>/);
  if (!anchor || text.indexOf('rel="canonical"') !== -1) return text;
  const titleM = text.match(/<title>([^<]*)<\/title>/);
  const title = seoDecode(titleM ? titleM[1] : "INVEST");
  const desc = seoDecode(anchor[1]);
  const url = SITE_ORIGIN + path;
  const site = { "@type": "WebSite", name: "INVEST", url: SITE_ORIGIN + "/" };
  const ld = path === "/" ? [
    { "@context": "https://schema.org", "@type": "WebSite", name: "INVEST", alternateName: "INVEST \u00b7 Trujillo Mingorance", url: SITE_ORIGIN + "/", inLanguage: "es", description: desc,
      publisher: { "@type": "Organization", name: "Trujillo Mingorance / ATM Labs", url: "https://labs.trujillomingorance.com", email: "security@trujillomingorance.com" },
      potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: SITE_ORIGIN + "/?q={search_term_string}" }, "query-input": "required name=search_term_string" } },
    { "@context": "https://schema.org", "@type": "WebApplication", name: "INVEST \u00b7 Comparador de activos", url: SITE_ORIGIN + "/comparar/", applicationCategory: "FinanceApplication",
      operatingSystem: "Web", inLanguage: "es", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" } }
  ] : [{ "@context": "https://schema.org", "@type": "WebPage", name: title, description: desc, url: url, inLanguage: "es", isPartOf: site }];
  const t = seoAttr(title), d = seoAttr(desc), img = SITE_ORIGIN + "/og-image.png";
  const tags = [
    '<link rel="canonical" href="' + url + '"/>',
    path === "/confirmado/" ? '<meta name="robots" content="noindex, follow"/>' : '<meta name="robots" content="index, follow, max-image-preview:large"/>',
    '<meta property="og:type" content="website"/>',
    '<meta property="og:site_name" content="INVEST \u00b7 Trujillo Mingorance"/>',
    '<meta property="og:locale" content="es_ES"/>',
    '<meta property="og:locale:alternate" content="en_US"/>',
    '<meta property="og:title" content="' + t + '"/>',
    '<meta property="og:description" content="' + d + '"/>',
    '<meta property="og:url" content="' + url + '"/>',
    '<meta property="og:image" content="' + img + '"/>',
    '<meta property="og:image:width" content="1200"/>',
    '<meta property="og:image:height" content="630"/>',
    '<meta property="og:image:alt" content="INVEST: comparador de acciones, ETF, \u00edndices y cripto"/>',
    '<meta name="twitter:card" content="summary_large_image"/>',
    '<meta name="twitter:title" content="' + t + '"/>',
    '<meta name="twitter:description" content="' + d + '"/>',
    '<meta name="twitter:image" content="' + img + '"/>'
  ].concat(ld.map(seoLd)).join("\n");
  return text.replace(anchor[0], anchor[0] + "\n" + tags);
}

const SITEMAP_PATHS = ["/", "/munger/", "/modelos/", "/glosario/", "/comparar/", "/suscribirse/", "/ensayos/redundancia-de-efectivo/", "/perfil/", "/aviso-legal/", "/privacidad/", "/cookies/"];
function sitemapXml() {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    SITEMAP_PATHS.map(function (p) { return "  <url><loc>" + SITE_ORIGIN + p + "</loc></url>"; }).join("\n") + "\n</urlset>\n";
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/favicon.png" || url.pathname === "/apple-touch-icon.png") {
      const bin = Uint8Array.from(atob(ICON), (c) => c.charCodeAt(0));
      return new Response(bin, { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
    }
    if (url.pathname === "/og-image.png") return ogImage();
    if (url.pathname === "/sitemap.xml") return new Response(sitemapXml(), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
    if (url.pathname === "/robots.txt") return new Response("User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /confirmado/\nSitemap: " + SITE_ORIGIN + "/sitemap.xml\n", { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
    if (url.pathname === "/api/subscribe/status") return json({ ok: true, enabled: subEnabled(env), sitekey: TURNSTILE_SITEKEY }, 200, "no-store");
    if (url.pathname === "/api/subscribe" || url.pathname === "/api/newsletter") return handleSubscribe(request, env);
    /*__CSS_ROUTE__*/
    if (url.pathname === "/api/quote") return handleQuote(request, url);
    if (url.pathname === "/api/search") return handleSearch(request, url);
    if (url.pathname.startsWith("/api/")) return json({ ok: false, error: "not_found" }, 404);
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Not found", { status: 404 });
    let path = url.pathname;
    if (path === "/index.html") path = "/";
    if (path !== "/" && path.endsWith("/index.html")) path = path.slice(0, -10);
    if (path !== "/" && !path.endsWith("/")) {
      const last = path.split("/").pop() || "";
      if (!last.includes(".")) {
        const u = new URL(url);
        u.pathname = path + "/";
        return Response.redirect(u.toString(), 302);
      }
      path += "/";
    }
    const b64 = PAGES[path];
    if (!b64) return new Response("Not found", { status: 404 });
    return html(b64, path);
  },
};
