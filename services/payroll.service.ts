import { prisma } from "@/lib/prisma";
import { AccountingEngine } from "./accounting-engine.service";
import { EmployeeAdvanceService } from "./employee-advance.service";
import { convertNumberToIndianWords } from "@/lib/utils/indian-currency-words";
import { BankingPayoutRecord, generateCorporateBankBatchFile, BankPortalType } from "@/lib/banking-export";

export interface BatchPayrollEmployeeItem {
  employeeId: string;
  baseSalary: number;
  totalDays: number;
  lopDays: number;
  grossAmount: number;
  advanceDeduction?: number;
  tdsAmount?: number;
  netAmount: number;
  bankAccountNo?: string;
  bankIfsc?: string;
  bankName?: string;
  notes?: string;
}

export interface BatchPayrollInput {
  periodMonth: string; // e.g. "October 2026"
  paymentDate: string; // YYYY-MM-DD
  paymentMode?: string; // "BANK" | "CASH" | "CHEQUE"
  reference?: string;
  items: BatchPayrollEmployeeItem[];
}

export interface SalaryBreakdown {
  basic: number;
  hra: number;
  specialAllowance: number;
  grossEarnings: number;
  providentFund: number;
  professionalTax: number;
  tdsSection192: number;
  advanceRecovery: number;
  totalDeductions: number;
  netDisbursement: number;
  netInWords: string;
}

export class PayrollService {
  /**
   * Computes standard Indian payroll earnings & deductions breakdown.
   * Standard Structure:
   * - Basic Salary: 50% of Gross
   * - House Rent Allowance (HRA): 25% of Gross
   * - Special Allowance: 25% of Gross
   * - Professional Tax (PT): ₹200
   */
  static computeSalaryBreakdown(
    grossAmount: number,
    options?: {
      lopDays?: number;
      totalDays?: number;
      tdsAmount?: number;
      advanceDeduction?: number;
      includePf?: boolean;
    }
  ): SalaryBreakdown {
    const gross = Math.max(0, Number(grossAmount) || 0);

    const basic = Math.round(gross * 0.5);
    const hra = Math.round(gross * 0.25);
    const specialAllowance = Math.max(0, gross - (basic + hra));

    // Deductions
    const pf = options?.includePf ? Math.min(1800, Math.round(basic * 0.12)) : 0;
    const pt = gross > 15000 ? 200 : 0; // Standard Indian PT slab
    const tds = Math.max(0, Number(options?.tdsAmount || 0));
    const advance = Math.max(0, Number(options?.advanceDeduction || 0));

    const totalDeductions = pf + pt + tds + advance;
    const net = Math.max(0, gross - totalDeductions);

    return {
      basic,
      hra,
      specialAllowance,
      grossEarnings: gross,
      providentFund: pf,
      professionalTax: pt,
      tdsSection192: tds,
      advanceRecovery: advance,
      totalDeductions,
      netDisbursement: net,
      netInWords: convertNumberToIndianWords(net),
    };
  }

  /**
   * Run Batch Payroll wizard for multiple employees in a single transaction.
   */
  static async runBatchPayroll(input: BatchPayrollInput) {
    if (!input.items || input.items.length === 0) {
      throw new Error("No employees selected for payroll batch.");
    }

    // Find or create 'Salaries & Wages' category
    let salaryCategory = await prisma.expenseCategory.findFirst({
      where: {
        OR: [
          { name: { contains: "Salary", mode: "insensitive" } },
          { name: { contains: "Wage", mode: "insensitive" } },
          { code: "SALARY" },
        ],
      },
    });

    if (!salaryCategory) {
      salaryCategory = await prisma.expenseCategory.create({
        data: {
          name: "Salaries & Wages",
          code: "EXP-SAL-001",
          statementGroup: "Employee Benefits Expense",
          financialType: "EXPENSE",
          accountNature: "DEBIT",
          description: "Staff and executive remuneration",
        },
      });
    }

    const paymentDate = new Date(input.paymentDate || new Date());
    const year = paymentDate.getFullYear();
    const createdExpenses: any[] = [];
    const bankingRecords: BankingPayoutRecord[] = [];

    let totalGross = 0;
    let totalTds = 0;
    let totalAdvancesDeducted = 0;
    let totalNet = 0;

    for (const item of input.items) {
      const employee = await prisma.employee.findUnique({
        where: { id: item.employeeId },
      });
      if (!employee) continue;

      const gross = Number(item.grossAmount);
      if (gross <= 0) continue;

      const tds = Number(item.tdsAmount || 0);
      const advDeduction = Number(item.advanceDeduction || 0);
      const net = Math.max(0, gross - tds - advDeduction);

      // Create unique Expense Number
      const expCount = await prisma.expense.count();
      const expenseNumber = `EXP-${year}-${(expCount + 1).toString().padStart(4, "0")}`;

      const expense = await prisma.expense.create({
        data: {
          expenseNumber,
          expenseDate: paymentDate,
          description: `Salary Payout - ${employee.name} (${input.periodMonth})`,
          notes: item.notes || `Monthly Payroll Run - ${employee.name} [${employee.employeeCode || "EMP"}] (${input.periodMonth})${advDeduction > 0 ? ` (Less Adv: ₹${advDeduction})` : ""}${input.reference ? ` Ref: ${input.reference}` : ""}`,
          categoryId: salaryCategory.id,
          paidBy: "COMPANY",
          employeeId: employee.id,
          paymentStatus: "PAID",
          status: "APPROVED",
          taxableAmount: gross,
          subtotal: gross,
          inputCGST: 0,
          inputSGST: 0,
          inputIGST: 0,
          totalInputGST: 0,
          tdsRate: gross > 0 ? (tds / gross) * 100 : 0,
          tdsAmount: tds,
          tdsSection: tds > 0 ? "192" : undefined,
          grossAmount: gross,
          netAmount: net,
          paidAmount: net,
          advanceAmount: advDeduction,
          isAsset: false,
          items: {
            create: [
              {
                categoryId: salaryCategory.id,
                categoryNameSnapshot: salaryCategory.name,
                quantity: 1,
                unit: "Month",
                unitPrice: gross,
                taxableAmount: gross,
                gstRate: 0,
                cgstAmount: 0,
                sgstAmount: 0,
                igstAmount: 0,
                totalGST: 0,
                tdsRate: gross > 0 ? (tds / gross) * 100 : 0,
                tdsAmount: tds,
                totalAmount: gross,
              },
            ],
          },
        },
        include: {
          employee: true,
          category: true,
        },
      });

      // Deduct advance balance if applicable
      if (advDeduction > 0) {
        await EmployeeAdvanceService.deductAdvanceInPayroll(employee.id, advDeduction);
      }

      totalGross += gross;
      totalTds += tds;
      totalAdvancesDeducted += advDeduction;
      totalNet += net;

      createdExpenses.push(expense);

      // Collect banking record for corporate upload
      bankingRecords.push({
        employeeCode: employee.employeeCode || "EMP",
        employeeName: employee.name,
        accountNumber: item.bankAccountNo || employee.bankAccountNo || "000000000000",
        ifscCode: item.bankIfsc || employee.bankIfsc || "HDFC0000001",
        bankName: item.bankName || employee.bankName || "Bank",
        amount: net,
        paymentDate: input.paymentDate,
        remarks: `Salary ${input.periodMonth}`,
        email: employee.email || undefined,
        phone: employee.phone || undefined,
      });
    }

    AccountingEngine.invalidateCache();

    return {
      success: true,
      periodMonth: input.periodMonth,
      paymentDate: input.paymentDate,
      employeeCount: createdExpenses.length,
      totalGross,
      totalTds,
      totalAdvancesDeducted,
      totalNet,
      expenses: createdExpenses,
      bankingRecords,
    };
  }

  /**
   * Generates complete Payslip model for an employee & salary payment.
   */
  static async getPayslipData(expenseId: string) {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        employee: true,
        category: true,
      },
    });

    if (!expense) throw new Error("Salary record not found.");
    if (!expense.employee) throw new Error("No employee linked to this payout.");

    const employee = expense.employee;
    const gross = Number(expense.grossAmount || 0);
    const tds = Number(expense.tdsAmount || 0);
    const advanceDeducted = Number(expense.advanceAmount || 0);

    const breakdown = this.computeSalaryBreakdown(gross, {
      tdsAmount: tds,
      advanceDeduction: advanceDeducted,
      includePf: true,
    });

    // Extract Period Month from description or expense date
    let periodMonth = "Current Period";
    const match = expense.description?.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      periodMonth = match[1];
    } else if (expense.expenseDate) {
      const d = new Date(expense.expenseDate);
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      periodMonth = `${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    return {
      payslipNumber: `PS-${expense.expenseNumber}`,
      expenseId: expense.id,
      expenseNumber: expense.expenseNumber,
      paymentDate: expense.expenseDate,
      periodMonth,
      employee: {
        id: employee.id,
        name: employee.name,
        employeeCode: employee.employeeCode || "EMP-001",
        designation: employee.designation || "Staff",
        department: employee.department || "Operations",
        pan: employee.pan || "—",
        uan: employee.uan || "—",
        pfNumber: employee.pfNumber || "—",
        bankName: employee.bankName || "HDFC Bank",
        accountNo: employee.bankAccountNo || "••••••••" + (employee.phone?.slice(-4) || "1234"),
        ifsc: employee.bankIfsc || "HDFC0001234",
      },
      company: {
        name: "KVJ Analytics",
        legalName: "KVJ Analytics Private Limited",
        address: "Kochi, Kerala, India - 682030",
        email: "finance@kvjanalytics.com",
        pan: "AABCK1234F",
        gstin: "32AABCK1234F1Z5",
      },
      earnings: [
        { label: "Basic Salary", amount: breakdown.basic },
        { label: "House Rent Allowance (HRA)", amount: breakdown.hra },
        { label: "Special Allowance", amount: breakdown.specialAllowance },
      ],
      deductions: [
        { label: "Provident Fund (PF)", amount: breakdown.providentFund },
        { label: "Professional Tax (PT)", amount: breakdown.professionalTax },
        { label: "TDS u/s 192 (Income Tax)", amount: breakdown.tdsSection192 },
        ...(breakdown.advanceRecovery > 0
          ? [{ label: "Salary Advance Recovery", amount: breakdown.advanceRecovery }]
          : []),
      ],
      grossEarnings: breakdown.grossEarnings,
      totalDeductions: breakdown.totalDeductions,
      netPayable: breakdown.netDisbursement,
      netInWords: breakdown.netInWords,
    };
  }

  /**
   * Generates Form 24Q Quarterly TDS Return Summary (Section 192 Salary TDS).
   */
  static async getForm24QSummary(quarter: string = "Q2", financialYear: string = "FY 2026–27") {
    // Determine date range based on quarter
    // FY starts April 1, 2026
    let fromDate = new Date("2026-04-01");
    let toDate = new Date("2026-06-30");

    if (quarter === "Q2") {
      fromDate = new Date("2026-07-01");
      toDate = new Date("2026-09-30");
    } else if (quarter === "Q3") {
      fromDate = new Date("2026-10-01");
      toDate = new Date("2026-12-31");
    } else if (quarter === "Q4") {
      fromDate = new Date("2027-01-01");
      toDate = new Date("2027-03-31");
    }

    const salaryExpenses = await prisma.expense.findMany({
      where: {
        employeeId: { not: null },
        expenseDate: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: {
        employee: true,
      },
      orderBy: { expenseDate: "asc" },
    });

    let totalGrossPaid = 0;
    let totalTdsDeducted = 0;

    const deductees = salaryExpenses.map((exp, idx) => {
      const gross = Number(exp.grossAmount || 0);
      const tds = Number(exp.tdsAmount || 0);
      totalGrossPaid += gross;
      totalTdsDeducted += tds;

      return {
        serialNo: idx + 1,
        expenseNumber: exp.expenseNumber,
        paymentDate: exp.expenseDate,
        employeeCode: exp.employee?.employeeCode || `EMP-${idx + 1}`,
        employeeName: exp.employee?.name || "Employee",
        pan: exp.employee?.pan || "PANNOTAVBL",
        grossAmount: gross,
        tdsRate: exp.tdsRate || (gross > 0 ? (tds / gross) * 100 : 0),
        tdsAmount: tds,
        netPaid: Number(exp.netAmount || gross - tds),
        section: "192",
      };
    });

    return {
      quarter,
      financialYear,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      totalDeductees: deductees.length,
      totalGrossPaid,
      totalTdsDeducted,
      totalTdsDeposited: totalTdsDeducted,
      challanRef: `ITNS-281-BSR76201-${quarter}`,
      bsrCode: "0210045",
      deductees,
    };
  }

  /**
   * Generates Form 16 Part B Preview and Annual Tax Computation for an employee.
   */
  static async getForm16Data(employeeId: string, financialYear: string = "FY 2026–27") {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        expenses: {
          orderBy: { expenseDate: "asc" },
        },
      },
    });

    if (!employee) throw new Error("Employee not found.");

    let totalGrossSalary = 0;
    let totalTdsDeducted = 0;
    const quarterlyBreakdown: Record<string, { gross: number; tds: number }> = {
      Q1: { gross: 0, tds: 0 },
      Q2: { gross: 0, tds: 0 },
      Q3: { gross: 0, tds: 0 },
      Q4: { gross: 0, tds: 0 },
    };

    for (const exp of employee.expenses) {
      const g = Number(exp.grossAmount || 0);
      const t = Number(exp.tdsAmount || 0);
      totalGrossSalary += g;
      totalTdsDeducted += t;

      if (exp.expenseDate) {
        const m = new Date(exp.expenseDate).getMonth();
        if (m >= 3 && m <= 5) {
          quarterlyBreakdown.Q1.gross += g;
          quarterlyBreakdown.Q1.tds += t;
        } else if (m >= 6 && m <= 8) {
          quarterlyBreakdown.Q2.gross += g;
          quarterlyBreakdown.Q2.tds += t;
        } else if (m >= 9 && m <= 11) {
          quarterlyBreakdown.Q3.gross += g;
          quarterlyBreakdown.Q3.tds += t;
        } else {
          quarterlyBreakdown.Q4.gross += g;
          quarterlyBreakdown.Q4.tds += t;
        }
      }
    }

    // Standard Deduction under Section 16(ia)
    const standardDeduction = Math.min(75000, totalGrossSalary);
    const taxableIncome = Math.max(0, totalGrossSalary - standardDeduction);

    return {
      financialYear,
      assessmentYear: "AY 2027–28",
      employer: {
        name: "KVJ Analytics Private Limited",
        pan: "AABCK1234F",
        tan: "BLRK12345F",
        address: "Kochi, Kerala, India - 682030",
      },
      employee: {
        id: employee.id,
        name: employee.name,
        employeeCode: employee.employeeCode,
        designation: employee.designation,
        pan: employee.pan || "PANNOTAVBL",
      },
      salarySummary: {
        grossSalarySec17_1: totalGrossSalary,
        perquisitesSec17_2: 0,
        profitsInLieuSec17_3: 0,
        totalGross: totalGrossSalary,
        standardDeductionSec16_ia: standardDeduction,
        entertainmentAllowance: 0,
        professionalTaxSec16_iii: 2400,
        totalDeductionsSec16: standardDeduction,
        incomeChargeableUnderSalaries: taxableIncome,
        rebateSec87A: taxableIncome <= 700000 ? Math.min(25000, totalTdsDeducted) : 0,
        totalTaxDeductedSec192: totalTdsDeducted,
      },
      quarterlyBreakdown,
    };
  }
}
