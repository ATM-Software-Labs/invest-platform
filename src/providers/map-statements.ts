import type { BalanceSheet, CashFlowStatement, IncomeStatement, PeriodType } from "../types/index.js";
import { num } from "../domain/math.js";

export function mapIncome(row: Record<string, unknown>, periodType: Exclude<PeriodType, "ttm">): IncomeStatement {
  const period = String(row.date ?? row.fiscalDateEnding ?? row.period ?? row.fillingDate ?? "");
  return {
    period,
    fiscalYear: num(row.calendarYear ?? row.fiscalYear ?? period.slice(0, 4)),
    periodType,
    currency: String(row.reportedCurrency ?? row.currency ?? "USD"),
    revenue: num(row.revenue ?? row.totalRevenue ?? row.TotalRevenue),
    costOfRevenue: num(row.costOfRevenue ?? row.costofGoodsAndServicesSold ?? row.CostOfRevenue),
    grossProfit: num(row.grossProfit ?? row.GrossProfit),
    operatingIncome: num(row.operatingIncome ?? row.operatingIncomeLoss ?? row.OperatingIncome),
    ebit: num(row.ebit ?? row.EBIT ?? row.operatingIncome),
    ebitda: num(row.ebitda ?? row.EBITDA),
    netIncome: num(row.netIncome ?? row.NetIncome),
    incomeTax: num(row.incomeTaxExpense ?? row.incomeTax ?? row.IncomeTax),
    sbc: num(row.stockBasedCompensation ?? row.stockBasedCompensationToRevenue),
    dilutedShares: num(
      row.weightedAverageShsOutDil ??
        row.weightedAverageDilutedSharesOutstanding ??
        row.dilutedAverageShares ??
        row.commonStockSharesOutstanding,
    ),
  };
}

export function mapCash(row: Record<string, unknown>, periodType: Exclude<PeriodType, "ttm">): CashFlowStatement {
  const period = String(row.date ?? row.fiscalDateEnding ?? row.period ?? "");
  return {
    period,
    fiscalYear: num(row.calendarYear ?? row.fiscalYear ?? period.slice(0, 4)),
    periodType,
    currency: String(row.reportedCurrency ?? row.currency ?? "USD"),
    operatingCashFlow: num(
      row.operatingCashFlow ?? row.totalCashFromOperatingActivities ?? row.netCashProvidedByOperatingActivities,
    ),
    capex: num(
      row.capitalExpenditure ??
        row.investmentsInPropertyPlantAndEquipment ??
        row.capitalExpenditures ??
        row.CapEX,
    ),
    depreciation: num(row.depreciationAndAmortization ?? row.depreciation),
    leasePayments: num(
      row.paymentsOfLeaseLiabilities ??
        row.financeLeasePayments ??
        row.capitalLeasePayments ??
        row.leasePayments ??
        row.paymentsonLeases,
    ),
    stockBasedCompensation: num(row.stockBasedCompensation),
    freeCashFlowReported: num(row.freeCashFlow),
  };
}

export function mapBalance(row: Record<string, unknown>, periodType: Exclude<PeriodType, "ttm">): BalanceSheet {
  const period = String(row.date ?? row.fiscalDateEnding ?? row.period ?? "");
  return {
    period,
    fiscalYear: num(row.calendarYear ?? row.fiscalYear ?? period.slice(0, 4)),
    periodType,
    currency: String(row.reportedCurrency ?? row.currency ?? "USD"),
    totalAssets: num(row.totalAssets),
    currentLiabilities: num(row.totalCurrentLiabilities),
    totalEquity: num(row.totalStockholdersEquity ?? row.totalEquity),
    cashAndEquivalents: num(row.cashAndCashEquivalents ?? row.cashAndShortTermInvestments ?? row.cash),
    shortTermInvestments: num(row.shortTermInvestments),
    shortTermDebt: num(row.shortTermDebt ?? row.shortLongTermDebtTotal),
    longTermDebt: num(row.longTermDebt),
    capitalLeaseObligations: num(row.capitalLeaseObligations ?? row.leaseObligations),
    totalDebt: num(row.totalDebt),
  };
}
