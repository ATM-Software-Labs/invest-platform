import type { NormalizedMacroMetrics, ResolvedSymbol } from "../types/index.js";
import { round } from "./math.js";

const US10Y = "US10Y";

export class MacroNormalizer {
  normalize(args: {
    resolved: ResolvedSymbol;
    yieldValue: number | null;
    previousYield: number | null;
    benchmarkYield: number | null;
    quoteCurrency: string;
    providers: string[];
    asOf: string | null;
    baseRate?: number | null;
    quoteRate?: number | null;
  }): NormalizedMacroMetrics {
    const y = this.asDecimal(args.yieldValue);
    const prev = this.asDecimal(args.previousYield);
    const bench = this.asDecimal(args.benchmarkYield);
    const tenor = args.resolved.tenorYears ?? (args.resolved.assetClass === "bond" ? 10 : null);

    const spread =
      y != null && bench != null && args.resolved.canonicalTicker !== US10Y
        ? (y - bench) * 10_000
        : args.resolved.canonicalTicker === US10Y
          ? 0
          : null;

    const durations = tenor != null && y != null ? this.parBondDuration(y, tenor, args.resolved.country === "US" ? 2 : 1) : null;

    const carry =
      args.resolved.assetClass === "forex"
        ? this.carry(args.baseRate ?? null, args.quoteRate ?? null)
        : prev != null && y != null
          ? y - prev
          : null;

    const missing: string[] = [];
    if (y == null) missing.push("yield");
    if (args.resolved.assetClass === "bond" && spread == null && args.resolved.canonicalTicker !== US10Y) {
      missing.push("creditSpreadBps");
    }

    return {
      quoteCurrency: args.quoteCurrency,
      yield: round(y, 6),
      previousYield: round(prev, 6),
      creditSpreadBps: round(spread, 2),
      benchmarkYield: round(bench, 6),
      benchmarkTicker: args.resolved.assetClass === "bond" ? US10Y : null,
      modifiedDuration: round(durations?.modified ?? null, 4),
      macaulayDuration: round(durations?.macaulay ?? null, 4),
      carryDifferential: round(carry, 6),
      tenorYears: tenor,
      dataQuality: {
        completeness: round(Math.max(0, 1 - missing.length / 6), 4) ?? 0,
        missingFields: missing,
        fallbacksUsed: bench == null && args.resolved.assetClass === "bond" ? ["spread_omitted_no_benchmark"] : [],
        warnings: [],
        periodUsed: "ttm",
        asOfFiscalPeriod: args.asOf,
        providers: args.providers,
      },
    };
  }

  /**
   * Closed-form duration for a bond priced at par (coupon = yield).
   * frequency = 1 annual (Bunds/Bonos), 2 semi-annual (UST).
   */
  parBondDuration(
    yieldDecimal: number,
    tenorYears: number,
    frequency: 1 | 2,
  ): { macaulay: number; modified: number } | null {
    if (tenorYears <= 0 || yieldDecimal <= -0.99) return null;
    const n = tenorYears * frequency;
    const y = yieldDecimal / frequency;
    if (Math.abs(y) < 1e-12) {
      const macaulay = (tenorYears + 1) / 2;
      return { macaulay, modified: macaulay };
    }
    const macaulayPeriods = (1 + y) / y * (1 - Math.pow(1 + y, -n));
    const macaulay = macaulayPeriods / frequency;
    const modified = macaulay / (1 + y);
    return { macaulay, modified };
  }

  private asDecimal(value: number | null): number | null {
    if (value == null) return null;
    return Math.abs(value) > 1 ? value / 100 : value;
  }

  private carry(baseRate: number | null, quoteRate: number | null): number | null {
    if (baseRate == null || quoteRate == null) return null;
    const b = this.asDecimal(baseRate);
    const q = this.asDecimal(quoteRate);
    if (b == null || q == null) return null;
    return b - q;
  }
}

export const macroNormalizer = new MacroNormalizer();
