import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AssetService } from "../services/asset-service.js";
import { AssetError } from "../types/index.js";
import { symbolResolver } from "../domain/symbol-resolver.js";

type HttpApp = FastifyInstance<any, any, any, any, any>;

const querySchema = z.object({
  refresh: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
    .optional()
    .transform((v) => v === "1" || v === "true"),
  identifier: z.string().min(1).max(64).optional(),
});

export async function registerAssetRoutes(app: HttpApp, service: AssetService) {
  const handler = async (identifier: string, refresh: boolean) => {
    return service.getAsset(identifier, { refresh });
  };

  app.get("/api/v1/asset", async (req, reply) => {
    const query = querySchema.parse(req.query);
    if (!query.identifier) {
      throw new AssetError(400, "INVALID_IDENTIFIER", "Pass identifier as /api/v1/asset/:id or ?identifier=");
    }
    return reply.send(await handler(query.identifier, query.refresh ?? false));
  });

  app.get("/api/v1/asset/*", async (req, reply) => {
    const wildcard = (req.params as { "*": string })["*"];
    const query = querySchema.parse(req.query);
    const identifier = decodeURIComponent(wildcard);
    return reply.send(await handler(identifier, query.refresh ?? false));
  });

  app.get("/api/v1/resolve/*", async (req, reply) => {
    const wildcard = (req.params as { "*": string })["*"];
    const identifier = decodeURIComponent(wildcard);
    try {
      return reply.send(symbolResolver.resolve(identifier));
    } catch (err) {
      throw new AssetError(400, "UNRESOLVABLE_IDENTIFIER", err instanceof Error ? err.message : "Cannot parse identifier");
    }
  });
}
