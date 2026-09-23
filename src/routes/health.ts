import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config.js";
import type { CacheStore } from "../cache/memory.js";

type HttpApp = FastifyInstance<any, any, any, any, any>;

export async function registerHealthRoute(app: HttpApp, config: AppConfig, cache: CacheStore) {
  app.get("/health", async () => ({
    status: "ok",
    service: "invest-platform",
    domain: "invest.trujillomingorance.com",
    cache: cache.kind,
    providers: {
      eodhd: Boolean(config.EODHD_API_TOKEN),
      fmp: Boolean(config.FMP_API_KEY),
      openbb: Boolean(config.OPENBB_BASE_URL),
      fixtures: config.ENABLE_DEMO_FIXTURES,
      xai: Boolean(config.XAI_API_KEY),
    },
  }));
}
