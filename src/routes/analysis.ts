import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AnalysisService } from "../services/analysis-service.js";
import { AssetError } from "../types/index.js";
import { buildUniverseBoard } from "../universe/board.js";
import { directoryStats, searchDirectory } from "../universe/directory.js";

type HttpApp = FastifyInstance<any, any, any, any, any>;

const querySchema = z.object({
  refresh: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
    .optional()
    .transform((v) => v === "1" || v === "true"),
  qualitative: z
    .union([z.literal("1"), z.literal("true"), z.literal("0"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "1" || v === "true")),
  identifier: z.string().min(1).max(64).optional(),
});

const enrichmentSchema = z
  .object({
    priceToTangibleBook: z.number().finite().nullable().optional(),
    shortInterestPercent: z.number().finite().nullable().optional(),
    spxCorrelation: z.number().min(-1).max(1).nullable().optional(),
    realReturnAfterDebasement: z.number().finite().nullable().optional(),
    lowCostAdvantage: z.boolean().optional(),
    visibleDeleveragingCatalyst: z.boolean().optional(),
    filingNotes: z.string().max(20_000).optional(),
  })
  .strict();

const bodySchema = z
  .object({
    enrichment: enrichmentSchema.optional(),
    qualitative: z.boolean().optional(),
    refresh: z.boolean().optional(),
  })
  .strict()
  .optional();

export async function registerAnalysisRoutes(app: HttpApp, service: AnalysisService) {
  const run = async (
    identifier: string,
    query: z.infer<typeof querySchema>,
    body: z.infer<typeof bodySchema>,
  ) => {
    return service.analyze(identifier, {
      refresh: body?.refresh ?? query.refresh,
      qualitative: body?.qualitative ?? query.qualitative,
      enrichment: body?.enrichment,
    });
  };

  app.get("/api/v1/universe", async () => buildUniverseBoard(service));

  app.get("/api/v1/directory", async () => directoryStats());

  app.get("/api/v1/search", async (req) => {
    const query = req.query as { q?: string; limit?: string; country?: string; kind?: string; sector?: string };
    const q = String(query.q ?? "");
    const limitRaw = Number(query.limit ?? 40);
    const limit = Math.min(80, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 40));
    return {
      ...directoryStats(),
      query: q,
      results: searchDirectory(q, {
        limit,
        country: query.country,
        kind: query.kind,
        sector: query.sector,
      }),
    };
  });

  app.get("/api/v1/analysis", async (req) => {
    const query = querySchema.parse(req.query);
    if (!query.identifier) {
      throw new AssetError(400, "INVALID_IDENTIFIER", "Pass identifier as /api/v1/analysis/:id");
    }
    return run(query.identifier, query, undefined);
  });

  app.get("/api/v1/analysis/*", async (req) => {
    const identifier = decodeURIComponent((req.params as { "*": string })["*"]);
    const query = querySchema.parse(req.query);
    return run(identifier, query, undefined);
  });

  app.post("/api/v1/analysis/*", async (req) => {
    const identifier = decodeURIComponent((req.params as { "*": string })["*"]);
    const query = querySchema.parse(req.query);
    const body = bodySchema.parse(req.body ?? {});
    return run(identifier, query, body);
  });

  app.get("/api/v1/score/*", async (req) => {
    const identifier = decodeURIComponent((req.params as { "*": string })["*"]);
    const query = querySchema.parse(req.query);
    const analysis = await service.analyze(identifier, { refresh: query.refresh, qualitative: false });
    return analysis.scoring;
  });
}
