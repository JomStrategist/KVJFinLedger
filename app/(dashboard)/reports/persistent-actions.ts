"use server";

import { requireActionAuth, requireActionAdmin } from "@/lib/auth-utils";
import { PersistentLedgerReportingService } from "@/services/persistent-ledger-reporting.service";
import { FiscalPeriodService } from "@/services/fiscal-period.service";
import { ReportExportService } from "@/services/report-export.service";
import { ActorContext } from "@/services/journal-posting.service";

function getActorFromSession(session: any): ActorContext {
  const user = session?.user || {};
  return {
    id: user.id || "admin",
    name: user.name || "Administrator",
    email: user.email || "admin@kvj.local",
    role: user.role || "ADMIN",
  };
}

export async function getPersistentTrialBalanceAction(params?: {
  fromDate?: string;
  toDate?: string;
  financialYear?: string;
}) {
  try {
    await requireActionAuth();
    const data = await PersistentLedgerReportingService.getTrialBalance({
      fromDate: params?.fromDate ? new Date(params.fromDate) : undefined,
      toDate: params?.toDate ? new Date(params.toDate) : undefined,
      financialYear: params?.financialYear,
    });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate persistent Trial Balance." };
  }
}

export async function getPersistentProfitAndLossAction(params?: {
  fromDate?: string;
  toDate?: string;
  financialYear?: string;
}) {
  try {
    await requireActionAuth();
    const data = await PersistentLedgerReportingService.getProfitAndLoss({
      fromDate: params?.fromDate ? new Date(params.fromDate) : undefined,
      toDate: params?.toDate ? new Date(params.toDate) : undefined,
      financialYear: params?.financialYear,
    });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate persistent Profit & Loss report." };
  }
}

export async function getPersistentBalanceSheetAction(params?: {
  asOfDate?: string;
  financialYear?: string;
}) {
  try {
    await requireActionAuth();
    const data = await PersistentLedgerReportingService.getBalanceSheet({
      asOfDate: params?.asOfDate ? new Date(params.asOfDate) : undefined,
      financialYear: params?.financialYear,
    });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate persistent Balance Sheet." };
  }
}

export async function getPersistentLedgerStatementAction(
  accountId: string,
  params?: { fromDate?: string; toDate?: string }
) {
  try {
    await requireActionAuth();
    const data = await PersistentLedgerReportingService.getLedgerStatement(accountId, {
      fromDate: params?.fromDate ? new Date(params.fromDate) : undefined,
      toDate: params?.toDate ? new Date(params.toDate) : undefined,
    });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch ledger statement." };
  }
}

export async function getHistoricalCoverageReportAction(params?: { financialYear?: string }) {
  try {
    await requireActionAuth();
    const data = await PersistentLedgerReportingService.getHistoricalCoverageReport(params);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to analyze historical ledger coverage." };
  }
}

export async function getCutoverReadinessReportAction() {
  try {
    await requireActionAdmin();
    const data = await PersistentLedgerReportingService.getCutoverReadinessReport();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to evaluate cutover readiness gates." };
  }
}

export async function closeFinancialYearAction(financialYear: string) {
  try {
    const session = await requireActionAdmin();
    const actor = getActorFromSession(session);
    const result = await FiscalPeriodService.closeFinancialYear(financialYear, actor);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to close financial year." };
  }
}

export async function exportReportAction(
  reportType: "TB" | "PNL" | "BS",
  format: "CSV" | "XLSX",
  params?: any
) {
  try {
    await requireActionAuth();

    if (reportType === "TB") {
      const tb = await PersistentLedgerReportingService.getTrialBalance(params);
      const rows = ReportExportService.formatTrialBalanceForExport(tb.lines);
      if (format === "CSV") {
        const csv = ReportExportService.generateCSV(rows, "Trial_Balance");
        return { success: true, format: "CSV", content: csv, filename: `Trial_Balance_${tb.financialYear}.csv` };
      } else {
        const buf = ReportExportService.generateXLSX(rows, "Trial_Balance");
        return {
          success: true,
          format: "XLSX",
          content: buf.toString("base64"),
          filename: `Trial_Balance_${tb.financialYear}.xlsx`,
        };
      }
    } else if (reportType === "PNL") {
      const pnl = await PersistentLedgerReportingService.getProfitAndLoss(params);
      const rows = ReportExportService.formatPnLForExport(pnl);
      if (format === "CSV") {
        const csv = ReportExportService.generateCSV(rows, "Profit_and_Loss");
        return { success: true, format: "CSV", content: csv, filename: `Profit_Loss_${pnl.financialYear}.csv` };
      } else {
        const buf = ReportExportService.generateXLSX(rows, "Profit_and_Loss");
        return {
          success: true,
          format: "XLSX",
          content: buf.toString("base64"),
          filename: `Profit_Loss_${pnl.financialYear}.xlsx`,
        };
      }
    } else {
      const bs = await PersistentLedgerReportingService.getBalanceSheet(params);
      const rows = ReportExportService.formatBalanceSheetForExport(bs);
      if (format === "CSV") {
        const csv = ReportExportService.generateCSV(rows, "Balance_Sheet");
        return { success: true, format: "CSV", content: csv, filename: `Balance_Sheet_${bs.financialYear}.csv` };
      } else {
        const buf = ReportExportService.generateXLSX(rows, "Balance_Sheet");
        return {
          success: true,
          format: "XLSX",
          content: buf.toString("base64"),
          filename: `Balance_Sheet_${bs.financialYear}.xlsx`,
        };
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to export report." };
  }
}
