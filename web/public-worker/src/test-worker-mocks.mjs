// Run after `npm run build`: exercises dist/worker.js with mocked KV, Turnstile, Brevo and the rate-limit binding.
import worker from "../dist/worker.js";
const store = new Map();
const puts = [];
const KV = {
  async get(k, type) { const v = store.get(k); if (v == null) return null; return type === "json" ? JSON.parse(v) : v; },
  async put(k, v, o) { puts.push(k); store.set(k, v); },
  async delete(k) { store.delete(k); },
};
// Same threshold as [[ratelimits]].simple.limit in wrangler.toml (5). The binding owns the window.
const RL_LIMIT = 5;
function createRateLimiter(limit) {
  const counts = new Map();
  return {
    async limit(opts) {
      const key = opts && opts.key;
      const n = (counts.get(key) || 0) + 1;
      counts.set(key, n);
      return { success: n <= limit };
    }
  };
}
const failures = [];
function check(cond, msg) { if (!cond) { failures.push(msg); console.error("FAIL", msg); } }
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
const SUBSCRIBE_RL = createRateLimiter(RL_LIMIT);
const env = { ...env0, BREVO_API_KEY: "FAKE", SUBSCRIBE_RL: SUBSCRIBE_RL };
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
tsOk = false;
const turnstileFail = await j(await worker.fetch(post(good, "5.5.5.5"), env));
console.log("turnstile fail", turnstileFail);
check(turnstileFail[0] === 400 && turnstileFail[1].error === "turnstile_failed", "turnstile fail status");
check(puts.length === 0, "unauthenticated turnstile failure must not write KV, got " + puts.join(","));
tsOk = true;
console.log("ok", await j(await worker.fetch(post(good, "6.6.6.6"), env)));
console.log(calls.filter(c => c.startsWith("DOI") || c.includes("POST https://api.brevo")).join("\n"));
const n = calls.length;
console.log("cooldown same email", await j(await worker.fetch(post(good, "6.6.6.7"), env)), "new brevo calls", calls.slice(n).filter(c => c.includes("brevo")).length);
console.log("only invest", await j(await worker.fetch(post({ ...good, email: "b@example.org", streams: { invest: true } }, "6.6.6.8"), env)), calls.filter(c => c.startsWith("DOI")).pop());
const rlStatuses = [];
let rlBody = null;
const callsBeforeRl = calls.length;
for (let i = 0; i < 6; i++) {
  const r = await worker.fetch(post({ ...good, email: "r" + i + "@example.org" }, "9.9.9.9"), env);
  rlStatuses.push(r.status);
  if (i === RL_LIMIT) rlBody = await r.json();
  if (i >= 4) console.log("rl", i, r.status, i === RL_LIMIT ? rlBody : "");
}
check(rlStatuses.slice(0, RL_LIMIT).every(function (s) { return s === 200; }) && rlStatuses[RL_LIMIT] === 429, "rate limit statuses " + rlStatuses.join(","));
check(rlBody && rlBody.error === "rate_limited", "rate limit error " + JSON.stringify(rlBody));
check(calls.slice(callsBeforeRl).filter(function (c) { return c.includes("siteverify"); }).length === RL_LIMIT, "limited request must not call Turnstile");
const badPuts = puts.filter(function (k) { return k.startsWith("rl:"); });
check(badPuts.length === 0, "rate limit must not write KV keys " + badPuts.join(","));
doiOk = false;
const doiFail = await j(await worker.fetch(post({ ...good, email: "c@example.org" }, "7.7.7.7"), env));
console.log("doi fail", doiFail);
check(doiFail[0] === 502, "another IP is not blocked after the first IP is limited");
doiOk = true;
const junkIp = "8.8.8.8";
for (let i = 0; i < RL_LIMIT + 1; i++) {
  const junk = await j(await worker.fetch(post({ ...good, email: "not-an-email", website: i === 0 ? "spam" : "" }, junkIp), env));
  check(junk[0] === 200 || junk[0] === 400, "junk status " + junk[0]);
}
const afterJunk = await j(await worker.fetch(post({ ...good, email: "after-junk@example.org" }, junkIp), env));
console.log("after junk", afterJunk[0]);
check(afterJunk[0] === 200, "honeypot and invalid email must not consume the rate limit");
const putsBeforeMissing = puts.length;
const envNoRl = { ...env, SUBSCRIBE_RL: undefined };
const missingBinding = await j(await worker.fetch(post({ ...good, email: "no-binding@example.org" }, "4.4.4.4"), envNoRl));
console.log("missing binding", missingBinding[0]);
check(missingBinding[0] === 200, "a missing rate-limit binding must not block a valid subscribe");
check(puts.slice(putsBeforeMissing).every(function (k) { return !k.startsWith("rl:"); }), "missing binding must not fall back to a KV counter");
const marketsStore = new Map();
const marketsPuts = [];
const envMarkets = {
  ...env,
  MARKETS_KV: {
    async get(k) { return marketsStore.get(k) || null; },
    async put(k, v) { marketsPuts.push(k); marketsStore.set(k, v); }
  }
};
const marketsReq = await j(await worker.fetch(post({ ...good, email: "markets-lang@example.org", mlang: "es", mcountry: "ES" }, "3.3.3.3"), envMarkets));
console.log("markets lang", marketsReq[0], marketsPuts.length);
check(marketsReq[0] === 200 && marketsPuts.length === 1 && marketsPuts[0].startsWith("prefs/"), "saveMarketsLang still writes after a real subscription");
tsOk = false;
const burnIp = "2.2.2.2";
for (let i = 0; i < RL_LIMIT; i++) {
  const burned = await j(await worker.fetch(post({ ...good, email: "burn" + i + "@example.org" }, burnIp), env));
  check(burned[0] === 400 && burned[1].error === "turnstile_failed", "turnstile burn " + i);
}
tsOk = true;
const burnedNext = await j(await worker.fetch(post({ ...good, email: "burn-ok@example.org" }, burnIp), env));
console.log("after turnstile burns", burnedNext[0]);
check(burnedNext[0] === 429 && burnedNext[1].error === "rate_limited", "failed Turnstile attempts still count, and the next one does not write KV");
console.log("kv keys", [...store.keys()].map(k => k.replace(/[0-9a-f]{20,}/, "<h>")));
check(![...store.keys()].some(function (k) { return k.startsWith("rl:"); }), "KV still holds an rl: key");
for (const p of ["/", "/munger/", "/munger", "/modelos/", "/glosario/", "/comparar/", "/suscribirse/", "/confirmado/", "/sitemap.xml", "/robots.txt", "/privacidad/", "/nope/", "/assets/app.css", "/favicon.png"]) {
  const r = await worker.fetch(req(p), env); console.log(p, r.status, r.headers.get("location") || "", r.headers.get("content-type"));
}
const home = await (await worker.fetch(req("/"), env)).text();
console.log("home has redirect", home.includes("location.replace('/munger/')"), "sitekey", !!process.env.TURNSTILE_SITEKEY && home.includes(process.env.TURNSTILE_SITEKEY));
if (failures.length) {
  console.error(failures.length + " assertion(s) failed");
  process.exit(1);
}
console.log("assertions ok", failures.length);
