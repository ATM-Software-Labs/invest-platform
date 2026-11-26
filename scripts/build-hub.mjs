// Copies the browser modules next to the static hub so Cloudflare Pages can serve them.
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
console.log("hub static ready", dest);
