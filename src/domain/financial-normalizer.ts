import type {
  AccountingStandard,
  BalanceSheet,
  CashFlowStatement,
  DataQuality,
  IncomeStatement,
  NormalizedEquityMetrics,
  PeriodType,
  ProviderBundle,
} from "../types/index.js";
import { abs, changeRate, mean, ratio, round, sortDesc, yearOf } from "./math.js";

const MISSING_QUARTER_FALLBACK = "annual_because_quarter_incomplete";
const TTM_FALLBACK = "ttm_from_last_four_quarters";

export interface NormalizeEquityInput {
  accountingStandard: AccountingStandard;
  reportingCurrency: string;
  incomeAnnual: IncomeStatement[];
  incomeQuarter: IncomeStatement[];
  cashAnnual: CashFlowStatement[];
  cashQuarter: CashFlowStatement[];
  balanceAnnual: BalanceSheet[];
  balanceQuarter: BalanceSheet[];
  marketCap: number | null;
  enterpriseValue: number | null;
  price: number | null;
  preferPeriod?: "annual" | "quarter" | "auto";
  providers: string[];
}

interface WorkingSet {
  income: IncomeStatement;
  cash: CashFlowStatement;
  balance: BalanceSheet;
  periodUsed: PeriodType;
  asOf: string;
  fallbacks: string[];
  warnings: string[];
}

export class FinancialNormalizer {
  normalize(input: NormalizeEquityInput): NormalizedEquityMetrics {
    const working = this.selectWorkingSet(input);
    const qualityMissing: string[] = [];
    const track = <T>(value: T | null, field: string): T | null => {
      if (value === null || value === undefined) qualityMissing.push(field);
      return value;
    };

    const income = working?.income;
    const cash = working?.cash;
    const balance = working?.balance;
    const standard = input.accountingStandard;

    const revenue = income?.revenue ?? null;
    const grossProfit =
      income?.grossProfit ??
      (income?.revenue != null && income.costOfRevenue != null
        ? income.revenue - income.costOfRevenue
        : null);
    const operatingIncome = income?.operatingIncome ?? income?.ebit ?? null;
    const netIncome = income?.netIncome ?? null;
    const ebitda = income?.ebitda ?? null;
    const ebit = income?.ebit ?? income?.operatingIncome ?? null;

    const ocf = cash?.operatingCashFlow ?? null;
    const capex = abs(cash?.capex ?? null);
    const leasePayments = abs(cash?.leasePayments ?? null);
    const sbc = cash?.stockBasedCompensation ?? income?.sbc ?? null;

    const ifrs = standard === "IFRS";
    const leaseAdj = ifrs ? (leasePayments ?? 0) : 0;
    if (ifrs && leasePayments) {
      working?.warnings.push(
        "IFRS 16: lease payments deducted from FCF so operating cash is comparable with US GAAP cash rents",
      );
    }

    let freeCashFlow: number | null = null;
    if (ocf != null && capex != null) {
      freeCashFlow = ocf - capex - leaseAdj;
    } else if (cash?.freeCashFlowReported != null && capex == null) {
      freeCashFlow = cash.freeCashFlowReported - leaseAdj;
      working?.fallbacks.push("reported_fcf_because_capex_missing");
    }

    const totalDebtRaw = this.totalDebt(balance);
    const leases = balance?.capitalLeaseObligations ?? null;
    const { financialDebt, leasesIncluded } = this.segregateDebt(totalDebtRaw, balance);
    const cashSt = this.cashAndSt(balance);
    const netFinancialDebt =
      financialDebt != null && cashSt != null ? financialDebt - cashSt : null;
    const netDebtInc =
      financialDebt != null && cashSt != null
        ? financialDebt + (leasesIncluded ? 0 : leases ?? 0) - cashSt
        : null;

    const grossMargin = ratio(grossProfit, revenue);
    const operatingMargin = ratio(operatingIncome, revenue);
    const netMargin = ratio(netIncome, revenue);
    const fcfMargin = ratio(freeCashFlow, revenue);
    const capexToOcf = ratio(capex, ocf);
    const sbcToFcf = ratio(sbc, freeCashFlow);

    const taxRate = this.effectiveTaxRate(income);
    const nopat = ebit != null && taxRate != null ? ebit * (1 - taxRate) : ebit;
    const investedCapital = this.investedCapital(balance, financialDebt);
    const roicLatest = ratio(nopat ?? null, investedCapital);
    const roe = ratio(netIncome, balance?.totalEquity ?? null);
    const roa = ratio(netIncome, balance?.totalAssets ?? null);

    const annualIncome = sortDesc(input.incomeAnnual);
    const annualBalance = sortDesc(input.balanceAnnual);
    const roic5Y = this.rollingRoic(annualIncome, annualBalance, 5);

    const shares = income?.dilutedShares ?? null;
    const shareSeries = this.shareSeries(annualIncome, input.incomeQuarter);
    const netShareChange1Y = changeRate(shareSeries.latest, shareSeries.y1);
    const netShareChange3Y = changeRate(shareSeries.latest, shareSeries.y3);
    const netShareChange5Y = changeRate(shareSeries.latest, shareSeries.y5);

    const marketCap = input.marketCap;
    const ev = input.enterpriseValue ?? this.impliedEv(marketCap, netDebtInc);
    const fcfYield = ratio(freeCashFlow, marketCap);
    const evEbitda = ratio(ev, ebitda);
    const pFcf = ratio(marketCap, freeCashFlow);
    const evSales = ratio(ev, revenue);
    const pe = ratio(marketCap, netIncome) ?? ratio(input.price, ratio(netIncome, shares));

    const fallbacks = working?.fallbacks ?? ["no_complete_statement_set"];
    const warnings = working?.warnings ?? ["Insufficient financial statements"];
    if (leasesIncluded) {
      warnings.push("Total debt appears to include lease liabilities; they were segregated");
    }

    const metrics: NormalizedEquityMetrics = {
      reportingCurrency: income?.currency ?? input.reportingCurrency,
      accountingStandard: standard,
      asOfFiscalPeriod: working?.asOf ?? null,
      periodUsed: working?.periodUsed ?? "annual",
      margins: {
        gross: round(track(grossMargin, "margins.gross")),
        operating: round(track(operatingMargin, "margins.operating")),
        net: round(track(netMargin, "margins.net")),
        fcf: round(track(fcfMargin, "margins.fcf")),
      },
      profitability: {
        roicLatest: round(track(roicLatest, "profitability.roicLatest")),
        roic5Y: round(track(roic5Y, "profitability.roic5Y")),
        roe: round(track(roe, "profitability.roe")),
        roa: round(track(roa, "profitability.roa")),
      },
      cashFlow: {
        operatingCashFlow: track(ocf, "cashFlow.operatingCashFlow"),
        capex: track(capex, "cashFlow.capex"),
        leasePaymentsIfrs16: ifrs ? leasePayments : leasePayments,
        freeCashFlow: track(freeCashFlow, "cashFlow.freeCashFlow"),
        fcfYield: round(track(fcfYield, "cashFlow.fcfYield")),
        capexToOcf: round(track(capexToOcf, "cashFlow.capexToOcf")),
        stockBasedCompensation: sbc,
        sbcToFcf: round(sbcToFcf),
      },
      capitalStructure: {
        totalDebt: track(financialDebt, "capitalStructure.totalDebt"),
        leaseLiabilities: leases,
        cashAndShortTermInvestments: cashSt,
        netFinancialDebt: round(track(netFinancialDebt, "capitalStructure.netFinancialDebt"), 2),
        netDebtIncludingLeases: round(netDebtInc, 2),
        netDebtToEbitda: round(ratio(netDebtInc, ebitda)),
      },
      dilution: {
        dilutedSharesOutstanding: shares,
        netShareChange1Y: round(netShareChange1Y),
        netShareChange3Y: round(netShareChange3Y),
        netShareChange5Y: round(netShareChange5Y),
      },
      multiples: {
        evEbitda: round(evEbitda),
        pFcf: round(pFcf),
        evSales: round(evSales),
        pe: round(pe),
      },
      dataQuality: this.quality(qualityMissing, fallbacks, warnings, working, input.providers),
    };

    return metrics;
  }

  fromBundle(
    bundle: ProviderBundle,
    extras: {
      accountingStandard: AccountingStandard;
      reportingCurrency: string;
      marketCap: number | null;
      enterpriseValue: number | null;
      price: number | null;
      providers: string[];
    },
  ): NormalizedEquityMetrics {
    return this.normalize({
      accountingStandard: extras.accountingStandard,
      reportingCurrency: extras.reportingCurrency,
      incomeAnnual: bundle.incomeAnnual,
      incomeQuarter: bundle.incomeQuarter,
      cashAnnual: bundle.cashAnnual,
      cashQuarter: bundle.cashQuarter,
      balanceAnnual: bundle.balanceAnnual,
      balanceQuarter: bundle.balanceQuarter,
      marketCap: extras.marketCap,
      enterpriseValue: extras.enterpriseValue,
      price: extras.price,
      providers: extras.providers,
    });
  }

  private selectWorkingSet(input: NormalizeEquityInput): WorkingSet | null {
    const fallbacks: string[] = [];
    const warnings: string[] = [];

    const ttm = this.tryTtm(input);
    if (ttm) {
      fallbacks.push(TTM_FALLBACK);
      return { ...ttm, periodUsed: "ttm", fallbacks, warnings };
    }

    const annual = this.align(
      sortDesc(input.incomeAnnual),
      sortDesc(input.cashAnnual),
      sortDesc(input.balanceAnnual),
    );
    if (annual) {
      if (input.incomeQuarter.length > 0 && input.incomeQuarter.length < 4) {
        fallbacks.push(MISSING_QUARTER_FALLBACK);
        warnings.push(
          "Quarterly series is incomplete; metrics computed from the last complete annual filing",
        );
      }
      return { ...annual, periodUsed: "annual", fallbacks, warnings };
    }

    const quarter = this.align(
      sortDesc(input.incomeQuarter),
      sortDesc(input.cashQuarter),
      sortDesc(input.balanceQuarter),
    );
    if (quarter) {
      fallbacks.push("single_quarter_because_annual_missing");
      warnings.push("Only a single quarter aligned; flow metrics are not annualized");
      return { ...quarter, periodUsed: "quarter", fallbacks, warnings };
    }

    return null;
  }

  private tryTtm(input: NormalizeEquityInput): Omit<WorkingSet, "periodUsed" | "fallbacks" | "warnings"> | null {
    const incomeQ = sortDesc(input.incomeQuarter);
    const cashQ = sortDesc(input.cashQuarter);
    const balanceQ = sortDesc(input.balanceQuarter);
    if (incomeQ.length < 4 || cashQ.length < 4 || balanceQ.length < 1) return null;

    const incomeWindow = incomeQ.slice(0, 4);
    const cashWindow = cashQ.slice(0, 4);
    if (this.hasGap(incomeWindow) || this.hasGap(cashWindow)) return null;

    const income = this.sumIncome(incomeWindow);
    const cash = this.sumCash(cashWindow);
    const balance = balanceQ[0]!;
    return { income, cash, balance, asOf: income.period };
  }

  private hasGap(rows: Array<{ period: string }>): boolean {
    if (rows.length < 2) return false;
    const times = rows.map((r) => Date.parse(r.period)).filter((t) => Number.isFinite(t));
    if (times.length !== rows.length) return false;
    for (let i = 0; i < times.length - 1; i++) {
      const deltaDays = Math.abs((times[i]! - times[i + 1]!) / 86_400_000);
      if (deltaDays > 140) return true;
    }
    return false;
  }

  private align(
    income: IncomeStatement[],
    cash: CashFlowStatement[],
    balance: BalanceSheet[],
  ): Omit<WorkingSet, "periodUsed" | "fallbacks" | "warnings"> | null {
    for (const inc of income) {
      const c = cash.find((x) => x.period === inc.period) ?? this.nearest(cash, inc.period);
      const b = balance.find((x) => x.period === inc.period) ?? this.nearest(balance, inc.period);
      if (c && b) {
        return { income: inc, cash: c, balance: b, asOf: inc.period };
      }
    }
    return null;
  }

  private nearest<T extends { period: string }>(rows: T[], period: string): T | undefined {
    const target = Date.parse(period);
    if (!Number.isFinite(target)) return rows[0];
    return [...rows].sort(
      (a, b) => Math.abs(Date.parse(a.period) - target) - Math.abs(Date.parse(b.period) - target),
    )[0];
  }

  private sumIncome(rows: IncomeStatement[]): IncomeStatement {
    const head = rows[0]!;
    const sum = (pick: (r: IncomeStatement) => number | null) => {
      const xs = rows.map(pick).filter((v): v is number => v != null);
      return xs.length ? xs.reduce((a, b) => a + b, 0) : null;
    };
    return {
      ...head,
      periodType: "quarter",
      revenue: sum((r) => r.revenue),
      costOfRevenue: sum((r) => r.costOfRevenue),
      grossProfit: sum((r) => r.grossProfit),
      operatingIncome: sum((r) => r.operatingIncome),
      ebit: sum((r) => r.ebit),
      ebitda: sum((r) => r.ebitda),
      netIncome: sum((r) => r.netIncome),
      incomeTax: sum((r) => r.incomeTax),
      sbc: sum((r) => r.sbc),
      dilutedShares: head.dilutedShares,
    };
  }

  private sumCash(rows: CashFlowStatement[]): CashFlowStatement {
    const head = rows[0]!;
    const sum = (pick: (r: CashFlowStatement) => number | null) => {
      const xs = rows.map(pick).filter((v): v is number => v != null);
      return xs.length ? xs.reduce((a, b) => a + b, 0) : null;
    };
    return {
      ...head,
      operatingCashFlow: sum((r) => r.operatingCashFlow),
      capex: sum((r) => r.capex),
      depreciation: sum((r) => r.depreciation),
      leasePayments: sum((r) => r.leasePayments),
      stockBasedCompensation: sum((r) => r.stockBasedCompensation),
      freeCashFlowReported: sum((r) => r.freeCashFlowReported),
    };
  }

  private totalDebt(balance: BalanceSheet | undefined): number | null {
    if (!balance) return null;
    if (balance.totalDebt != null) return balance.totalDebt;
    const parts = [balance.shortTermDebt, balance.longTermDebt].filter((v): v is number => v != null);
    if (!parts.length) return null;
    return parts.reduce((a, b) => a + b, 0);
  }

  private segregateDebt(
    totalDebt: number | null,
    balance: BalanceSheet | undefined,
  ): { financialDebt: number | null; leasesIncluded: boolean } {
    if (totalDebt == null) {
      const st = balance?.shortTermDebt ?? 0;
      const lt = balance?.longTermDebt ?? 0;
      if (balance?.shortTermDebt == null && balance?.longTermDebt == null) {
        return { financialDebt: null, leasesIncluded: false };
      }
      return { financialDebt: st + lt, leasesIncluded: false };
    }
    const leases = balance?.capitalLeaseObligations;
    const stlt =
      (balance?.shortTermDebt ?? 0) + (balance?.longTermDebt ?? 0);
    if (leases != null && totalDebt >= stlt + leases * 0.8 && leases > 0) {
      return { financialDebt: totalDebt - leases, leasesIncluded: true };
    }
    return { financialDebt: totalDebt, leasesIncluded: false };
  }

  private cashAndSt(balance: BalanceSheet | undefined): number | null {
    if (!balance) return null;
    if (balance.cashAndEquivalents == null && balance.shortTermInvestments == null) return null;
    return (balance.cashAndEquivalents ?? 0) + (balance.shortTermInvestments ?? 0);
  }

  private investedCapital(
    balance: BalanceSheet | undefined,
    financialDebt: number | null,
  ): number | null {
    if (!balance) return null;
    const equity = balance.totalEquity;
    const cash = this.cashAndSt(balance) ?? 0;
    if (equity != null && financialDebt != null) {
      const netDebt = financialDebt - cash;
      return equity + Math.max(netDebt, 0);
    }
    if (balance.totalAssets != null && balance.currentLiabilities != null) {
      return balance.totalAssets - balance.currentLiabilities - cash;
    }
    return null;
  }

  private effectiveTaxRate(income: IncomeStatement | undefined): number | null {
    if (!income || income.incomeTax == null || income.ebit == null || income.ebit === 0) {
      return 0.21;
    }
    const rate = income.incomeTax / income.ebit;
    if (!Number.isFinite(rate) || rate < 0 || rate > 0.6) return 0.21;
    return rate;
  }

  private rollingRoic(
    income: IncomeStatement[],
    balance: BalanceSheet[],
    years: number,
  ): number | null {
    const slice = income.slice(0, years);
    const roics = slice.map((inc) => {
      const b = balance.find((x) => x.period === inc.period) ?? this.nearest(balance, inc.period);
      const ebit = inc.ebit ?? inc.operatingIncome;
      const tax = this.effectiveTaxRate(inc);
      const nopat = ebit != null ? ebit * (1 - (tax ?? 0.21)) : null;
      const debt = this.totalDebt(b);
      const { financialDebt } = this.segregateDebt(debt, b);
      const ic = this.investedCapital(b, financialDebt);
      return ratio(nopat, ic);
    });
    return mean(roics);
  }

  private shareSeries(
    annual: IncomeStatement[],
    quarter: IncomeStatement[],
  ): { latest: number | null; y1: number | null; y3: number | null; y5: number | null } {
    const series = (annual.length ? annual : quarter).filter((r) => r.dilutedShares != null);
    const latest = series[0]?.dilutedShares ?? null;
    const y = yearOf(series[0]?.period ?? "");
    const findYearsAgo = (n: number) => {
      if (y == null) return series[n]?.dilutedShares ?? null;
      const row = series.find((r) => yearOf(r.period) === y - n);
      return row?.dilutedShares ?? series[n]?.dilutedShares ?? null;
    };
    return {
      latest,
      y1: findYearsAgo(1),
      y3: findYearsAgo(3),
      y5: findYearsAgo(5),
    };
  }

  private impliedEv(marketCap: number | null, netDebt: number | null): number | null {
    if (marketCap == null || netDebt == null) return null;
    return marketCap + netDebt;
  }

  private quality(
    missingFields: string[],
    fallbacks: string[],
    warnings: string[],
    working: WorkingSet | null,
    providers: string[],
  ): DataQuality {
    const expected = 16;
    const completeness = round(Math.max(0, 1 - missingFields.length / expected), 4) ?? 0;
    return {
      completeness,
      missingFields: [...new Set(missingFields)],
      fallbacksUsed: [...new Set(fallbacks)],
      warnings: [...new Set(warnings)],
      periodUsed: working?.periodUsed ?? "annual",
      asOfFiscalPeriod: working?.asOf ?? null,
      providers,
    };
  }
}

export const financialNormalizer = new FinancialNormalizer();
