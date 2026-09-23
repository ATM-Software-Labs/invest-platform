import { describe, expect, it } from "vitest";
import { FinancialNormalizer } from "../src/domain/financial-normalizer.js";
import type { BalanceSheet, CashFlowStatement, IncomeStatement } from "../src/types/index.js";

const normalizer = new FinancialNormalizer();

function stmt(year: number, extra: Partial<IncomeStatement> = {}): IncomeStatement {
  return {
    period: `${year}-12-31`,
    fiscalYear: year,
    periodType: "annual",
    currency: "EUR",
    revenue: 1000,
    costOfRevenue: 400,
    grossProfit: 600,
    operatingIncome: 200,
    ebit: 200,
    ebitda: 260,
    netIncome: 150,
    incomeTax: 42,
    sbc: 30,
    dilutedShares: 100,
    ...extra,
  };
}

function cash(year: number, extra: Partial<CashFlowStatement> = {}): CashFlowStatement {
  return {
    period: `${year}-12-31`,
    fiscalYear: year,
    periodType: "annual",
    currency: "EUR",
    operatingCashFlow: 180,
    capex: -50,
    depreciation: 60,
    leasePayments: 20,
    stockBasedCompensation: 30,
    freeCashFlowReported: 130,
    ...extra,
  };
}

function bal(year: number, extra: Partial<BalanceSheet> = {}): BalanceSheet {
  return {
    period: `${year}-12-31`,
    fiscalYear: year,
    periodType: "annual",
    currency: "EUR",
    totalAssets: 2000,
    currentLiabilities: 400,
    totalEquity: 800,
    cashAndEquivalents: 100,
    shortTermInvestments: 50,
    shortTermDebt: 80,
    longTermDebt: 420,
    capitalLeaseObligations: 80,
    totalDebt: 580,
    ...extra,
  };
}

describe("FinancialNormalizer", () => {
  it("computes real FCF as OCF minus capex and IFRS 16 leases", () => {
    const gaap = normalizer.normalize({
      accountingStandard: "US_GAAP",
      reportingCurrency: "EUR",
      incomeAnnual: [stmt(2024)],
      cashAnnual: [cash(2024)],
      balanceAnnual: [bal(2024)],
      incomeQuarter: [],
      cashQuarter: [],
      balanceQuarter: [],
      marketCap: 2000,
      enterpriseValue: null,
      price: 20,
      providers: ["test"],
    });
    expect(gaap.cashFlow.freeCashFlow).toBe(130);
    expect(gaap.margins.fcf).toBeCloseTo(0.13, 6);
    expect(gaap.cashFlow.sbcToFcf).toBeCloseTo(30 / 130, 6);

    const ifrs = normalizer.normalize({
      accountingStandard: "IFRS",
      reportingCurrency: "EUR",
      incomeAnnual: [stmt(2024)],
      cashAnnual: [cash(2024)],
      balanceAnnual: [bal(2024)],
      incomeQuarter: [],
      cashQuarter: [],
      balanceQuarter: [],
      marketCap: 2000,
      enterpriseValue: null,
      price: 20,
      providers: ["test"],
    });
    expect(ifrs.cashFlow.freeCashFlow).toBe(110);
    expect(ifrs.cashFlow.leasePaymentsIfrs16).toBe(20);
    expect(ifrs.margins.gross).toBeCloseTo(0.6, 6);
    expect(ifrs.margins.operating).toBeCloseTo(0.2, 6);
  });

  it("keeps ratios in reporting currency (no FX conversion)", () => {
    const m = normalizer.normalize({
      accountingStandard: "IFRS",
      reportingCurrency: "JPY",
      incomeAnnual: [stmt(2024, { currency: "JPY", revenue: 1_000_000, grossProfit: 400_000, operatingIncome: 100_000, ebit: 100_000, netIncome: 70_000 })],
      cashAnnual: [cash(2024, { currency: "JPY", operatingCashFlow: 120_000, capex: -20_000, leasePayments: 0 })],
      balanceAnnual: [bal(2024, { currency: "JPY" })],
      incomeQuarter: [],
      cashQuarter: [],
      balanceQuarter: [],
      marketCap: 2_000_000,
      enterpriseValue: null,
      price: 10,
      providers: ["test"],
    });
    expect(m.reportingCurrency).toBe("JPY");
    expect(m.margins.gross).toBeCloseTo(0.4, 6);
    expect(m.cashFlow.freeCashFlow).toBe(100_000);
  });

  it("computes 1Y/3Y/5Y net share change", () => {
    const incomeAnnual = [
      stmt(2024, { dilutedShares: 105 }),
      stmt(2023, { dilutedShares: 100 }),
      stmt(2022, { dilutedShares: 98 }),
      stmt(2021, { dilutedShares: 90 }),
      stmt(2020, { dilutedShares: 88 }),
      stmt(2019, { dilutedShares: 80 }),
    ];
    const m = normalizer.normalize({
      accountingStandard: "US_GAAP",
      reportingCurrency: "USD",
      incomeAnnual,
      cashAnnual: incomeAnnual.map((r) => cash(r.fiscalYear!)),
      balanceAnnual: incomeAnnual.map((r) => bal(r.fiscalYear!)),
      incomeQuarter: [],
      cashQuarter: [],
      balanceQuarter: [],
      marketCap: 1000,
      enterpriseValue: null,
      price: 10,
      providers: ["test"],
    });
    expect(m.dilution.netShareChange1Y).toBeCloseTo(0.05, 6);
    expect(m.dilution.netShareChange3Y).toBeCloseTo(105 / 90 - 1, 6);
    expect(m.dilution.netShareChange5Y).toBeCloseTo(105 / 80 - 1, 6);
  });

  it("segregates lease liabilities from net financial debt", () => {
    const m = normalizer.normalize({
      accountingStandard: "IFRS",
      reportingCurrency: "EUR",
      incomeAnnual: [stmt(2024)],
      cashAnnual: [cash(2024)],
      balanceAnnual: [bal(2024)],
      incomeQuarter: [],
      cashQuarter: [],
      balanceQuarter: [],
      marketCap: 2000,
      enterpriseValue: null,
      price: 20,
      providers: ["test"],
    });
    expect(m.capitalStructure.totalDebt).toBe(500);
    expect(m.capitalStructure.leaseLiabilities).toBe(80);
    expect(m.capitalStructure.cashAndShortTermInvestments).toBe(150);
    expect(m.capitalStructure.netFinancialDebt).toBe(350);
  });

  it("falls back to annual filings when the quarterly window has gaps", () => {
    const m = normalizer.normalize({
      accountingStandard: "US_GAAP",
      reportingCurrency: "USD",
      incomeAnnual: [stmt(2024)],
      cashAnnual: [cash(2024)],
      balanceAnnual: [bal(2024)],
      incomeQuarter: [stmt(2024, { period: "2024-12-31", periodType: "quarter" })],
      cashQuarter: [],
      balanceQuarter: [],
      marketCap: 2000,
      enterpriseValue: null,
      price: 20,
      providers: ["test"],
    });
    expect(m.periodUsed).toBe("annual");
    expect(m.dataQuality.fallbacksUsed).toContain("annual_because_quarter_incomplete");
  });

  it("builds TTM from four consecutive quarters", () => {
    const q = [0, 1, 2, 3].map((i) => {
      const month = 12 - i * 3;
      const year = month > 0 ? 2024 : 2023;
      const m = month > 0 ? month : month + 12;
      const period = `${year}-${String(m).padStart(2, "0")}-28`;
      return {
        income: stmt(year, { period, periodType: "quarter", revenue: 250, grossProfit: 150, operatingIncome: 50, ebit: 50, ebitda: 65, netIncome: 40 }),
        cash: cash(year, { period, periodType: "quarter", operatingCashFlow: 45, capex: -10, leasePayments: 0 }),
        bal: bal(year, { period, periodType: "quarter" }),
      };
    });
    const m = normalizer.normalize({
      accountingStandard: "US_GAAP",
      reportingCurrency: "USD",
      incomeAnnual: [],
      cashAnnual: [],
      balanceAnnual: [],
      incomeQuarter: q.map((x) => x.income),
      cashQuarter: q.map((x) => x.cash),
      balanceQuarter: q.map((x) => x.bal),
      marketCap: 2000,
      enterpriseValue: null,
      price: 20,
      providers: ["test"],
    });
    expect(m.periodUsed).toBe("ttm");
    expect(m.cashFlow.operatingCashFlow).toBe(180);
    expect(m.cashFlow.freeCashFlow).toBe(140);
    expect(m.dataQuality.fallbacksUsed).toContain("ttm_from_last_four_quarters");
  });
});
