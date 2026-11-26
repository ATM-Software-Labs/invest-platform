// Local hub: static files plus the same Pages handlers. No Cloudflare account required.
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { handleOhlcv, handlePulse } from "../shared/market.js";
import { handleQuote, handleSearch } from "../shared/public-quote.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
const mem = new Map();
globalThis.caches = {
  default: {
    async match(req) {
      const hit = mem.get(req.url);
      return hit ? new Response(hit.body, { headers: hit.headers }) : undefined;
    },
    async put(req, res) {
      mem.set(req.url, { body: await res.clone().text(), headers: { "content-type": res.headers.get("content-type") || "application/json" } });
    },
  },
};

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
};
const hubPaths = new Set(["/", "/charts", "/charts/", "/cartera", "/cartera/", "/ranking", "/ranking/", "/legal", "/legal/", "/activo", "/activo/"]);

function fileFor(urlPath) {
  if (urlPath.startsWith("/shared/")) return path.join(root, "shared", urlPath.slice("/shared/".length));
  const rel = urlPath === "/" ? "/index.html" : urlPath;
  const full = path.join(root, "public", rel);
  if (!full.startsWith(path.join(root, "public"))) return null;
  return full;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const request = new Request(url, { method: req.method, headers: req.headers });
  let response;
  if (url.pathname === "/api/ohlcv") response = await handleOhlcv(request);
  else if (url.pathname === "/api/pulse") response = await handlePulse(request);
  else if (url.pathname === "/api/quote") response = await handleQuote(request);
  else if (url.pathname === "/api/search") response = await handleSearch(request);
  else if (url.pathname === "/robots.txt") response = new Response(fs.readFileSync(path.join(root, "public", "robots.txt")), { headers: { "content-type": "text/plain; charset=utf-8" } });
  else if (hubPaths.has(url.pathname) || url.pathname.startsWith("/hub") || url.pathname.startsWith("/chart") || url.pathname.startsWith("/store") || url.pathname.startsWith("/shared/") || url.pathname.startsWith("/vendor/") || url.pathname === "/favicon.png" || url.pathname === "/hub.css") {
    const file = fileFor(url.pathname === "/" || hubPaths.has(url.pathname) ? "/index.html" : url.pathname);
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) response = new Response("Not found", { status: 404 });
    else response = new Response(fs.readFileSync(file), { headers: { "content-type": types[path.extname(file)] || "application/octet-stream" } });
  } else response = new Response("Not found", { status: 404 });
  const headers = {};
  response.headers.forEach((v, k) => { headers[k] = v; });
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
});
server.listen(port, "127.0.0.1", () => console.log("hub http://127.0.0.1:" + port));
