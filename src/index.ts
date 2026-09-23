import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { loadConfig } from "./config.js";
import { createCache } from "./cache/cache.js";
import { createLogger } from "./logger.js";
import { AnalysisOrchestrator } from "./llm/orchestrator.js";
import { XaiStructuredClient } from "./llm/xai-client.js";
import { ProviderAggregator } from "./providers/aggregator.js";
import { registerAnalysisRoutes } from "./routes/analysis.js";
import { registerAssetRoutes } from "./routes/asset.js";
import { registerHealthRoute } from "./routes/health.js";
import { AnalysisService } from "./services/analysis-service.js";
import { AssetService } from "./services/asset-service.js";
import { AssetError } from "./types/index.js";

export async function buildServer() {
  const config = loadConfig();
  const logger = createLogger(config);
  const cache = await createCache(config);
  const aggregator = new ProviderAggregator(config);
  const service = new AssetService(config, cache, aggregator);
  const llm = config.XAI_API_KEY
    ? new XaiStructuredClient({
        apiKey: config.XAI_API_KEY,
        model: config.XAI_MODEL,
        baseUrl: config.XAI_BASE_URL,
        timeoutMs: config.XAI_TIMEOUT_MS,
      })
    : null;
  const analysis = new AnalysisService(
    service,
    new AnalysisOrchestrator(llm, llm ? config.XAI_MODEL : null),
  );

  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
  });

  await app.register(cors, { origin: true });
  await app.register(rateLimit, {
    max: 60,
    timeWindow: "1 minute",
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AssetError) {
      return reply.status(err.statusCode).send({
        error: err.code,
        message: err.message,
        details: err.details,
      });
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    req.log.error({ err }, "unhandled");
    return reply.status(status).send({
      error: "INTERNAL_ERROR",
      message:
        config.NODE_ENV === "production"
          ? "Unexpected error"
          : err instanceof Error
            ? err.message
            : "Unexpected error",
    });
  });

  await registerHealthRoute(app, config, cache);
  await registerAssetRoutes(app, service);
  await registerAnalysisRoutes(app, analysis);

  app.get("/", async () => ({
    name: "invest-platform",
    version: "1.0.0",
    endpoints: {
      health: "GET /health",
      asset: "GET /api/v1/asset/:identifier",
      resolve: "GET /api/v1/resolve/:identifier",
      score: "GET /api/v1/score/:identifier",
      analysis: "GET|POST /api/v1/analysis/:identifier",
      universe: "GET /api/v1/universe",
      directory: "GET /api/v1/directory",
      search: "GET /api/v1/search?q=",
    },
  }));

  return { app, config };
}

const isMain = process.argv[1]?.includes("index");

if (isMain) {
  const { app, config } = await buildServer();
  await app.listen({ port: config.PORT, host: config.HOST });
  app.log.info(`invest-platform listening on ${config.HOST}:${config.PORT}`);
}
