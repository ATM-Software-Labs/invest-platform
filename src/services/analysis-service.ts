import type { AnalysisOrchestrator, InstitutionalAnalysis } from "../llm/orchestrator.js";
import type { ScoringEnrichment } from "../scoring/types.js";
import { AssetService } from "./asset-service.js";

export class AnalysisService {
  constructor(
    private readonly assets: AssetService,
    private readonly orchestrator: AnalysisOrchestrator,
  ) {}

  async analyze(
    identifier: string,
    opts: {
      refresh?: boolean;
      enrichment?: ScoringEnrichment;
      qualitative?: boolean;
    } = {},
  ): Promise<InstitutionalAnalysis> {
    const payload = await this.assets.getAsset(identifier, { refresh: opts.refresh });
    return this.orchestrator.run(payload, opts.enrichment ?? {}, {
      includeQualitative: opts.qualitative,
    });
  }
}
