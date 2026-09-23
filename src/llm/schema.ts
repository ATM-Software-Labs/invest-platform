import { z } from "zod";

export const MoatType = z.enum([
  "network_effects",
  "switching_costs",
  "intangible_assets",
  "cost_advantage",
  "none",
]);

export const CapitalStance = z.enum([
  "shareholder_friendly",
  "reinvestment_heavy",
  "dilutive",
  "balance_sheet_repair",
  "not_applicable",
]);

export const RiskCode = z.enum([
  "covert_dilution",
  "high_rate_refinancing",
  "regulatory_or_vie_china",
  "technological_disruption",
  "custody_or_counterparty",
  "liquidity",
  "other",
]);

export const FitLevel = z.enum(["poor", "neutral", "good"]);

/**
 * LLM-only fields. Numeric valuation lives in the scoring engine and is merged after parse.
 * additionalProperties is forbidden so JSON Mode / Structured Outputs stay closed.
 */
export const LlmQualitativeSchema = z
  .object({
    executiveSummary: z
      .string()
      .min(40)
      .max(1200)
      .describe("Exactly three sentences. No new numbers. Cite only figures present in DETERMINISTIC_FACTS."),
    moatAnalysis: z
      .object({
        type: MoatType,
        rationale: z.string().min(20).max(2000),
      })
      .strict(),
    capitalAllocationVerdict: z
      .object({
        stance: CapitalStance,
        rationale: z.string().min(20).max(2000),
      })
      .strict(),
    keyRisks: z
      .array(
        z
          .object({
            code: RiskCode,
            detail: z.string().min(10).max(800),
          })
          .strict(),
      )
      .min(1)
      .max(6),
    portfolioFit: z
      .object({
        conservative: FitLevel,
        growth: FitLevel,
        value: FitLevel,
        macro: FitLevel,
        rationale: z.string().min(20).max(1500),
      })
      .strict(),
    fairValueNarrative: z
      .string()
      .min(20)
      .max(1500)
      .describe("Discuss the engine-supplied pessimistic/base/optimistic FCF bands. Do not recompute prices."),
  })
  .strict();

export type LlmQualitative = z.infer<typeof LlmQualitativeSchema>;

/** JSON Schema draft subset for xAI structured outputs (additionalProperties: false, all required). */
export const LLM_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "executiveSummary",
    "moatAnalysis",
    "capitalAllocationVerdict",
    "keyRisks",
    "portfolioFit",
    "fairValueNarrative",
  ],
  properties: {
    executiveSummary: { type: "string", minLength: 40, maxLength: 1200 },
    moatAnalysis: {
      type: "object",
      additionalProperties: false,
      required: ["type", "rationale"],
      properties: {
        type: {
          type: "string",
          enum: ["network_effects", "switching_costs", "intangible_assets", "cost_advantage", "none"],
        },
        rationale: { type: "string", minLength: 20, maxLength: 2000 },
      },
    },
    capitalAllocationVerdict: {
      type: "object",
      additionalProperties: false,
      required: ["stance", "rationale"],
      properties: {
        stance: {
          type: "string",
          enum: [
            "shareholder_friendly",
            "reinvestment_heavy",
            "dilutive",
            "balance_sheet_repair",
            "not_applicable",
          ],
        },
        rationale: { type: "string", minLength: 20, maxLength: 2000 },
      },
    },
    keyRisks: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["code", "detail"],
        properties: {
          code: {
            type: "string",
            enum: [
              "covert_dilution",
              "high_rate_refinancing",
              "regulatory_or_vie_china",
              "technological_disruption",
              "custody_or_counterparty",
              "liquidity",
              "other",
            ],
          },
          detail: { type: "string", minLength: 10, maxLength: 800 },
        },
      },
    },
    portfolioFit: {
      type: "object",
      additionalProperties: false,
      required: ["conservative", "growth", "value", "macro", "rationale"],
      properties: {
        conservative: { type: "string", enum: ["poor", "neutral", "good"] },
        growth: { type: "string", enum: ["poor", "neutral", "good"] },
        value: { type: "string", enum: ["poor", "neutral", "good"] },
        macro: { type: "string", enum: ["poor", "neutral", "good"] },
        rationale: { type: "string", minLength: 20, maxLength: 1500 },
      },
    },
    fairValueNarrative: { type: "string", minLength: 20, maxLength: 1500 },
  },
} as const;

export function parseLlmQualitative(raw: unknown): LlmQualitative {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return LlmQualitativeSchema.parse(parsed);
}

const NUMBER_INVENTION =
  /(?:fair\s*value|precio\s*objetivo|target\s*price|upside)\s*[:=]?\s*\$?\s*\d[\d,.]*/i;

export function assertNoInventedValuation(text: string, allowedNumbers: string[]): void {
  const tokens = text.match(/-?\d+(?:[.,]\d+)?/g) ?? [];
  const allowed = new Set(allowedNumbers);
  for (const tok of tokens) {
    const normalized = tok.replace(",", ".");
    if (allowed.has(tok) || allowed.has(normalized)) continue;
    const asNum = Number(normalized);
    if (!Number.isFinite(asNum)) continue;
    if (asNum >= 1000 && !allowed.has(String(Math.round(asNum)))) {
      if (NUMBER_INVENTION.test(text)) {
        throw new Error(`LLM invented a valuation figure not present in facts: ${tok}`);
      }
    }
  }
}
