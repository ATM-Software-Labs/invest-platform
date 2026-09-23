import { describe, expect, it } from "vitest";
import { AnalysisOrchestrator } from "../src/llm/orchestrator.js";
import { parseLlmQualitative } from "../src/llm/schema.js";
import { CORPORATE_SYSTEM_PROMPT } from "../src/llm/system-prompt.js";
import type { LlmClient } from "../src/llm/xai-client.js";
import { compounderMetrics, equityPayload } from "./helpers/payloads.js";

const validNote = {
  executiveSummary:
    "El activo presenta un perfil de compounder de calidad según los hechos deterministas. El ROIC a 5 años y el margen bruto superan los umbrales Buffett ya calculados. No hay evidencia de deterioro de caja en los factores auditados.",
  moatAnalysis: {
    type: "intangible_assets",
    rationale: "El margen bruto elevado y el ROIC persistente apuntan a activos intangibles, no a un recálculo de múltiplos.",
  },
  capitalAllocationVerdict: {
    stance: "shareholder_friendly",
    rationale: "La variación neta de acciones es negativa y el SBC sobre FCF permanece por debajo del umbral del motor.",
  },
  keyRisks: [
    {
      code: "technological_disruption",
      detail: "Riesgo de disrupción tecnológica típico de software; no se infiere un ratio nuevo.",
    },
  ],
  portfolioFit: {
    conservative: "good",
    growth: "good",
    value: "neutral",
    macro: "poor",
    rationale: "El bestFit Buffett del motor encaja en conservador y crecimiento, no en value profundo.",
  },
  fairValueNarrative:
    "Las bandas pesimista, base y optimista ya vienen del motor por múltiplos de FCF 12/18/25. No se altera el precio implícito.",
};

describe("LLM schema", () => {
  it("accepts a closed qualitative object", () => {
    const parsed = parseLlmQualitative(validNote);
    expect(parsed.moatAnalysis.type).toBe("intangible_assets");
  });

  it("rejects extra keys and invented enums", () => {
    expect(() => parseLlmQualitative({ ...validNote, extra: true })).toThrow();
    expect(() =>
      parseLlmQualitative({
        ...validNote,
        moatAnalysis: { type: "wide_moat", rationale: validNote.moatAnalysis.rationale },
      }),
    ).toThrow();
  });
});

describe("AnalysisOrchestrator", () => {
  it("never asks the model to compute scores and overwrites fair value from the engine", async () => {
    let capturedSystem = "";
    let capturedUser = "";
    const llm: LlmClient = {
      async complete(messages) {
        capturedSystem = messages[0]?.content ?? "";
        capturedUser = messages[1]?.content ?? "";
        return JSON.stringify({
          ...validNote,
          fairValueNarrative: "El modelo menciona un precio de 9999 que debe ignorarse frente al motor.",
        });
      },
    };
    const orch = new AnalysisOrchestrator(llm, "grok-4.6");
    const payload = equityPayload(compounderMetrics(), 140);
    const out = await orch.run(payload);

    expect(capturedSystem).toBe(CORPORATE_SYSTEM_PROMPT);
    expect(capturedSystem).toMatch(/forbidden from calculating/i);
    expect(capturedUser).toContain("DETERMINISTIC_FACTS");
    expect(capturedUser).toContain("\"affinity\": 100");
    expect(out.scoring.archetypes.buffett.affinity).toBe(100);
    expect(out.fairValueScenarios.pessimistic.impliedEquityValue).toBe(140 * 12);
    expect(out.fairValueScenarios.base.impliedEquityValue).toBe(140 * 18);
    expect(out.fairValueScenarios.optimistic.impliedEquityValue).toBe(140 * 25);
    expect(out.fairValueScenarios.narrative).toContain("9999");
    expect(out.provenance.math).toBe("deterministic_engine");
    expect(out.provenance.language).toBe("llm");
    expect(out.qualitative?.fairValueNarrative).toContain("9999");
  });

  it("skips the LLM when includeQualitative is false", async () => {
    let called = 0;
    const llm: LlmClient = {
      async complete() {
        called += 1;
        return JSON.stringify(validNote);
      },
    };
    const orch = new AnalysisOrchestrator(llm, "grok-4.6");
    const out = await orch.run(equityPayload(compounderMetrics()), {}, { includeQualitative: false });
    expect(called).toBe(0);
    expect(out.qualitative).toBeNull();
    expect(out.scoring.archetypes.buffett.affinity).toBe(100);
  });

  it("rejects malformed model JSON before returning", async () => {
    const llm: LlmClient = {
      async complete() {
        return JSON.stringify({ executiveSummary: "too short" });
      },
    };
    const orch = new AnalysisOrchestrator(llm, "grok-4.6");
    await expect(orch.run(equityPayload(compounderMetrics()))).rejects.toThrow();
  });
});
