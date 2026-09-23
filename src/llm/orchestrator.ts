import type { Scorecard, ScoringEnrichment } from "../scoring/types.js";
import { investorScoringEngine } from "../scoring/investor-scoring-engine.js";
import type { UnifiedAssetPayload } from "../types/index.js";
import { buildFactsPack } from "./facts-pack.js";
import { parseLlmQualitative, type LlmQualitative } from "./schema.js";
import { buildUserPrompt, CORPORATE_SYSTEM_PROMPT } from "./system-prompt.js";
import type { LlmClient } from "./xai-client.js";

export interface InstitutionalAnalysis {
  identifier: string;
  asOf: string;
  scoring: Scorecard;
  qualitative: LlmQualitative | null;
  fairValueScenarios: Scorecard["fairValue"] & { narrative: string | null };
  provenance: {
    math: "deterministic_engine";
    language: "llm" | "omitted";
    model: string | null;
    factsHash: string;
  };
}

export class AnalysisOrchestrator {
  constructor(
    private readonly llm: LlmClient | null,
    private readonly modelName: string | null,
  ) {}

  async run(
    payload: UnifiedAssetPayload,
    enrichment: ScoringEnrichment = {},
    opts: { includeQualitative?: boolean } = {},
  ): Promise<InstitutionalAnalysis> {
    const scoring = investorScoringEngine.score(payload, enrichment);
    const facts = buildFactsPack(payload, scoring);
    const factsJson = JSON.stringify(facts, null, 2);
    const includeQualitative = opts.includeQualitative !== false && this.llm != null;

    let qualitative: LlmQualitative | null = null;
    if (includeQualitative && this.llm) {
      const raw = await this.llm.complete([
        { role: "system", content: CORPORATE_SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(factsJson, enrichment.filingNotes) },
      ]);
      qualitative = parseLlmQualitative(raw);
    }

    return {
      identifier: payload.identifier,
      asOf: payload.asOf,
      scoring,
      qualitative,
      fairValueScenarios: {
        ...scoring.fairValue,
        narrative: qualitative?.fairValueNarrative ?? null,
      },
      provenance: {
        math: "deterministic_engine",
        language: qualitative ? "llm" : "omitted",
        model: qualitative ? this.modelName : null,
        factsHash: fnv1a(factsJson),
      },
    };
  }
}

function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv1a_${(h >>> 0).toString(16)}`;
}
