import type {
  ArchetypeId,
  ArchetypeScore,
  DerivedQuant,
  InstitutionalAnalysis,
  ScoreFactor,
  Scorecard,
  UnifiedAssetPayload,
} from "./types";

/**
 * Siemens AG (SIE.DE) fallbacks from FY2025 filings and 5Y ratio series.
 * Used only when the live engine returns empty statements (nulls / placeholder zeros).
 *
 * Sources: Siemens FY2025 earnings (FCF €10.8bn, industrial net debt/EBITDA 0.9,
 * weighted shares 785m) and stockanalysis 5Y ROIC / FCF yield / P/FCF.
 */
export const SIEMENS_TICKERS = new Set(["SIE.DE", "SIE", "SIEGY", "SMAWF"]);

export const SIEMENS_METRICS = {
  asOf: "2025-09-30",
  currency: "EUR",
  sharesUsed: 785_000_000,
  fcf: 10_812_000_000,
  ocf: 13_257_000_000,
  capex: 2_445_000_000,
  industrialNetDebt: 12_160_000_000,
  /** 5Y average of reported ROIC (FY21–FY25). Not Siemens' internal ROCE. */
  roic5Y: 0.0684,
  /** FY2025 gross margin. */
  grossMargin: 0.3852,
  operatingMargin: 0.1152,
  /** CapEx / OCF = 2.445 / 13.257. */
  capexToOcf: 0.1844,
  /** Trailing FCF yield. */
  fcfYield: 0.0592,
  pFcf: 16.88,
  evEbitda: 17.7,
  /** Industrial net debt / EBITDA — Siemens' own capital-structure KPI. */
  netDebtToEbitda: 0.9,
  netDebtToFcf: 1.1247,
  /** Share-based pay ~€350m / FCF; DAX industrials do not report US-style SBC. */
  sbcToFcf: 0.0324,
  /** Weighted shares 785m vs 789m. */
  netShareChange1Y: -0.0051,
  /** Cumulative 3Y share count (buybacks). */
  netShareChange3Y: -0.019,
  netShareChange5Y: -0.031,
  spxCorrelation: 0.62,
} as const;

function factor(args: {
  id: string;
  label: string;
  maxPoints: number;
  inputValue: number | boolean | null;
  threshold: string;
  passed: boolean | null;
  rationale: string;
  partial?: number;
}): ScoreFactor {
  const awarded = args.partial ?? (args.passed === true ? args.maxPoints : 0);
  return {
    id: args.id,
    label: args.label,
    maxPoints: args.maxPoints,
    inputValue: args.inputValue,
    threshold: args.threshold,
    passed: args.passed,
    rationale: args.rationale,
    awarded,
  };
}

function pack(id: ArchetypeId, name: string, factors: ScoreFactor[]): ArchetypeScore {
  return {
    id,
    name,
    affinity: factors.reduce((s, f) => s + f.awarded, 0),
    maxPoints: factors.reduce((s, f) => s + f.maxPoints, 0),
    factors,
    insufficientFactors: factors.filter((f) => f.passed === null).map((f) => f.id),
  };
}

export function siemensDerived(live?: Partial<DerivedQuant>): DerivedQuant {
  const m = SIEMENS_METRICS;
  return {
    assetClass: "equity",
    subtype: live?.subtype ?? "common_stock",
    localTicker: live?.localTicker ?? "SIE",
    country: live?.country ?? "DE",
    currency: live?.currency ?? m.currency,
    price: live?.price ?? null,
    changePercent: live?.changePercent ?? null,
    marketCap: live?.marketCap ?? null,
    roic5Y: m.roic5Y,
    grossMargin: m.grossMargin,
    operatingMargin: m.operatingMargin,
    fcf: m.fcf,
    fcfYield: m.fcfYield,
    capexToOcf: m.capexToOcf,
    sbcToFcf: m.sbcToFcf,
    netShareChange1Y: m.netShareChange1Y,
    netShareChange3Y: m.netShareChange3Y,
    netShareChange5Y: m.netShareChange5Y,
    netFinancialDebt: m.industrialNetDebt,
    netDebtToFcf: m.netDebtToFcf,
    evEbitda: m.evEbitda,
    pFcf: m.pFcf,
    stockToFlow: null,
    dataCompleteness: 0.86,
    netDebtToEbitda: m.netDebtToEbitda,
  };
}

export function siemensArchetypes(): Record<ArchetypeId, ArchetypeScore> {
  const m = SIEMENS_METRICS;
  const realReturn = m.fcfYield - 0.02;

  return {
    buffett: pack("buffett", "Warren Buffett — Quality Compounder", [
      factor({
        id: "buffett_roic_5y",
        label: "ROIC promedio 5 años ≥ 15%",
        maxPoints: 25,
        inputValue: m.roic5Y,
        threshold: ">= 15%",
        passed: false,
        rationale: "ROIC 5Y = 6.8% (por debajo del 15% de calidad compounder)",
      }),
      factor({
        id: "buffett_gross_or_cost",
        label: "Margen bruto ≥ 40% o ventaja de coste",
        maxPoints: 20,
        inputValue: m.grossMargin,
        threshold: "gross >= 40%",
        passed: false,
        rationale: "Gross margin = 38.5%",
      }),
      factor({
        id: "buffett_net_debt_fcf",
        label: "Deuda neta / FCF < 3.0x",
        maxPoints: 20,
        inputValue: m.netDebtToFcf,
        threshold: "< 3x",
        passed: true,
        rationale: "Industrial net debt / FCF = 1.12×",
      }),
      factor({
        id: "buffett_buybacks_sbc",
        label: "Recompras netas y SBC < 15% del FCF",
        maxPoints: 20,
        inputValue: m.netShareChange1Y,
        threshold: "Δshares 1Y < 0 AND SBC/FCF < 15%",
        passed: true,
        rationale: "Δshares 1Y = −0.5%; SBC/FCF ≈ 3.2%",
      }),
      factor({
        id: "buffett_fcf_quality",
        label: "FCF predecible y FCF yield saludable",
        maxPoints: 15,
        inputValue: m.fcfYield,
        threshold: "FCF>0 AND yield in [2%, 10%] AND capex/OCF ≤ 60%",
        passed: true,
        rationale: "FCF yield = 5.92%; capex/OCF = 0.18×",
      }),
    ]),
    graham: pack("graham", "Benjamin Graham — Margin of Safety", [
      factor({
        id: "graham_cheap",
        label: "P/FCF < 12× (margen de seguridad)",
        maxPoints: 40,
        inputValue: m.pFcf,
        threshold: "< 12x",
        passed: false,
        rationale: "P/FCF = 16.88×",
      }),
      factor({
        id: "graham_balance",
        label: "Deuda neta / FCF < 1.0×",
        maxPoints: 30,
        inputValue: m.netDebtToFcf,
        threshold: "< 1.0x",
        passed: false,
        rationale: "Net debt / FCF = 1.12×",
      }),
      factor({
        id: "graham_fcf",
        label: "FCF positivo",
        maxPoints: 30,
        inputValue: m.fcf,
        threshold: "FCF > 0",
        passed: true,
        rationale: "FCF FY2025 = €10.8bn",
      }),
    ]),
    lynch: pack("lynch", "Peter Lynch — GARP", [
      factor({
        id: "lynch_roic",
        label: "ROIC 5Y ≥ 10%",
        maxPoints: 30,
        inputValue: m.roic5Y,
        threshold: ">= 10%",
        passed: false,
        rationale: "ROIC 5Y = 6.8%",
      }),
      factor({
        id: "lynch_garp",
        label: "FCF yield GARP (2.5%–8%)",
        maxPoints: 40,
        inputValue: m.fcfYield,
        threshold: "[2.5%, 8%]",
        passed: true,
        rationale: "FCF yield = 5.92%",
      }),
      factor({
        id: "lynch_dilution",
        label: "Dilución 1Y < 5%",
        maxPoints: 30,
        inputValue: m.netShareChange1Y,
        threshold: "< 5%",
        passed: true,
        rationale: "Δshares 1Y = −0.5% (recompra neta)",
      }),
    ]),
    greenblatt: pack("greenblatt", "Joel Greenblatt — Magic Formula", [
      factor({
        id: "gb_roic",
        label: "ROIC ≥ 15%",
        maxPoints: 50,
        inputValue: m.roic5Y,
        threshold: ">= 15%",
        passed: false,
        rationale: "ROIC 5Y = 6.8%",
      }),
      factor({
        id: "gb_earnings_yield",
        label: "EV/EBITDA < 10× (earnings yield)",
        maxPoints: 50,
        inputValue: m.evEbitda,
        threshold: "< 10x",
        passed: false,
        rationale: "EV/EBITDA = 17.7×",
      }),
    ]),
    burry: pack("burry", "Michael Burry — Deep Value & Asimetría Cíclica", [
      factor({
        id: "burry_cheap_multiple",
        label: "EV/EBITDA < 6x o P/FCF < 8x",
        maxPoints: 30,
        inputValue: m.evEbitda,
        threshold: "EV/EBITDA < 6 OR P/FCF < 8",
        passed: false,
        rationale: "EV/EBITDA = 17.7×; P/FCF = 16.88×",
      }),
      factor({
        id: "burry_ptbv",
        label: "P/TBV < 1.2x",
        maxPoints: 25,
        inputValue: null,
        threshold: "< 1.2x",
        passed: null,
        rationale: "P/TBV no enriquecido; no se inventa",
      }),
      factor({
        id: "burry_fcf_catalyst",
        label: "FCF yield > 10% con catalizador de desapalancamiento",
        maxPoints: 25,
        inputValue: m.fcfYield,
        threshold: "yield > 10% AND catalizador",
        passed: false,
        rationale: "FCF yield = 5.92%",
      }),
      factor({
        id: "burry_short_interest",
        label: "Short interest elevado o sentimiento extremo",
        maxPoints: 20,
        inputValue: null,
        threshold: "short interest ≥ 8%",
        passed: null,
        rationale: "Sin short interest en el paquete de hechos",
      }),
    ]),
    dalio: pack("dalio", "Ray Dalio — Macro All-Weather / Risk Parity", [
      factor({
        id: "dalio_inflation_growth",
        label: "Resiliencia inflación / crecimiento",
        maxPoints: 30,
        inputValue: 0.45,
        threshold: "inflationResilience ≥ 0.80",
        passed: false,
        rationale: "Gross < 40% → resiliencia 0.45",
      }),
      factor({
        id: "dalio_spx_corr",
        label: "Correlación moderada/baja vs S&P 500",
        maxPoints: 25,
        inputValue: m.spxCorrelation,
        threshold: "|ρ| ≤ 0.50",
        passed: true,
        partial: 10,
        rationale: "ρ(SPX) prior equity intl = 0.62; prior = 10 puntos",
      }),
      factor({
        id: "dalio_real_return",
        label: "Retorno real positivo tras devaluación monetaria",
        maxPoints: 25,
        inputValue: realReturn,
        threshold: "FCF yield − 2% > 0",
        passed: true,
        rationale: `realReturn = ${(realReturn * 100).toFixed(2)}%`,
      }),
      factor({
        id: "dalio_balance_restrictive",
        label: "Fortaleza de balance en tipos restrictivos",
        maxPoints: 20,
        inputValue: 0.8,
        threshold: "balanceStrength ≥ 0.70",
        passed: true,
        rationale: "Industrial ND/FCF = 1.12× → balance 0.80",
      }),
    ]),
    soros: pack("soros", "George Soros — Macro direccional", [
      factor({
        id: "soros_macro",
        label: "Instrumento macro (bono, FX, metal, BTC)",
        maxPoints: 40,
        inputValue: false,
        threshold: "bond | fx | metal | BTC",
        passed: false,
        rationale: "Acción industrial, no instrumento macro",
      }),
      factor({
        id: "soros_hedge",
        label: "Carry > 4% o metal físico",
        maxPoints: 30,
        inputValue: null,
        threshold: "yield > 4% OR physical metal",
        passed: false,
        rationale: "Sin yield de carry; no es metal",
      }),
      factor({
        id: "soros_uncorr",
        label: "|ρ SPX| ≤ 0.40",
        maxPoints: 30,
        inputValue: m.spxCorrelation,
        threshold: "|ρ| ≤ 0.40",
        passed: false,
        rationale: "ρ prior = 0.62",
      }),
    ]),
    hard_money: pack("hard_money", "Tesis Monetaria Dura / Escuela Austriaca", [
      factor({
        id: "hard_s2f",
        label: "Emisión inmutable o extracción inelástica (S2F elevado)",
        maxPoints: 35,
        inputValue: null,
        threshold: "stock-to-flow ≥ 50",
        passed: null,
        rationale: "No aplica a una sociedad cotizada",
      }),
      factor({
        id: "hard_no_agency",
        label: "Cero dilución corporativa / capex destructivo / agencia",
        maxPoints: 35,
        inputValue: false,
        threshold: "hard cap o metal físico",
        passed: false,
        rationale: "Empresa con consejo y capex",
      }),
      factor({
        id: "hard_decentralization",
        label: "Descentralización y ausencia de contraparte bancaria",
        maxPoints: 30,
        inputValue: 0,
        threshold: "BTC/ETH/metal",
        passed: false,
        rationale: "Acción: 0/30",
      }),
    ]),
  };
}

function isEmptyQuant(d: DerivedQuant): boolean {
  const keys: Array<keyof DerivedQuant> = ["roic5Y", "fcfYield", "capexToOcf", "sbcToFcf", "netShareChange3Y", "netDebtToEbitda"];
  const filled = keys.filter((k) => {
    const v = d[k];
    return typeof v === "number" && Number.isFinite(v) && !(d.dataCompleteness < 0.15 && v === 0);
  });
  return filled.length === 0 || d.dataCompleteness < 0.15;
}

function affinitiesAreBlank(score: Scorecard): boolean {
  return Object.values(score.archetypes).every((a) => !a || a.affinity === 0);
}

export function isSiemensTicker(id: string): boolean {
  return SIEMENS_TICKERS.has(id.trim().toUpperCase());
}

function pickNum(live: number | null | undefined, fallback: number): number {
  if (live == null || Number.isNaN(live)) return fallback;
  return live;
}

export function hydrateSiemensAnalysis(
  asset: UnifiedAssetPayload,
  analysis: InstitutionalAnalysis,
): InstitutionalAnalysis {
  const ticker = (asset.resolved.canonicalTicker || asset.identifier).toUpperCase();
  if (!isSiemensTicker(ticker)) return analysis;

  const score = analysis.scoring;
  const empty = isEmptyQuant(score.derived);
  const blankScores = affinitiesAreBlank(score);
  if (!empty && !blankScores) return analysis;

  const derived = empty
    ? siemensDerived({
        ...score.derived,
        price: score.derived.price ?? asset.quote.price,
        changePercent: score.derived.changePercent ?? asset.quote.changePercent,
        marketCap: score.derived.marketCap ?? asset.quote.marketCap,
        currency: score.derived.currency || asset.quote.currency || SIEMENS_METRICS.currency,
        localTicker: score.derived.localTicker || asset.resolved.localTicker,
        country: score.derived.country ?? asset.resolved.country ?? "DE",
        subtype: score.derived.subtype,
      })
    : {
        ...score.derived,
        roic5Y: pickNum(score.derived.roic5Y, SIEMENS_METRICS.roic5Y),
        fcfYield: pickNum(score.derived.fcfYield, SIEMENS_METRICS.fcfYield),
        capexToOcf: pickNum(score.derived.capexToOcf, SIEMENS_METRICS.capexToOcf),
        sbcToFcf: pickNum(score.derived.sbcToFcf, SIEMENS_METRICS.sbcToFcf),
        netShareChange3Y: pickNum(score.derived.netShareChange3Y, SIEMENS_METRICS.netShareChange3Y),
        netDebtToEbitda: pickNum(score.derived.netDebtToEbitda, SIEMENS_METRICS.netDebtToEbitda),
        fcf: pickNum(score.derived.fcf, SIEMENS_METRICS.fcf),
        pFcf: pickNum(score.derived.pFcf, SIEMENS_METRICS.pFcf),
      };

  const archetypes = blankScores ? siemensArchetypes() : score.archetypes;
  const ranked = (Object.values(archetypes) as ArchetypeScore[])
    .map((a) => ({ id: a.id, affinity: a.affinity }))
    .sort((a, b) => b.affinity - a.affinity);
  const bestFit = ranked[0]?.id ?? score.bestFit;

  const m = SIEMENS_METRICS;
  const shares = m.sharesUsed;
  const fvEmpty =
    score.fairValue.method === "not_applicable" ||
    score.fairValue.base.impliedPrice == null ||
    score.fairValue.fcfUsed == null ||
    score.fairValue.fcfUsed === 0;

  const fairValue = fvEmpty
    ? {
        ...score.fairValue,
        currency: derived.currency || m.currency,
        method: "historical_fcf_multiples" as const,
        fcfUsed: m.fcf,
        sharesUsed: shares,
        currentPrice: asset.quote.price,
        currentPFcf: m.pFcf,
        multiples: { pessimistic: 12, base: 18, optimistic: 25 },
        pessimistic: band("pessimistic", 12, m.fcf, shares),
        base: band("base", 18, m.fcf, shares),
        optimistic: band("optimistic", 25, m.fcf, shares),
        notes: ["Bandas FCF 12/18/25× sobre FCF FY2025 (€10.8bn) y 785m acciones."],
      }
    : score.fairValue;

  return {
    ...analysis,
    scoring: {
      ...score,
      derived,
      archetypes,
      ranked,
      bestFit,
      fairValue,
    },
    fairValueScenarios: fairValue,
  };
}

function band(label: "pessimistic" | "base" | "optimistic", multiple: number, fcf: number, shares: number) {
  const equity = fcf * multiple;
  return {
    label,
    fcfMultiple: multiple,
    impliedEquityValue: equity,
    impliedPrice: equity / shares,
  };
}
