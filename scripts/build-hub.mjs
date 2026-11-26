// Copies the browser modules next to the static hub so Cloudflare Pages can serve them.
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dest = path.join(root, "public", "shared");
fs.mkdirSync(dest, { recursive: true });
for (const name of ["indicators.js", "assets.js", "etoro.js", "streak.js", "portfolio.js"]) {
  fs.copyFileSync(path.join(root, "shared", name), path.join(dest, name));
}
const vendor = path.join(root, "public", "vendor", "lightweight-charts.standalone.production.js");
if (!fs.existsSync(vendor)) {
  console.error("Missing vendored Lightweight Charts at public/vendor/");
  process.exit(1);
}
const ASSET_RE = /(\/(?:hub\.css|hub\.js|chart\.js|store\.js|shared\/[a-z0-9]+\.js))(?:\?v=[A-Za-z0-9_]+)?/g;
function unstamp(text) {
  return text.replace(ASSET_RE, "$1");
}
const stampFiles = ["index.html", "hub.js", "chart.js"].map((name) => path.join(root, "public", name));
const hash = crypto.createHash("sha256");
for (const name of ["indicators.js", "assets.js", "etoro.js", "streak.js", "portfolio.js"]) {
  hash.update(fs.readFileSync(path.join(dest, name)));
}
for (const rel of ["public/hub.css", "public/hub.js", "public/chart.js", "public/store.js"]) {
  hash.update(unstamp(fs.readFileSync(path.join(root, rel), "utf8")));
}
const version = hash.digest("hex").slice(0, 10);
for (const file of stampFiles) {
  const next = unstamp(fs.readFileSync(file, "utf8")).replace(ASSET_RE, "$1?v=" + version);
  fs.writeFileSync(file, next);
}
fs.writeFileSync(path.join(root, "public", "asset-version.txt"), version + "\n");
console.log("hub static ready", dest, version);
