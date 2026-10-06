// Run after `npm run build`: exercises dist/worker.js with mocked KV, Turnstile and Brevo.
import worker from "../dist/worker.js";
const store = new Map();
const KV = {
  async get(k, type) { const v = store.get(k); if (v == null) return null; return type === "json" ? JSON.parse(v) : v; },
  async put(k, v, o) { store.set(k, v); },
  async delete(k) { store.delete(k); },
};
globalThis.caches = { default: { match: async () => null, put: async () => {} } };
const calls = [];
let tsOk = true, doiOk = true;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  calls.push(init.method + " " + url);
  if (url.includes("siteverify")) return new Response(JSON.stringify(tsOk ? { success: true, hostname: "invest.trujillomingorance.com", action: "subscribe" } : { success: false, "error-codes": ["invalid-input-response"] }));
  if (url.includes("api.brevo.com")) {
    if (init.headers["api-key"] !== "FAKE") return new Response("{}", { status: 401 });
    if (url.includes("/contacts/folders") && init.method === "GET") return new Response(JSON.stringify({ folders: [{ id: 1, name: "Your first folder" }] }));
    if (url.includes("/contacts/folders") && init.method === "POST") return new Response(JSON.stringify({ id: 7 }), { status: 201 });
    if (url.includes("/contacts/lists") && init.method === "GET") return new Response(JSON.stringify({ lists: [{ id: 3, name: "Markets Digest" }], count: 1 }));
    if (url.includes("/contacts/lists") && init.method === "POST") return new Response(JSON.stringify({ id: 9 }), { status: 201 });
    if (url.includes("/smtp/templates") && init.method === "GET") return new Response(JSON.stringify({ templates: [] }));
    if (url.includes("/smtp/templates") && init.method === "POST") { const b = JSON.parse(init.body); if (!b.htmlContent.includes("{{ doubleoptin }}") || b.tag !== "optin") throw new Error("bad tpl"); return new Response(JSON.stringify({ id: 42 }), { status: 201 }); }
    if (url.includes("doubleOptinConfirmation")) { const b = JSON.parse(init.body); calls.push("DOI " + JSON.stringify(b)); return new Response(null, { status: doiOk ? 204 : 400 }); }
    if (url.includes("/contacts/")) return new Response(JSON.stringify({ listIds: [] }));
  }
  throw new Error("unexpected fetch " + url);
};
const env0 = { SUBSCRIBERS: KV, TURNSTILE_SECRET: "x" };
const env = { ...env0, BREVO_API_KEY: "FAKE" };
const req = (path, init) => new Request("https://invest.trujillomingorance.com" + path, init);
const post = (body, ip = "1.2.3.4") => req("/api/subscribe", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": ip }, body: JSON.stringify(body) });
const j = async (r) => [r.status, await r.json()];
const good = { email: "Test.User@Example.com", streams: { markets: true, invest: true }, consent: true, token: "tok", website: "" };
console.log("status off", await j(await worker.fetch(req("/api/subscribe/status"), env0)));
console.log("status on", await j(await worker.fetch(req("/api/subscribe/status"), env)));
console.log("not configured", await j(await worker.fetch(post(good), env0)));
console.log("honeypot", await j(await worker.fetch(post({ ...good, website: "spam" }), env)), "calls", calls.length);
console.log("no stream", await j(await worker.fetch(post({ ...good, streams: {} }), env)));
console.log("no consent", await j(await worker.fetch(post({ ...good, consent: false }), env)));
console.log("bad email", await j(await worker.fetch(post({ ...good, email: "a@b" }), env)));
console.log("disposable", await j(await worker.fetch(post({ ...good, email: "x@mailinator.com" }), env)));
tsOk = false; console.log("turnstile fail", await j(await worker.fetch(post(good, "5.5.5.5"), env))); tsOk = true;
console.log("ok", await j(await worker.fetch(post(good, "6.6.6.6"), env)));
console.log(calls.filter(c => c.startsWith("DOI") || c.includes("POST https://api.brevo")).join("\n"));
const n = calls.length;
console.log("cooldown same email", await j(await worker.fetch(post(good, "6.6.6.7"), env)), "new brevo calls", calls.slice(n).filter(c => c.includes("brevo")).length);
console.log("only invest", await j(await worker.fetch(post({ ...good, email: "b@example.org", streams: { invest: true } }, "6.6.6.8"), env)), calls.filter(c => c.startsWith("DOI")).pop());
for (let i = 0; i < 6; i++) { const r = await worker.fetch(post({ ...good, email: "r" + i + "@example.org" }, "9.9.9.9"), env); if (i >= 4) console.log("rl", i, r.status); }
doiOk = false; console.log("doi fail", await j(await worker.fetch(post({ ...good, email: "c@example.org" }, "7.7.7.7"), env))); doiOk = true;
console.log("kv keys", [...store.keys()].map(k => k.replace(/[0-9a-f]{20,}/, "<h>")));
for (const p of ["/", "/munger/", "/munger", "/modelos/", "/glosario/", "/comparar/", "/suscribirse/", "/confirmado/", "/sitemap.xml", "/robots.txt", "/privacidad/", "/nope/", "/assets/app.css", "/favicon.png"]) {
  const r = await worker.fetch(req(p), env); console.log(p, r.status, r.headers.get("location") || "", r.headers.get("content-type"));
}
const home = await (await worker.fetch(req("/"), env)).text();
console.log("home has redirect", home.includes("location.replace('/munger/')"), "sitekey", !!process.env.TURNSTILE_SITEKEY && home.includes(process.env.TURNSTILE_SITEKEY));
