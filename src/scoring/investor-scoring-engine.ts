import type { UnifiedAssetPayload } from "../types/index.js";
import { BUFFETT, BURRY, DALIO, ENGINE_VERSION, GRAHAM, GREENBLATT, HARD_MONEY, LYNCH, SOROS } from "./constants.js";
import { deriveQuant, pct, x } from "./derived.js";
import { computeFairValue } from "./fair-value.js";
import type {
  ArchetypeId,
  ArchetypeScore,
  ScoreFactor,
  Scorecard,
  ScoringEnrichment,
} from "./types.js";

export class InvestorScoringEngine {
  score(payload: UnifiedAssetPayload, enrichment: ScoringEnrichment = {}): Scorecard {
    const derived = deriveQuant(payload, enrichment);
    const archetypes = {
      buffett: this.buffett(derived, enrichment),
      graham: this.graham(derived),
      lynch: this.lynch(derived),
      greenblatt: this.greenblatt(derived),
      burry: this.burry(derived, enrichment),
      dalio: this.dalio(derived),
      soros: this.soros(derived),
      hard_money: this.hardMoney(derived),
    } satisfies Record<ArchetypeId, ArchetypeScore>;

    const tieBreak: Record<ArchetypeId, number> = {
      buffett: 0,
      graham: 1,
      lynch: 2,
      greenblatt: 3,
      burry: 4,
      dalio: 5,
      soros: 6,
      hard_money: 7,
    };
    const ranked = (Object.values(archetypes) as ArchetypeScore[])
      .map((a) => ({ id: a.id, affinity: a.affinity }))
      .sort((a, b) => b.affinity - a.affinity || tieBreak[a.id] - tieBreak[b.id]);

    return {
      identifier: payload.identifier,
      asOf: payload.asOf,
      derived,
      archetypes,
      ranked,
      bestFit: ranked[0]!.id,
      fairValue: computeFairValue(payload),
      audit: {
        engine: "InvestorScoringEngine",
        version: ENGINE_VERSION,
        mathComputedAt: new Date().toISOString(),
        enrichmentUsed: Object.entries(enrichment)
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(([k]) => k),
      },
    };
  }

  private buffett(d: ReturnType<typeof deriveQuant>, enrichment: ScoringEnrichment): ArchetypeScore {
    const roicPass = d.roic5Y == null ? null : d.roic5Y >= BUFFETT.roic5YMin;
    const grossPass =
      d.grossMargin == null && !enrichment.lowCostAdvantage
        ? null
        : d.grossMargin != null && d.grossMargin >= BUFFETT.grossMarginMin
          ? true
          : Boolean(enrichment.lowCostAdvantage);
    const ndPass =
      d.netDebtToFcf == null && !(d.fcf != null && d.fcf > 0 && d.netFinancialDebt != null && d.netFinancialDebt <= 0)
        ? null
        : d.netDebtToFcf != null
          ? d.netDebtToFcf < BUFFETT.netDebtToFcfMax
          : true;
    const buyback = d.netShareChange1Y == null ? null : d.netShareChange1Y < 0;
    const sbcOk = d.sbcToFcf == null ? null : d.sbcToFcf < BUFFETT.sbcToFcfMax;
    const ownerPass = buyback === true && sbcOk === true ? true : buyback == null || sbcOk == null ? null : false;
    const yieldOk =
      d.fcfYield != null && d.fcfYield >= BUFFETT.fcfYieldMin && d.fcfYield <= BUFFETT.fcfYieldMax;
    const capexOk = d.capexToOcf == null ? true : d.capexToOcf >= 0 && d.capexToOcf <= BUFFETT.capexToOcfMax;
    const cashPass = d.fcf != null && d.fcf > 0 && yieldOk && capexOk ? true : d.fcf == null || d.fcfYield == null ? null : false;

    const factors: ScoreFactor[] = [
      this.factor({
        id: "buffett_roic_5y",
        label: "ROIC promedio 5 años ≥ 15%",
        maxPoints: BUFFETT.roicPoints,
        inputValue: d.roic5Y,
        threshold: `>= ${pct(BUFFETT.roic5YMin)}`,
        passed: roicPass,
        rationale: `ROIC 5Y = ${pct(d.roic5Y)}`,
      }),
      this.factor({
        id: "buffett_gross_or_cost",
        label: "Margen bruto ≥ 40% o ventaja de coste",
        maxPoints: BUFFETT.grossPoints,
        inputValue: d.grossMargin,
        threshold: `gross >= ${pct(BUFFETT.grossMarginMin)} OR lowCostAdvantage`,
        passed: grossPass,
        rationale: `Gross margin = ${pct(d.grossMargin)}; lowCostAdvantage=${Boolean(enrichment.lowCostAdvantage)}`,
      }),
      this.factor({
        id: "buffett_net_debt_fcf",
        label: "Deuda neta / FCF < 3.0x",
        maxPoints: BUFFETT.leveragePoints,
        inputValue: d.netDebtToFcf,
        threshold: `< ${BUFFETT.netDebtToFcfMax}x`,
        passed: ndPass,
        rationale: `Net debt / FCF = ${x(d.netDebtToFcf)}`,
      }),
      this.factor({
        id: "buffett_buybacks_sbc",
        label: "Recompras netas y SBC < 15% del FCF",
        maxPoints: BUFFETT.buybackPoints,
        inputValue: d.netShareChange1Y,
        threshold: "Δshares 1Y < 0 AND SBC/FCF < 15%",
        passed: ownerPass,
        rationale: `Δshares 1Y = ${pct(d.netShareChange1Y)}; SBC/FCF = ${pct(d.sbcToFcf)}`,
      }),
      this.factor({
        id: "buffett_fcf_quality",
        label: "FCF predecible y FCF yield saludable",
        maxPoints: BUFFETT.cashPoints,
        inputValue: d.fcfYield,
        threshold: `FCF>0 AND yield in [${pct(BUFFETT.fcfYieldMin)}, ${pct(BUFFETT.fcfYieldMax)}] AND capex/OCF ≤ ${pct(BUFFETT.capexToOcfMax)}`,
        passed: cashPass,
        rationale: `FCF yield = ${pct(d.fcfYield)}; capex/OCF = ${x(d.capexToOcf)}`,
      }),
    ];
    return this.pack("buffett", "Warren Buffett — Quality Compounder", factors);
  }

  private graham(d: ReturnType<typeof deriveQuant>): ArchetypeScore {
    const cheap = d.pFcf == null ? null : d.pFcf > 0 && d.pFcf < GRAHAM.pFcfMax;
    const bal =
      d.netDebtToFcf == null
        ? null
        : d.netDebtToFcf < GRAHAM.netDebtToFcfMax;
    const fcfOk = d.fcf == null ? null : d.fcf > 0;
    return this.pack("graham", "Benjamin Graham — Margin of Safety", [
      this.factor({
        id: "graham_cheap",
        label: "P/FCF < 12× (margen de seguridad)",
        maxPoints: GRAHAM.cheapPoints,
        inputValue: d.pFcf,
        threshold: `< ${GRAHAM.pFcfMax}x`,
        passed: cheap,
        rationale: `P/FCF = ${x(d.pFcf)}`,
      }),
      this.factor({
        id: "graham_balance",
        label: "Deuda neta / FCF < 1.0×",
        maxPoints: GRAHAM.balancePoints,
        inputValue: d.netDebtToFcf,
        threshold: `< ${GRAHAM.netDebtToFcfMax}x`,
        passed: bal,
        rationale: `Net debt / FCF = ${x(d.netDebtToFcf)}`,
      }),
      this.factor({
        id: "graham_fcf",
        label: "FCF positivo",
        maxPoints: GRAHAM.fcfPoints,
        inputValue: d.fcf,
        threshold: "FCF > 0",
        passed: fcfOk,
        rationale: `FCF = ${d.fcf ?? "n/a"}`,
      }),
    ]);
  }

  private lynch(d: ReturnType<typeof deriveQuant>): ArchetypeScore {
    const roic = d.roic5Y == null ? null : d.roic5Y >= LYNCH.roicMin;
    const yld =
      d.fcfYield == null
        ? null
        : d.fcfYield >= LYNCH.fcfYieldMin && d.fcfYield <= LYNCH.fcfYieldMax;
    const dil = d.netShareChange1Y == null ? null : d.netShareChange1Y < LYNCH.dilutionMax;
    return this.pack("lynch", "Peter Lynch — GARP", [
      this.factor({
        id: "lynch_roic",
        label: "ROIC 5Y ≥ 10%",
        maxPoints: LYNCH.roicPoints,
        inputValue: d.roic5Y,
        threshold: `>= ${pct(LYNCH.roicMin)}`,
        passed: roic,
        rationale: `ROIC 5Y = ${pct(d.roic5Y)}`,
      }),
      this.factor({
        id: "lynch_garp",
        label: "FCF yield GARP (2.5%–8%)",
        maxPoints: LYNCH.yieldPoints,
        inputValue: d.fcfYield,
        threshold: `[${pct(LYNCH.fcfYieldMin)}, ${pct(LYNCH.fcfYieldMax)}]`,
        passed: yld,
        rationale: `FCF yield = ${pct(d.fcfYield)}`,
      }),
      this.factor({
        id: "lynch_dilution",
        label: "Dilución 1Y < 5%",
        maxPoints: LYNCH.dilutionPoints,
        inputValue: d.netShareChange1Y,
        threshold: `< ${pct(LYNCH.dilutionMax)}`,
        passed: dil,
        rationale: `Δshares 1Y = ${pct(d.netShareChange1Y)}`,
      }),
    ]);
  }

  private greenblatt(d: ReturnType<typeof deriveQuant>): ArchetypeScore {
    const roic = d.roic5Y == null ? null : d.roic5Y >= GREENBLATT.roicMin;
    const ey = d.evEbitda == null ? null : d.evEbitda > 0 && d.evEbitda < GREENBLATT.evEbitdaMax;
    return this.pack("greenblatt", "Joel Greenblatt — Magic Formula", [
      this.factor({
        id: "gb_roic",
        label: "ROIC ≥ 15%",
        maxPoints: GREENBLATT.roicPoints,
        inputValue: d.roic5Y,
        threshold: `>= ${pct(GREENBLATT.roicMin)}`,
        passed: roic,
        rationale: `ROIC 5Y = ${pct(d.roic5Y)}`,
      }),
      this.factor({
        id: "gb_earnings_yield",
        label: "EV/EBITDA < 10× (earnings yield)",
        maxPoints: GREENBLATT.yieldPoints,
        inputValue: d.evEbitda,
        threshold: `< ${GREENBLATT.evEbitdaMax}x`,
        passed: ey,
        rationale: `EV/EBITDA = ${x(d.evEbitda)}`,
      }),
    ]);
  }

  private soros(d: ReturnType<typeof deriveQuant>): ArchetypeScore {
    const macro =
      d.assetClass === "bond" ||
      d.assetClass === "forex" ||
      d.isPhysicalMetal ||
      (d.assetClass === "crypto" && d.localTicker === "BTC");
    const hedge = d.isPhysicalMetal || (d.yield != null && d.yield > 0.04);
    const corr = d.spxCorrelation != null && Math.abs(d.spxCorrelation) <= 0.4;
    return this.pack("soros", "George Soros — Macro direccional", [
      this.factor({
        id: "soros_macro",
        label: "Instrumento macro (bono, FX, metal, BTC)",
        maxPoints: SOROS.macroInstrumentPoints,
        inputValue: macro,
        threshold: "bond | fx | metal | BTC",
        passed: macro,
        rationale: `class=${d.assetClass}; ticker=${d.localTicker}`,
      }),
      this.factor({
        id: "soros_hedge",
        label: "Carry > 4% o metal físico",
        maxPoints: SOROS.hedgePoints,
        inputValue: d.yield,
        threshold: "yield > 4% OR physical metal",
        passed: hedge,
        rationale: `yield=${pct(d.yield)}; metal=${d.isPhysicalMetal}`,
      }),
      this.factor({
        id: "soros_uncorr",
        label: "|ρ SPX| ≤ 0.40",
        maxPoints: SOROS.corrPoints,
        inputValue: d.spxCorrelation,
        threshold: "|ρ| ≤ 0.40",
        passed: d.spxCorrelation == null ? null : corr,
        partial: corr && d.spxCorrelationSource === "asset_class_prior" ? 12 : undefined,
        rationale: `ρ=${d.spxCorrelation ?? "n/a"} (${d.spxCorrelationSource})`,
      }),
    ]);
  }

  private burry(d: ReturnType<typeof deriveQuant>, enrichment: ScoringEnrichment): ArchetypeScore {
    const cheap =
      d.evEbitda == null && d.pFcf == null
        ? null
        : (d.evEbitda != null && d.evEbitda < BURRY.evEbitdaMax) || (d.pFcf != null && d.pFcf < BURRY.pFcfMax);
    const tbv = d.priceToTangibleBook == null ? null : d.priceToTangibleBook < BURRY.pTbvMax;
    const highYield = d.fcfYield == null ? null : d.fcfYield > BURRY.fcfYieldMin;
    const catalyst = enrichment.visibleDeleveragingCatalyst === true;
    const yieldPass =
      highYield === true && catalyst ? true : highYield == null ? null : highYield === true && !catalyst ? false : false;
    const short = d.shortInterestPercent == null ? null : d.shortInterestPercent >= BURRY.shortInterestMin;

    const factors: ScoreFactor[] = [
      this.factor({
        id: "burry_cheap_multiple",
        label: "EV/EBITDA < 6x o P/FCF < 8x",
        maxPoints: BURRY.cheapPoints,
        inputValue: d.evEbitda ?? d.pFcf,
        threshold: `EV/EBITDA < ${BURRY.evEbitdaMax} OR P/FCF < ${BURRY.pFcfMax}`,
        passed: cheap,
        rationale: `EV/EBITDA = ${x(d.evEbitda)}; P/FCF = ${x(d.pFcf)}`,
      }),
      this.factor({
        id: "burry_ptbv",
        label: "P/TBV < 1.2x",
        maxPoints: BURRY.tbvPoints,
        inputValue: d.priceToTangibleBook,
        threshold: `< ${BURRY.pTbvMax}x`,
        passed: tbv,
        rationale: `P/TBV = ${x(d.priceToTangibleBook)} (requiere enrichment.priceToTangibleBook)`,
      }),
      this.factor({
        id: "burry_fcf_catalyst",
        label: "FCF yield > 10% con catalizador de desapalancamiento",
        maxPoints: BURRY.catalystPoints,
        inputValue: d.fcfYield,
        threshold: `yield > ${pct(BURRY.fcfYieldMin)} AND visibleDeleveragingCatalyst`,
        passed: yieldPass,
        rationale: `FCF yield = ${pct(d.fcfYield)}; catalyst=${catalyst}`,
      }),
      this.factor({
        id: "burry_short_interest",
        label: "Short interest elevado o sentimiento extremo",
        maxPoints: BURRY.sentimentPoints,
        inputValue: d.shortInterestPercent,
        threshold: `short interest ≥ ${pct(BURRY.shortInterestMin)} of float`,
        passed: short,
        rationale: `Short interest = ${pct(d.shortInterestPercent)} (requiere enrichment.shortInterestPercent)`,
      }),
    ];
    return this.pack("burry", "Michael Burry — Deep Value & Asimetría Cíclica", factors);
  }

  private dalio(d: ReturnType<typeof deriveQuant>): ArchetypeScore {
    const infl = d.inflationResilience == null ? null : d.inflationResilience >= DALIO.inflationResilienceMin;
    const corrPass =
      d.spxCorrelation == null ? null : Math.abs(d.spxCorrelation) <= DALIO.absSpxCorrMax;
    const corrPrior = d.spxCorrelationSource === "asset_class_prior";
    const real = d.realReturn == null ? null : d.realReturn > DALIO.realReturnMin;
    const bal = d.sovereignOrCorporateBalance == null ? null : d.sovereignOrCorporateBalance >= DALIO.balanceMin;

    const factors: ScoreFactor[] = [
      this.factor({
        id: "dalio_inflation_growth",
        label: "Resiliencia inflación / crecimiento",
        maxPoints: DALIO.inflationPoints,
        inputValue: d.inflationResilience,
        threshold: `inflationResilience ≥ ${DALIO.inflationResilienceMin}`,
        passed: infl,
        rationale: `inflationResilience = ${d.inflationResilience ?? "n/a"}`,
      }),
      this.factor({
        id: "dalio_spx_corr",
        label: "Correlación moderada/baja vs S&P 500",
        maxPoints: DALIO.corrPoints,
        inputValue: d.spxCorrelation,
        threshold: `|ρ| ≤ ${DALIO.absSpxCorrMax}`,
        passed: corrPass === true && !corrPrior ? true : corrPass === false ? false : corrPass === true && corrPrior ? true : null,
        partial: corrPass === true && corrPrior ? DALIO.corrPriorPoints : undefined,
        rationale: `ρ(SPX) = ${d.spxCorrelation ?? "n/a"} (${d.spxCorrelationSource}${corrPrior ? "; prior = mitad de puntos" : ""})`,
      }),
      this.factor({
        id: "dalio_real_return",
        label: "Retorno real positivo tras devaluación monetaria",
        maxPoints: DALIO.realPoints,
        inputValue: d.realReturn,
        threshold: `fcf yield o TIR − ${pct(DALIO.debasementRate)} > 0 (no se inventa para cripto/oro)`,
        passed: real,
        rationale: `realReturn = ${pct(d.realReturn)}`,
      }),
      this.factor({
        id: "dalio_balance_restrictive",
        label: "Fortaleza de balance en tipos restrictivos",
        maxPoints: DALIO.balancePoints,
        inputValue: d.sovereignOrCorporateBalance,
        threshold: `balanceStrength ≥ ${DALIO.balanceMin}`,
        passed: bal,
        rationale: `balanceStrength = ${d.sovereignOrCorporateBalance ?? "n/a"}; NetDebt/FCF = ${x(d.netDebtToFcf)}; spread = ${d.creditSpreadBps ?? "n/a"} bps`,
      }),
    ];
    return this.pack("dalio", "Ray Dalio — Macro All-Weather / Risk Parity", factors);
  }

  private hardMoney(d: ReturnType<typeof deriveQuant>): ArchetypeScore {
    const s2fPass =
      !d.hasHardCap
        ? d.isHardMoneyCandidate
          ? false
          : null
        : d.stockToFlow == null
          ? null
          : d.stockToFlow >= HARD_MONEY.stockToFlowMin;
    const agencyPass = d.assetClass === "crypto" ? d.hasHardCap : d.isPhysicalMetal && d.subtype === "commodity_spot";
    const agencyPartial = d.isPhysicalMetal && d.subtype === "physical_etp" ? 18 : undefined;
    const decentAwarded = this.decentralizationPoints(d);
    const decentPass = decentAwarded === HARD_MONEY.decentralizationPoints ? true : decentAwarded > 0;

    const factors: ScoreFactor[] = [
      this.factor({
        id: "hard_s2f",
        label: "Emisión inmutable o extracción inelástica (S2F elevado)",
        maxPoints: HARD_MONEY.s2fPoints,
        inputValue: d.stockToFlow,
        threshold: `stock-to-flow ≥ ${HARD_MONEY.stockToFlowMin}`,
        passed: s2fPass,
        rationale: `S2F = ${d.stockToFlow ?? "n/a"}; supply inflation = ${pct(d.supplyInflation)}`,
      }),
      this.factor({
        id: "hard_no_agency",
        label: "Cero dilución corporativa / capex destructivo / agencia",
        maxPoints: HARD_MONEY.agencyPoints,
        inputValue: d.hasHardCap,
        threshold: "hard cap (BTC) o metal físico spot; ETP = parcial; resto 0",
        passed: agencyPass ? true : agencyPartial ? true : d.isHardMoneyCandidate ? false : false,
        partial: agencyPass ? undefined : agencyPartial,
        rationale: `hardCap=${d.hasHardCap}; physicalMetal=${d.isPhysicalMetal}; subtype=${d.subtype}`,
      }),
      {
        id: "hard_decentralization",
        label: "Descentralización y ausencia de contraparte bancaria",
        maxPoints: HARD_MONEY.decentralizationPoints,
        awarded: decentAwarded,
        inputValue: decentAwarded,
        threshold: "BTC=30, ETH=24, other crypto=15, physical metal=22, gold ETP=12, else 0",
        passed: decentPass,
        rationale: `subtype=${d.subtype}; awarded=${decentAwarded}/${HARD_MONEY.decentralizationPoints}`,
      },
    ];
    return this.pack("hard_money", "Tesis Monetaria Dura / Escuela Austriaca", factors);
  }

  private decentralizationPoints(d: ReturnType<typeof deriveQuant>): number {
    if (d.assetClass === "crypto") {
      if (d.localTicker === "BTC") return 30;
      if (d.localTicker === "ETH") return 16;
      return 8;
    }
    if (d.isPhysicalMetal && d.subtype === "commodity_spot") return 22;
    if (d.isPhysicalMetal && d.subtype === "physical_etp") return 8;
    return 0;
  }

  private factor(
    args: Omit<ScoreFactor, "awarded"> & { partial?: number },
  ): ScoreFactor {
    const { partial, ...rest } = args;
    let awarded = 0;
    if (partial != null) awarded = partial;
    else if (args.passed === true) awarded = args.maxPoints;
    return { ...rest, awarded };
  }

  private pack(id: ArchetypeId, name: string, factors: ScoreFactor[]): ArchetypeScore {
    const affinity = factors.reduce((s, f) => s + f.awarded, 0);
    const maxPoints = factors.reduce((s, f) => s + f.maxPoints, 0);
    return {
      id,
      name,
      affinity,
      maxPoints,
      factors,
      insufficientFactors: factors.filter((f) => f.passed === null).map((f) => f.id),
    };
  }
}

export const investorScoringEngine = new InvestorScoringEngine();
