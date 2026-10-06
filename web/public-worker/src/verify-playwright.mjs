import { chromium } from "playwright";
const BASE = process.argv[2] || "http://localhost:8787";
const OUT = process.argv[3] || new URL("../dist/shots/", import.meta.url).pathname;
import fs from "fs"; fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = [];
async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, deviceScaleFactor: opts.mobile ? 2 : 1 });
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  let loads = 0; page.on("load", () => loads++);
  return { ctx, page, errs, loads: () => loads };
}
// 1. old hash link
{
  const { ctx, page, errs, loads } = await newPage();
  await page.goto(BASE + "/#munger-help", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  results.push({ test: "hash-redirect", url: page.url(), loads: loads(), errs });
  await ctx.close();
}
// 2. pages desktop dark + mobile
const paths = ["/", "/munger/", "/modelos/", "/glosario/", "/comparar/", "/suscribirse/", "/confirmado/", "/privacidad/", "/cookies/", "/perfil/", "/ensayos/redundancia-de-efectivo/", "/aviso-legal/"];
for (const p of paths) {
  for (const mobile of [false, true]) {
    const { ctx, page, errs } = await newPage({ mobile });
    const r = await page.goto(BASE + p, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const hasHashJs = await page.evaluate(() => document.documentElement.outerHTML.includes("oneShotHashScroll"));
    results.push({ test: "page", p, mobile, status: r.status(), overflow, hasHashJs, errs });
    await ctx.close();
  }
}
// 3. munger tool + screenshot (dark desktop), light mode, EN
{
  const { ctx, page, errs } = await newPage();
  await page.goto(BASE + "/munger/?q=AAPL", { waitUntil: "networkidle" });
  await page.waitForSelector("#munger-result .status-badge", { timeout: 30000 });
  const txt = await page.textContent("#munger-result");
  await page.screenshot({ path: OUT + "/munger.png", fullPage: true });
  results.push({ test: "munger-tool", snippet: txt.slice(0, 160), errs });
  await ctx.close();
}
{
  const { ctx, page, errs } = await newPage({ mobile: true, init: "localStorage.setItem('invest.theme.v1','light');localStorage.setItem('invest.lang.v1','en');" });
  await page.goto(BASE + "/munger/", { waitUntil: "networkidle" });
  const h1 = await page.textContent("h1"); const theme = await page.getAttribute("html", "data-theme"); const nav = await page.textContent(".atm-subnav");
  await page.screenshot({ path: OUT + "/munger-mobile-light-en.png", fullPage: false });
  results.push({ test: "light-en-mobile", h1, theme, nav: nav.replace(/\s+/g, " ").trim(), errs });
  await ctx.close();
}
// 4. theme toggle + lang toggle via UI on home
{
  const { ctx, page, errs } = await newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.click("#theme-btn"); const t1 = await page.getAttribute("html", "data-theme");
  await page.click("#lang-btn"); await page.click('.lang-option[data-lang="en"]');
  const title = await page.textContent("#sub-home-title"); const lang = await page.getAttribute("html", "lang");
  const card = await page.$('a.atm-card[href="/munger/"]');
  results.push({ test: "toggles", theme: t1, lang, subTitle: title, mungerCard: !!card, errs });
  // home subscribe screenshot (dark, ES)
  await page.click("#lang-btn"); await page.click('.lang-option[data-lang="es"]'); await page.click("#theme-btn");
  const sec = await page.$("#suscribirse"); await sec.scrollIntoViewIfNeeded();
  await sec.screenshot({ path: OUT + "/home-subscribe.png" });
  await ctx.close();
}
{
  const { ctx, page, errs } = await newPage();
  await page.goto(BASE + "/suscribirse/", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const state = await page.getAttribute("#sub-page", "data-state"); const msg = await page.textContent("#sub-page .sub-msg");
  await page.screenshot({ path: OUT + "/suscribirse.png", fullPage: true });
  results.push({ test: "subscribe-page", state, msg, errs });
  await ctx.close();
}
{
  const { ctx, page, errs } = await newPage();
  await page.goto(BASE + "/comparar/?t=AAPL,MSFT,IDR.MC", { waitUntil: "networkidle" });
  await page.waitForSelector(".cmp-table", { timeout: 40000 });
  const nulls = await page.$$eval(".cmp-table td.is-null", (n) => n.length);
  await page.screenshot({ path: OUT + "/comparar.png", fullPage: true });
  results.push({ test: "compare", nulls, errs });
  await ctx.close();
}
// 5. home help link in quote result goes to /munger/
{
  const { ctx, page, errs } = await newPage();
  await page.goto(BASE + "/?q=AAPL", { waitUntil: "networkidle" });
  await page.waitForSelector('#resultado a[href="/munger/"]', { timeout: 30000 });
  await page.click('#resultado a[href="/munger/"]'); await page.waitForLoadState("load");
  results.push({ test: "help-link", url: page.url(), errs });
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 1));
