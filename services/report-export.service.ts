import * as XLSX from "xlsx";

export class ReportExportService {
  /**
   * Prevents CSV / Excel Formula Injection (CSV Injection / CWE-1236).
   * Prepends a single quote (') if a cell value begins with dangerous characters (=, +, -, @, \t, \r).
   */
  static sanitizeCell(val: any): any {
    if (typeof val !== "string") return val;
    const trimmed = val.trim();
    if (/^[=+\-@\t\r]/.test(trimmed)) {
      return `'${trimmed}`;
    }
    return val;
  }

  /**
   * Sanitizes an entire dataset (array of objects or 2D array).
   */
  static sanitizeData<T extends Record<string, any>>(rows: T[]): T[] {
    return rows.map((row) => {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(row)) {
        sanitized[key] = this.sanitizeCell(value);
      }
      return sanitized;
    });
  }

  /**
   * Generate CSV buffer from structured row data with formula injection sanitization.
   */
  static generateCSV<T extends Record<string, any>>(data: T[], sheetName: string = "Report"): string {
    const sanitized = this.sanitizeData(data);
    const worksheet = XLSX.utils.json_to_sheet(sanitized);
    return XLSX.utils.sheet_to_csv(worksheet);
  }

  /**
   * Generate XLSX buffer from structured row data with formula injection sanitization.
   */
  static generateXLSX<T extends Record<string, any>>(data: T[], sheetName: string = "Report"): Buffer {
    const sanitized = this.sanitizeData(data);
    const worksheet = XLSX.utils.json_to_sheet(sanitized);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }

  /**
   * Formats Trial Balance data for export.
   */
  static formatTrialBalanceForExport(lines: any[]): Record<string, any>[] {
    return lines.map((l) => ({
      "Account Code": l.accountCode || "",
      "Account Name": l.accountName,
      "Financial Type": l.financialType,
      "Statement Group": l.statementGroup,
      "Opening Debit": l.openingDebit,
      "Opening Credit": l.openingCredit,
      "Period Debit": l.periodDebit,
      "Period Credit": l.periodCredit,
      "Closing Debit": l.closingDebit,
      "Closing Credit": l.closingCredit,
      "Net Debit": l.netDebit,
      "Net Credit": l.netCredit,
    }));
  }

  /**
   * Formats Profit & Loss statement data for export.
   */
  static formatPnLForExport(pnl: any): Record<string, any>[] {
    const rows: Record<string, any>[] = [];

    // Revenue
    rows.push({ Section: "REVENUE FROM OPERATIONS", "Account Name": "", Amount: "" });
    for (const r of pnl.revenueFromOperations || []) {
      rows.push({ Section: "Revenue", "Account Name": r.name, Amount: r.amount });
    }
    for (const o of pnl.otherIncome || []) {
      rows.push({ Section: "Other Income", "Account Name": o.name, Amount: o.amount });
    }
    rows.push({ Section: "TOTAL REVENUE", "Account Name": "", Amount: pnl.totalRevenue });

    // Expenses
    rows.push({ Section: "EXPENSES", "Account Name": "", Amount: "" });
    for (const e of pnl.operatingExpenses || []) {
      rows.push({ Section: "Operating Expenses", "Account Name": e.name, Amount: e.amount });
    }
    for (const c of pnl.employeeCosts || []) {
      rows.push({ Section: "Employee Costs", "Account Name": c.name, Amount: c.amount });
    }
    for (const d of pnl.depreciationAmortization || []) {
      rows.push({ Section: "Depreciation & Amortisation", "Account Name": d.name, Amount: d.amount });
    }
    for (const f of pnl.financeCosts || []) {
      rows.push({ Section: "Finance Costs", "Account Name": f.name, Amount: f.amount });
    }
    for (const x of pnl.otherExpenses || []) {
      rows.push({ Section: "Other Expenses", "Account Name": x.name, Amount: x.amount });
    }
    rows.push({ Section: "TOTAL EXPENSES", "Account Name": "", Amount: pnl.totalExpenses });

    // Net Profit
    rows.push({ Section: "NET PROFIT / (LOSS) AFTER TAX", "Account Name": "", Amount: pnl.netProfitAfterTax });

    return rows;
  }

  /**
   * Formats Balance Sheet data for export.
   */
  static formatBalanceSheetForExport(bs: any): Record<string, any>[] {
    const rows: Record<string, any>[] = [];

    // Assets
    rows.push({ Category: "NON-CURRENT ASSETS", Subcategory: "", Item: "", Amount: "" });
    rows.push({ Category: "Non-Current Assets", Subcategory: "Fixed Assets (Gross)", Item: "Gross Cost", Amount: bs.nonCurrentAssets.fixedAssetsGross });
    rows.push({ Category: "Non-Current Assets", Subcategory: "Less: Accumulated Depreciation", Item: "Depreciation Reserve", Amount: bs.nonCurrentAssets.accumulatedDepreciation });
    rows.push({ Category: "Non-Current Assets", Subcategory: "Fixed Assets (Net)", Item: "Net Book Value", Amount: bs.nonCurrentAssets.fixedAssetsNet });

    rows.push({ Category: "CURRENT ASSETS", Subcategory: "", Item: "", Amount: "" });
    rows.push({ Category: "Current Assets", Subcategory: "Trade Receivables", Item: "Customer Balances", Amount: bs.currentAssets.tradeReceivables });
    rows.push({ Category: "Current Assets", Subcategory: "Cash & Bank Balances", Item: "Bank Balances", Amount: bs.currentAssets.cashAndBank });
    rows.push({ Category: "Current Assets", Subcategory: "TDS Receivable", Item: "Tax Assets", Amount: bs.currentAssets.tdsReceivable });
    rows.push({ Category: "Current Assets", Subcategory: "GST Input Credit (ITC)", Item: "Statutory ITC", Amount: bs.currentAssets.gstInputCredit });
    rows.push({ Category: "TOTAL ASSETS", Subcategory: "", Item: "", Amount: bs.totalAssets });

    // Liabilities
    rows.push({ Category: "NON-CURRENT LIABILITIES", Subcategory: "", Item: "", Amount: "" });
    rows.push({ Category: "Non-Current Liabilities", Subcategory: "Long-Term Borrowings", Item: "Loans", Amount: bs.nonCurrentLiabilities.longTermBorrowings });

    rows.push({ Category: "CURRENT LIABILITIES", Subcategory: "", Item: "", Amount: "" });
    rows.push({ Category: "Current Liabilities", Subcategory: "Trade Payables", Item: "Vendor Balances", Amount: bs.currentLiabilities.tradePayables });
    rows.push({ Category: "Current Liabilities", Subcategory: "Employee Payables", Item: "Salary Balances", Amount: bs.currentLiabilities.employeePayables });
    rows.push({ Category: "Current Liabilities", Subcategory: "Customer Advances", Item: "Advance Deposits", Amount: bs.currentLiabilities.customerAdvances });
    rows.push({ Category: "Current Liabilities", Subcategory: "Statutory GST Payable", Item: "Output Tax", Amount: bs.currentLiabilities.statutoryGstPayable });
    rows.push({ Category: "Current Liabilities", Subcategory: "Statutory TDS Payable", Item: "Withholding Tax", Amount: bs.currentLiabilities.statutoryTdsPayable });

    // Equity
    rows.push({ Category: "EQUITY", Subcategory: "Capital", Item: "Share Capital", Amount: bs.equity.capital });
    rows.push({ Category: "EQUITY", Subcategory: "Less: Drawings", Item: "Owner Drawings", Amount: bs.equity.drawings });
    rows.push({ Category: "EQUITY", Subcategory: "Retained Earnings", Item: "Cumulative P&L", Amount: bs.equity.totalRetainedEarnings });
    rows.push({ Category: "TOTAL EQUITY & LIABILITIES", Subcategory: "", Item: "", Amount: bs.totalEquityAndLiabilities });

    return rows;
  }
}
