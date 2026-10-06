import { MemoryCache } from "../cache/memory.js";
import { loadConfig } from "../config.js";
import { symbolResolver } from "../domain/symbol-resolver.js";
import { AnalysisOrchestrator } from "../llm/orchestrator.js";
import { XaiStructuredClient } from "../llm/xai-client.js";
import { ProviderAggregator } from "../providers/aggregator.js";
import { AnalysisService } from "../services/analysis-service.js";
import { AssetService } from "../services/asset-service.js";
import { AssetError } from "../types/index.js";
import { buildUniverseBoard } from "../universe/board.js";
import { directoryStats, searchDirectory } from "../universe/directory.js";
import { HttpClient } from "../providers/http.js";
import { fetchYahooQuotes } from "../providers/yahoo.js";

export interface EdgeEnv {
  ENABLE_DEMO_FIXTURES?: string;
  ENABLE_LIVE_QUOTES?: string;
  EODHD_API_TOKEN?: string;
  FMP_API_KEY?: string;
  OPENBB_BASE_URL?: string;
  OPENBB_API_KEY?: string;
  XAI_API_KEY?: string;
  XAI_MODEL?: string;
  XAI_BASE_URL?: string;
  RESEND_API_KEY?: string;
  ASSETS?: { fetch: (input: Request | URL) => Promise<Response> };
}

let boot:
  | {
      assets: AssetService;
      analysis: AnalysisService;
    }
  | undefined;

function services(env: EdgeEnv) {
  if (boot) return boot;
  const config = loadConfig({
    ENABLE_DEMO_FIXTURES: env.ENABLE_DEMO_FIXTURES ?? "true",
    ENABLE_LIVE_QUOTES: "true",
    EODHD_API_TOKEN: env.EODHD_API_TOKEN ?? "",
    FMP_API_KEY: env.FMP_API_KEY ?? "",
    OPENBB_BASE_URL: env.OPENBB_BASE_URL ?? "",
    OPENBB_API_KEY: env.OPENBB_API_KEY ?? "",
    XAI_API_KEY: env.XAI_API_KEY ?? "",
    XAI_MODEL: env.XAI_MODEL ?? "grok-4.6",
    XAI_BASE_URL: env.XAI_BASE_URL ?? "https://api.x.ai/v1",
    NODE_ENV: "production",
  });
  const cache = new MemoryCache();
  const assets = new AssetService(config, cache, new ProviderAggregator(config));
  const llm = config.XAI_API_KEY
    ? new XaiStructuredClient({
        apiKey: config.XAI_API_KEY,
        model: config.XAI_MODEL,
        baseUrl: config.XAI_BASE_URL,
        timeoutMs: config.XAI_TIMEOUT_MS,
      })
    : null;
  const analysis = new AnalysisService(assets, new AnalysisOrchestrator(llm, llm ? config.XAI_MODEL : null));
  boot = { assets, analysis };
  return boot;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=15",
      "access-control-allow-origin": "*",
    },
  });
}

function remainder(pathname: string): string {
  return pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
}

export async function handleApi(request: Request, env: EdgeEnv): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type",
      },
    });
  }

  try {
    const url = new URL(request.url);
    const rest = remainder(url.pathname);

    if (rest === "newsletter") {
      return handleNewsletter(request, env);
    }

    const { assets, analysis } = services(env);
    const qualitative = url.searchParams.get("qualitative") === "true" || url.searchParams.get("qualitative") === "1";
    const refresh = url.searchParams.get("refresh") === "true" || url.searchParams.get("refresh") === "1";

    if (rest === "v1" || rest === "health" || rest === "v1/health") {
      return json({ status: "ok", edge: true, service: "invest-platform" });
    }

    if (rest === "v1/universe" || rest === "v1/board") {
      return json(await buildUniverseBoard(analysis), 200);
    }

    if (rest === "v1/quotes") {
      const tickersParam = url.searchParams.get("tickers");
      if (!tickersParam) return json({ error: "Missing tickers" }, 400);
      const tickers = tickersParam.split(",").map(t => t.trim()).filter(Boolean);
      const { loadConfig } = await import("../config.js");
      const config = loadConfig();
      const http = new HttpClient({ ...config, HTTP_TIMEOUT_MS: 8000, HTTP_RETRIES: 1 });
      const hits = await fetchYahooQuotes(http, tickers);
      const out: Record<string, any> = {};
      for (const [symbol, hit] of hits.entries()) {
        out[symbol] = {
          price: hit.price,
          changePercent: hit.changePercent,
          currency: hit.currency
        };
      }
      return new Response(JSON.stringify(out), {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "public, s-maxage=60",
          "access-control-allow-origin": "*",
        },
      });
    }

    if (rest === "v1/directory") {
      return json(directoryStats());
    }

    if (rest === "v1/search") {
      const q = url.searchParams.get("q") ?? "";
      const limit = Math.min(80, Math.max(1, Number(url.searchParams.get("limit") ?? 40) || 40));
      const stats = directoryStats();
      return json({
        ...stats,
        query: q,
        results: searchDirectory(q, {
          limit,
          country: url.searchParams.get("country") ?? undefined,
          kind: url.searchParams.get("kind") ?? undefined,
          sector: url.searchParams.get("sector") ?? undefined,
        }),
      });
    }

    const take = (prefix: string) => {
      if (!rest.startsWith(prefix)) return null;
      const id = rest.slice(prefix.length);
      return id ? decodeURIComponent(id) : null;
    };

    const resolveId = take("v1/resolve/");
    if (resolveId) return json(symbolResolver.resolve(resolveId));

    const assetId = take("v1/asset/");
    if (assetId) return json(await assets.getAsset(assetId, { refresh }));

    const scoreId = take("v1/score/");
    if (scoreId) {
      const out = await analysis.analyze(scoreId, { refresh, qualitative: false });
      return json(out.scoring);
    }

    const analysisId = take("v1/analysis/");
    if (analysisId) {
      let body: { enrichment?: Record<string, unknown>; qualitative?: boolean } = {};
      if (request.method === "POST") {
        body = (await request.json().catch(() => ({}))) as typeof body;
      }
      return json(
        await analysis.analyze(analysisId, {
          refresh,
          qualitative: body.qualitative ?? qualitative,
          enrichment: body.enrichment as never,
        }),
      );
    }

    return json({ error: "NOT_FOUND", message: rest }, 404);
  } catch (err) {
    if (err instanceof AssetError) {
      return json({ error: err.code, message: err.message, details: err.details }, err.statusCode);
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return json({ error: "INTERNAL_ERROR", message }, 500);
  }
}

export async function handleInvestFetch(request: Request, env: EdgeEnv): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
    return handleApi(request, env);
  }
  if (!env.ASSETS) return json({ error: "NO_ASSETS" }, 500);

  const pretty = prettyAssetId(url.pathname);
  if (pretty && !url.searchParams.get("id")) {
    const dest = new URL("/asset/", url.origin);
    dest.searchParams.set("id", pretty);
    return Response.redirect(dest, 302);
  }

  return env.ASSETS.fetch(request);
}

function prettyAssetId(pathname: string): string | null {
  const cleaned = pathname.replace(/\/+$/, "") || "/";
  if (!cleaned.startsWith("/asset/")) return null;
  const rest = cleaned.slice("/asset/".length);
  if (!rest || rest === "_") return null;
  try {
    return decodeURIComponent(rest);
  } catch {
    return rest;
  }
}

function resendApiKey(env: EdgeEnv): string {
  const fromBinding = typeof env.RESEND_API_KEY === "string" ? env.RESEND_API_KEY.trim() : "";
  if (fromBinding) return fromBinding;
  const fromProcess = typeof process !== "undefined" && typeof process.env?.RESEND_API_KEY === "string"
    ? process.env.RESEND_API_KEY.trim()
    : "";
  return fromProcess;
}

function normalizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  if (!email || email.length > 254) return null;
  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@")) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || local.length > 64 || !domain || domain.length > 253) return null;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return null;
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return null;
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(domain)) return null;
  return email;
}

function newsletterJson(data: { ok: boolean; error?: string }, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}

export async function handleNewsletter(request: Request, env: EdgeEnv): Promise<Response> {
  if (request.method !== "POST") {
    return newsletterJson({ ok: false, error: "method_not_allowed" }, 405);
  }

  let body: { email?: unknown } = {};
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return newsletterJson({ ok: false, error: "invalid_email" }, 400);
  }

  const email = normalizeEmail(body?.email);
  if (!email) return newsletterJson({ ok: false, error: "invalid_email" }, 400);

  const apiKey = resendApiKey(env);
  if (!apiKey) return newsletterJson({ ok: false, error: "not_configured" }, 503);

  try {
    const upstream = await fetch("https://api.resend.com/contacts", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, unsubscribed: false }),
    });
    if (upstream.ok || upstream.status === 409) {
      return newsletterJson({ ok: true }, 200);
    }
    return newsletterJson({ ok: false, error: "upstream" }, 502);
  } catch {
    return newsletterJson({ ok: false, error: "upstream" }, 502);
  }
}

