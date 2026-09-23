import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const api = process.env.API_ORIGIN ?? "http://127.0.0.1:8787";
const dir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  outputFileTracingRoot: dir,
  async rewrites() {
    return [
      { source: "/backend/:path*", destination: `${api}/:path*` },
      { source: "/api/:path*", destination: `${api}/api/:path*` },
    ];
  },
};

export default nextConfig;
