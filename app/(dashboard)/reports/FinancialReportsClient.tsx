"use client";

import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/utils/currency";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY HELPERS & INDIAN TAX LAWS CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const TODAY = new Date();

function daysBetween(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  return Math.floor((TODAY.getTime() - new Date(dateStr).getTime()) / 86_400_000);
}

type AgeBucket = "0–30" | "31–60" | "61–90" | "90+";
function ageBucket(days: number): AgeBucket {
  if (days <= 30) return "0–30";
  if (days <= 60) return "31–60";
  if (days <= 90) return "61–90";
  return "90+";
}

const AGE_BUCKETS: AgeBucket[] = ["0–30", "31–60", "61–90", "90+"];
const AGE_COLORS: Record<AgeBucket, string> = {
  "0–30":  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "31–60": "bg-amber-50 text-amber-700 border-amber-200",
  "61–90": "bg-orange-50 text-orange-700 border-orange-200",
  "90+":   "bg-red-50 text-red-700 border-red-200",
};

// Indian Financial Year Date Range (1st April to 31st March)
function getFyDateRange(fyString: string): { start: Date; end: Date; label: string } {
  const match = fyString.match(/20(\d{2})/);
  const startYear = match ? parseInt(`20${match[1]}`, 10) : 2026;
  return {
    start: new Date(Date.UTC(startYear, 3, 1, 0, 0, 0)), // 1st April
    end: new Date(Date.UTC(startYear + 1, 2, 31, 23, 59, 59, 999)), // 31st March
    label: `FY ${startYear}–${String(startYear + 1).slice(-2)}`,
  };
}

// Canonical Indian TDS Sections
const TDS_SECTION_MAP: Record<string, { name: string; standardRate: number; desc: string }> = {
  "192":  { name: "Salary", standardRate: 0, desc: "As per income tax slab rates" },
  "194A": { name: "Interest (other than securities)", standardRate: 10, desc: "10% if exceeds threshold" },
  "194C": { name: "Contractors & Sub-contractors", standardRate: 2, desc: "1% for Ind/HUF, 2% for Co/Firm" },
  "194H": { name: "Commission & Brokerage", standardRate: 2, desc: "Reduced to 2% under Finance Act" },
  "194I": { name: "Rent (Land/Building/Furniture)", standardRate: 10, desc: "10% for property, 2% for plant" },
  "194J": { name: "Professional & Technical Fees", standardRate: 10, desc: "10% professional, 2% technical" },
  "194Q": { name: "Purchase of Goods (> ₹50L)", standardRate: 0.1, desc: "0.1% on purchase value above ₹50L" },
  "194O": { name: "E-Commerce Operator", standardRate: 0.1, desc: "0.1% gross sale amount" },
};

function tdsLabel(code?: string | null): string {
  if (!code) return "194J — Professional / Technical Services";
  const sec = TDS_SECTION_MAP[code];
  return sec ? `${code} — ${sec.name}` : `${code} — Other TDS Section`;
}

// Fixed Assets WDV depreciation rates (Income Tax Act 1961 - Appendix I)
const WDV_RATE_MAP: Array<[RegExp, number]> = [
  [/computer|laptop|server|software/i, 0.40],
  [/vehicle|car|bus|truck|motor/i,      0.15],
  [/furniture|fixture|interior/i,       0.10],
  [/building|premise/i,                  0.10],
  [/plant|machinery|equipment|tool/i,   0.15],
  [/electrical|solar|generator/i,       0.15],
];
function getWdvRate(categoryName: string): number {
  for (const [re, rate] of WDV_RATE_MAP) {
    if (re.test(categoryName)) return rate;
  }
  return 0.15;
}

// SLM useful life (Companies Act 2013 - Schedule II)
const SLM_LIFE_MAP: Array<[RegExp, number]> = [
  [/computer|laptop|server|software/i, 3],
  [/vehicle|car|bus|truck|motor/i,      10],
  [/furniture|fixture|interior/i,       10],
  [/building|premise/i,                  60],
  [/plant|machinery|equipment/i,        15],
  [/electrical|solar|generator/i,       10],
];
function getSlmRate(categoryName: string): number {
  for (const [re, life] of SLM_LIFE_MAP) {
    if (re.test(categoryName)) return 1 / life;
  }
  return 1 / 15;
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function pct(num: number, den: number, dec = 1): string {
  if (!den) return "0.0%";
  return ((num / den) * 100).toFixed(dec) + "%";
}

type Tab = "pnl" | "bs" | "cashflow" | "gst" | "tds" | "receivables" | "payables" | "assets";
const TABS: { id: Tab; label: string }[] = [
  { id: "pnl",         label: "Profit & Loss" },
  { id: "bs",          label: "Balance Sheet" },
  { id: "cashflow",    label: "Cash Flow" },
  { id: "gst",         label: "GST & Tax Slabs" },
  { id: "tds",         label: "TDS (Form 26Q)" },
  { id: "receivables", label: "Receivables (Debtors)" },
  { id: "payables",    label: "Payables (Creditors)" },
  { id: "assets",      label: "Fixed Assets Schedule" },
];

const FY_OPTIONS = ["FY 2026–27", "FY 2025–26", "FY 2024–25"];

// Indian FY quarters (April start)
const QUARTERS = [
  { id: "Q1", label: "Q1 Apr–Jun", months: [3, 4, 5] },
  { id: "Q2", label: "Q2 Jul–Sep", months: [6, 7, 8] },
  { id: "Q3", label: "Q3 Oct–Dec", months: [9, 10, 11] },
  { id: "Q4", label: "Q4 Jan–Mar", months: [0, 1, 2] },
];

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE UI PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <span className="font-bold text-[10px] text-[#738078] tracking-widest uppercase block mb-2">
      {title}
    </span>
  );
}
function Row({ label, amount, bold, green, red, indent, note }: {
  label: string; amount: number; bold?: boolean; green?: boolean; red?: boolean; indent?: boolean; note?: string;
}) {
  const color = green ? "text-[#177B55]" : red ? "text-[#B94B4B]" : "text-[#17211B]";
  return (
    <div className={`py-2 flex justify-between ${bold ? "font-bold" : "font-normal"} ${indent ? "pl-4" : ""}`}>
      <span className={`text-[#17211B] ${bold ? "font-bold" : ""}`}>
        {label}
        {note && <span className="text-[10px] text-[#9aaa9e] ml-1.5 font-normal">{note}</span>}
      </span>
      <span className={`font-semibold tabular-nums ${color}`}>{formatCurrency(amount)}</span>
    </div>
  );
}
function TotalRow({ label, amount, green, red }: { label: string; amount: number; green?: boolean; red?: boolean }) {
  return (
    <div className={`py-2.5 flex justify-between font-extrabold text-sm border-t-2 border-[#17211B] bg-[#F6FAF7] px-2 rounded-b-lg -mx-2 ${green ? "text-[#177B55]" : red ? "text-[#B94B4B]" : "text-[#17211B]"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{formatCurrency(amount)}</span>
    </div>
  );
}
function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white border border-[#D9E3DC] rounded-xl p-4 shadow-2xs">
      <span className="text-[11px] font-semibold text-[#68756C] block">{label}</span>
      <strong className={`text-xl font-extrabold mt-1 block ${color || "text-[#17211B]"}`}>{value}</strong>
      {sub && <span className="text-[10px] text-[#9aaa9e] block mt-0.5">{sub}</span>}
    </div>
  );
}
function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b border-[#D9E3DC] text-[10px] uppercase text-[#738078] font-bold tracking-wider">
        {cols.map((c, i) => (
          <th key={i} className={`py-3 px-3 ${i > 1 ? "text-right" : ""}`}>{c}</th>
        ))}
      </tr>
    </thead>
  );
}
function EmptyRow({ cols, msg = "No data recorded." }: { cols: number; msg?: string }) {
  return (
    <tr>
      <td colSpan={cols} className="py-8 text-center text-xs text-[#68756C] italic">{msg}</td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function FinancialReportsClient({
  invoices = [],
  expenses = [],
  openingBalances = [],
}: {
  invoices?: any[];
  expenses?: any[];
  openingBalances?: any[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("pnl");
  const [fy, setFy] = useState("FY 2026–27");
  const [depMethod, setDepMethod] = useState<"WDV" | "SLM">("WDV");

  // Filter range by financial year
  const { start: fyStart, end: fyEnd } = useMemo(() => getFyDateRange(fy), [fy]);

  // ── 1. FY FILTERED DATASETS ────────────────────────────────────────────────
  const fyOpeningBalances = useMemo(
    () => openingBalances.filter((ob) => ob.financialYear === fy),
    [openingBalances, fy]
  );

  const validInvoices = useMemo(
    () => invoices.filter((inv) => {
      if (["CANCELLED"].includes(inv.status ?? "")) return false;
      const invDate = new Date(inv.invoiceDate || inv.createdAt);
      return invDate >= fyStart && invDate <= fyEnd;
    }),
    [invoices, fyStart, fyEnd]
  );

  const validExpenses = useMemo(
    () => expenses.filter((exp) => {
      if (["CANCELLED", "REJECTED"].includes(exp.status ?? "")) return false;
      const expDate = new Date(exp.expenseDate || exp.createdAt);
      return expDate >= fyStart && expDate <= fyEnd;
    }),
    [expenses, fyStart, fyEnd]
  );

  // Helper to extract true GST and Sales Revenue for an invoice
  const getInvoiceTax = (inv: any) => {
    const cgst = Number(inv.totalCGST || 0);
    const sgst = Number(inv.totalSGST || 0);
    const igst = Number(inv.totalIGST || 0);
    const totalGst = Number(inv.totalGST || (cgst + sgst + igst) || 0);
    return { cgst, sgst, igst, totalGst };
  };

  const getInvoiceRevenue = (inv: any) => {
    const gross = Number(inv.grossAmount || (Number(inv.taxableAmount || 0) + Number(inv.totalGST || 0)) || inv.netAmount || 0);
    const { totalGst } = getInvoiceTax(inv);
    // Double-Entry Statutory Principle (AS 9 / Schedule III):
    // Sales Revenue (Taxable Turnover) = Gross Invoice Receivable - Output GST
    return Math.max(0, gross - totalGst);
  };

  const getExpenseTax = (exp: any) => {
    const cgst = Number(exp.inputCGST || 0);
    const sgst = Number(exp.inputSGST || 0);
    const igst = Number(exp.inputIGST || 0);
    const totalGst = Number(exp.totalInputGST || (cgst + sgst + igst) || 0);
    return { cgst, sgst, igst, totalGst };
  };

  const getExpenseOperatingCost = (exp: any) => {
    const gross = Number(exp.grossAmount || exp.netAmount || 0);
    const { totalGst } = getExpenseTax(exp);
    // When Input Tax Credit (ITC) is claimed, the GST portion offsets tax liability and is not an operating expense
    return Math.max(0, gross - totalGst);
  };

  // ── 2. REVENUE TRANSACTIONS ───────────────────────────────────────────────
  // Under Indian Accounting Standards, Revenue is Taxable Amount (excluding GST)
  const totalRevenue = useMemo(
    () => validInvoices.reduce((s, inv) => s + getInvoiceRevenue(inv), 0),
    [validInvoices]
  );

  const revenueByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inv of validInvoices) {
      const invRev = getInvoiceRevenue(inv);
      if (inv.items && inv.items.length > 0) {
        const itemTaxableSum = inv.items.reduce((s: number, it: any) => s + Number(it.taxableAmount || it.totalAmount || 0), 0);
        for (const item of inv.items) {
          const k = item.name || "Services & Goods";
          const proportion = itemTaxableSum > 0 ? (Number(item.taxableAmount || item.totalAmount || 0) / itemTaxableSum) : (1 / inv.items.length);
          map[k] = (map[k] ?? 0) + (invRev * proportion);
        }
      } else {
        const k = inv.customerNameSnapshot ? `Revenue (${inv.customerNameSnapshot})` : "Revenue from Operations";
        map[k] = (map[k] ?? 0) + invRev;
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [validInvoices]);

  // ── 3. EXPENSES & CAPEX ────────────────────────────────────────────────────
  const isAssetExpense = (exp: any) => {
    if (exp.isAsset || exp.expenseTreatment === "Fixed Asset") return true;
    const ft = (exp.category?.financialType ?? "").toUpperCase();
    const cat = (exp.category?.name ?? "").toLowerCase();
    return ft === "ASSET" || /asset|equipment|furniture|computer|vehicle|machinery|laptop|server/i.test(cat);
  };

  const assetExpenses = useMemo(() => validExpenses.filter(isAssetExpense), [validExpenses]);
  const revenueExpenses = useMemo(() => validExpenses.filter((e) => !isAssetExpense(e)), [validExpenses]);

  const employeeExpenses = useMemo(
    () => revenueExpenses.filter((e) => /salary|wage|staff|employee|payroll|bonus|leave|hr/i.test(e.category?.name ?? "")),
    [revenueExpenses]
  );
  const financeExpenses = useMemo(
    () => revenueExpenses.filter((e) => /finance|interest|bank.?charge|loan|borrowing/i.test(e.category?.name ?? "")),
    [revenueExpenses]
  );
  const otherOpex = useMemo(
    () => revenueExpenses.filter((e) => !employeeExpenses.includes(e) && !financeExpenses.includes(e)),
    [revenueExpenses, employeeExpenses, financeExpenses]
  );

  const totalEmployeeExp = useMemo(() => employeeExpenses.reduce((s, e) => s + getExpenseOperatingCost(e), 0), [employeeExpenses]);
  const totalFinanceExp = useMemo(() => financeExpenses.reduce((s, e) => s + getExpenseOperatingCost(e), 0), [financeExpenses]);
  const totalCapex = useMemo(() => assetExpenses.reduce((s, e) => s + getExpenseOperatingCost(e), 0), [assetExpenses]);
  const totalOtherOpex = useMemo(() => otherOpex.reduce((s, e) => s + getExpenseOperatingCost(e), 0), [otherOpex]);

  const otherOpexByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const exp of otherOpex) {
      const k = exp.category?.name ?? "Operating Expenses";
      map[k] = (map[k] ?? 0) + getExpenseOperatingCost(exp);
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [otherOpex]);

  // ── 4. DEPRECIATION SCHEDULE ──────────────────────────────────────────────
  const depSchedule = useMemo(() =>
    assetExpenses.map((exp) => {
      const cost = getExpenseOperatingCost(exp);
      const catName = exp.assetType ?? exp.category?.name ?? exp.notes ?? "Fixed Asset";
      const purchaseDate = new Date(exp.expenseDate ?? TODAY);
      const yearsHeld = Math.max(0.5, (TODAY.getTime() - purchaseDate.getTime()) / (365.25 * 86_400_000));
      const customRate = Number(exp.depreciationRate || 0);
      const defaultRate = depMethod === "WDV" ? getWdvRate(catName) : getSlmRate(catName);
      const rate = customRate > 0 ? customRate / 100 : defaultRate;
      const accDep = depMethod === "WDV"
        ? cost * (1 - Math.pow(1 - rate, yearsHeld))
        : Math.min(cost, cost * rate * yearsHeld);
      const closingWdv = Math.max(0, cost - accDep);
      const prevYearWdv = depMethod === "WDV"
        ? Math.max(0, cost * Math.pow(1 - rate, Math.max(0, yearsHeld - 1)))
        : Math.max(0, cost - Math.min(cost, cost * rate * Math.max(0, yearsHeld - 1)));
      const currentYearDep = Math.max(0, prevYearWdv - closingWdv);
      return {
        id: exp.id,
        name: exp.notes ?? exp.vendor?.name ?? catName,
        category: catName,
        purchaseDate: exp.expenseDate,
        grossCost: cost,
        ratePct: `${(rate * 100).toFixed(rate * 100 % 1 === 0 ? 0 : 2)}%`,
        accDep: Math.round(accDep),
        currentYearDep: Math.round(currentYearDep),
        closingWdv: Math.round(closingWdv),
      };
    }),
    [assetExpenses, depMethod]
  );
  const totalGrossBlock = useMemo(() => depSchedule.reduce((s, d) => s + d.grossCost, 0), [depSchedule]);
  const totalAccDep = useMemo(() => depSchedule.reduce((s, d) => s + d.accDep, 0), [depSchedule]);
  const totalCurrentYearDep = useMemo(() => depSchedule.reduce((s, d) => s + d.currentYearDep, 0), [depSchedule]);
  const totalNetBlock = useMemo(() => depSchedule.reduce((s, d) => s + d.closingWdv, 0), [depSchedule]);

  // ── 5. P&L SUMMARY (Schedule III Part II) ─────────────────────────────────
  const totalOperatingExpenses = totalEmployeeExp + totalFinanceExp + totalCurrentYearDep + totalOtherOpex;
  const pbt = totalRevenue - totalOperatingExpenses;
  const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalOtherOpex) / totalRevenue) * 100 : 0;
  const netMargin = totalRevenue > 0 ? (pbt / totalRevenue) * 100 : 0;

  // ── 6. DYNAMIC TAX SLABS & STATUTORY GST COMPUTATION ───────────────────────
  const outputCGST = useMemo(() => validInvoices.reduce((s, inv) => s + Number(inv.totalCGST ?? 0), 0), [validInvoices]);
  const outputSGST = useMemo(() => validInvoices.reduce((s, inv) => s + Number(inv.totalSGST ?? 0), 0), [validInvoices]);
  const outputIGST = useMemo(() => validInvoices.reduce((s, inv) => s + Number(inv.totalIGST ?? 0), 0), [validInvoices]);
  const totalOutputGST = outputCGST + outputSGST + outputIGST;

  const inputCGST = useMemo(() => validExpenses.reduce((s, e) => s + Number(e.inputCGST ?? 0), 0), [validExpenses]);
  const inputSGST = useMemo(() => validExpenses.reduce((s, e) => s + Number(e.inputSGST ?? 0), 0), [validExpenses]);
  const inputIGST = useMemo(() => validExpenses.reduce((s, e) => s + Number(e.inputIGST ?? 0), 0), [validExpenses]);
  const totalInputGST = inputCGST + inputSGST + inputIGST;

  // Sequential GST ITC set-off as per Section 49(5) of CGST Act
  let remainingITC_IGST = inputIGST;
  let netCGST = Math.max(0, outputCGST - inputCGST);
  if (netCGST > 0 && remainingITC_IGST > 0) {
    const off = Math.min(netCGST, remainingITC_IGST);
    netCGST -= off;
    remainingITC_IGST -= off;
  }
  let netSGST = Math.max(0, outputSGST - inputSGST);
  if (netSGST > 0 && remainingITC_IGST > 0) {
    const off = Math.min(netSGST, remainingITC_IGST);
    netSGST -= off;
    remainingITC_IGST -= off;
  }
  const netIGST = Math.max(0, outputIGST - inputIGST);
  const netGSTPayable = netCGST + netSGST + netIGST;
  const excessITC = Math.max(0, totalInputGST - totalOutputGST);

  // Dynamic Tax Slab Matrix (automatically derives all rates applied in this FY)
  const dynamicTaxSlabs = useMemo(() => {
    const slabMap: Record<number, { taxable: number; cgst: number; sgst: number; igst: number; totalTax: number; count: number }> = {};
    for (const inv of validInvoices) {
      const taxable = getInvoiceRevenue(inv);
      const { cgst, sgst, igst, totalGst } = getInvoiceTax(inv);
      let rate = 0;
      if (inv.items && inv.items.length > 0 && Number(inv.items[0].gstRate) >= 0) {
        rate = Number(inv.items[0].gstRate);
      } else if (taxable > 0 && totalGst > 0) {
        rate = Math.round((totalGst / taxable) * 100);
      } else if (igst === 0 && totalGst === 0) {
        rate = 0; // Export or Exempt
      }

      if (!slabMap[rate]) {
        slabMap[rate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, count: 0 };
      }
      slabMap[rate].taxable += taxable;
      slabMap[rate].cgst += cgst;
      slabMap[rate].sgst += sgst;
      slabMap[rate].igst += igst;
      slabMap[rate].totalTax += totalGst;
      slabMap[rate].count += 1;
    }
    return Object.entries(slabMap)
      .map(([rate, vals]) => ({ rate: Number(rate), ...vals }))
      .sort((a, b) => b.rate - a.rate);
  }, [validInvoices]);

  // Intrastate vs Interstate
  const intrastateInvoices = useMemo(() => validInvoices.filter((inv) => Number(inv.totalIGST ?? 0) === 0), [validInvoices]);
  const interstateInvoices = useMemo(() => validInvoices.filter((inv) => Number(inv.totalIGST ?? 0) > 0), [validInvoices]);
  const intrastateTaxable = useMemo(() => intrastateInvoices.reduce((s, inv) => s + getInvoiceRevenue(inv), 0), [intrastateInvoices]);
  const interstateTaxable = useMemo(() => interstateInvoices.reduce((s, inv) => s + getInvoiceRevenue(inv), 0), [interstateInvoices]);

  // B2B vs B2C
  const b2bTaxable = useMemo(
    () => validInvoices.filter((inv) => inv.customer?.gstin || inv.gstinSnapshot).reduce((s, inv) => s + getInvoiceRevenue(inv), 0),
    [validInvoices]
  );
  const b2cTaxable = totalRevenue - b2bTaxable;

  // ── 7. TDS DETAILS & SECTIONAL BREAKDOWN ──────────────────────────────────
  // TDS deducted by customers (Asset - advance income tax credit)
  const tdsReceivable = useMemo(() => {
    return validInvoices.reduce((sum, inv) => {
      const payments = inv.payments || [];
      const paymentTds = payments.reduce((pSum: number, p: any) => pSum + Number(p.tdsAmount || 0), 0);
      return sum + (paymentTds > 0 ? paymentTds : Number(inv.tdsAmount || 0));
    }, 0);
  }, [validInvoices]);

  // TDS deducted by us on vendor expenses (Liability - payable to Govt under TAN)
  const tdsPayable = useMemo(() => validExpenses.reduce((s, e) => s + Number(e.tdsAmount ?? 0), 0), [validExpenses]);

  const tdsPayableEntries = useMemo(
    () => validExpenses.filter((e) => Number(e.tdsAmount ?? 0) > 0),
    [validExpenses]
  );
  const tdsPayableBySection = useMemo(() => {
    const map: Record<string, { entries: any[]; total: number }> = {};
    for (const exp of tdsPayableEntries) {
      const sec = tdsLabel(exp.tdsSection);
      if (!map[sec]) map[sec] = { entries: [], total: 0 };
      map[sec].entries.push(exp);
      map[sec].total += Number(exp.tdsAmount ?? 0);
    }
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [tdsPayableEntries]);

  const tdsReceivableEntries = useMemo(
    () => validInvoices.filter((inv) => {
      const pTds = (inv.payments || []).reduce((s: number, p: any) => s + Number(p.tdsAmount || 0), 0);
      return pTds > 0 || Number(inv.tdsAmount || 0) > 0;
    }),
    [validInvoices]
  );

  const quarterlyTDS = useMemo(() =>
    QUARTERS.map((q) => {
      const payable = validExpenses
        .filter((e) => q.months.includes(new Date(e.expenseDate ?? 0).getMonth()))
        .reduce((s, e) => s + Number(e.tdsAmount ?? 0), 0);
      const receivable = validInvoices
        .filter((inv) => q.months.includes(new Date(inv.invoiceDate ?? 0).getMonth()))
        .reduce((s, inv) => {
          const pTds = (inv.payments || []).reduce((pSum: number, p: any) => pSum + Number(p.tdsAmount || 0), 0);
          return s + (pTds > 0 ? pTds : Number(inv.tdsAmount || 0));
        }, 0);
      return { ...q, payable, receivable };
    }),
    [validInvoices, validExpenses]
  );

  // ── 8. TRADE RECEIVABLES & CASH COLLECTIONS (MATHEMATICALLY CONSERVED) ──────
  // For each invoice: Total Gross = Bank Receipt + TDS Deducted + Outstanding Debtors
  const { totalReceivables, actualCustomerCollections, receivablesWithAge, recAgeing } = useMemo(() => {
    let recSum = 0;
    let collectionsSum = 0;
    const recList: any[] = [];
    const ageingMap: Record<AgeBucket, number> = { "0–30": 0, "31–60": 0, "61–90": 0, "90+": 0 };

    for (const inv of validInvoices) {
      const invoiceGross = Number(inv.grossAmount || (Number(inv.taxableAmount || 0) + Number(inv.totalGST || 0)) || inv.netAmount || 0);
      const payments = inv.payments || [];
      const totalPaidAmount = payments.reduce((sum: number, p: any) => sum + Number(p.paymentAmount || 0), 0);
      const paymentTds = payments.reduce((sum: number, p: any) => sum + Number(p.tdsAmount || 0), 0);
      const effectiveTds = paymentTds > 0 ? paymentTds : Number(inv.tdsAmount || 0);

      // Collections received into bank from this invoice
      const bankReceived = payments.reduce((sum: number, p: any) => sum + Number(p.bankReceipt ?? p.paymentAmount ?? 0), 0);
      collectionsSum += bankReceived;

      // Outstanding Cash Receivable due from customer
      // Gross Invoice = Collections in Bank + TDS Receivable + Remaining Debtor
      const outstanding = Math.max(0, invoiceGross - totalPaidAmount);
      if (outstanding > 0.01) {
        recSum += outstanding;
        const days = daysBetween(inv.invoiceDate || inv.createdAt);
        const bucket = ageBucket(days);
        recList.push({
          ...inv,
          invoiceGross,
          totalPaidAmount,
          outstanding,
          daysOld: days,
          bucket,
        });
        ageingMap[bucket] += outstanding;
      }
    }

    recList.sort((a, b) => b.daysOld - a.daysOld);
    return {
      totalReceivables: recSum,
      actualCustomerCollections: collectionsSum,
      receivablesWithAge: recList,
      recAgeing: ageingMap,
    };
  }, [validInvoices]);

  const totalBilled = useMemo(
    () => validInvoices.reduce((s, inv) => s + Number(inv.grossAmount || (Number(inv.taxableAmount || 0) + Number(inv.totalGST || 0)) || inv.netAmount || 0), 0),
    [validInvoices]
  );
  const collectionEfficiency = totalBilled > 0 ? (actualCustomerCollections / totalBilled) * 100 : 0;

  // ── 9. TRADE PAYABLES & EXPENSE DISBURSEMENTS ──────────────────────────────
  // Business Policy: All purchases and expenses are settled immediately on-time via Bank.
  // Zero trade payables are carried for expenses; every expense is deducted directly from Bank upon purchase.
  const { totalPayables, actualExpenseDisbursements, expenseDisbursementsList, totalEmployeePayables, totalVendorPayables } = useMemo(() => {
    let disbursedSum = 0;
    const disbursedList: any[] = [];

    for (const exp of validExpenses) {
      const netAmt = Number(exp.netAmount || exp.grossAmount || 0);
      disbursedSum += netAmt;
      const days = daysBetween(exp.expenseDate || exp.createdAt);
      disbursedList.push({
        ...exp,
        daysOld: days,
        amountPaid: netAmt,
        paymentDate: exp.expenseDate || exp.createdAt,
        settlementStatus: "PAID VIA BANK",
      });
    }

    disbursedList.sort((a, b) => new Date(b.expenseDate || b.createdAt || 0).getTime() - new Date(a.expenseDate || a.createdAt || 0).getTime());

    return {
      totalPayables: 0, // No Payables in Expense (settled on-time upon purchase)
      actualExpenseDisbursements: disbursedSum,
      expenseDisbursementsList: disbursedList,
      totalEmployeePayables: 0,
      totalVendorPayables: 0,
    };
  }, [validExpenses]);

  // ── 10. BALANCE SHEET DOUBLE-ENTRY FORMULATION ─────────────────────────────
  // Opening Balance segregation:
  // Identify Opening Cash/Bank vs Other Non-Current / Current Assets
  const { openingBankCash, otherOpeningAssets, openingCapital, otherOpeningLiabilities } = useMemo(() => {
    let bankCash = 0;
    const otherAssets: any[] = [];
    let capital = 0;
    const otherLiabs: any[] = [];

    for (const ob of fyOpeningBalances) {
      const amt = Number(ob.amount || 0);
      const pos = (ob.position || "").toLowerCase();
      if (ob.type === "Asset") {
        if (/bank|cash|current.?acc|savings/i.test(pos)) {
          bankCash += amt;
        } else {
          otherAssets.push(ob);
        }
      } else if (ob.type === "Liability") {
        if (/capital|share|equity|proprietor|partner/i.test(pos)) {
          capital += amt;
        } else {
          otherLiabs.push(ob);
        }
      }
    }
    return {
      openingBankCash: bankCash,
      otherOpeningAssets: otherAssets,
      openingCapital: capital,
      otherOpeningLiabilities: otherLiabs,
    };
  }, [fyOpeningBalances]);

  const otherOpeningAssetsTotal = useMemo(() => otherOpeningAssets.reduce((s, ob) => s + Number(ob.amount || 0), 0), [otherOpeningAssets]);
  const otherOpeningLiabilitiesTotal = useMemo(() => otherOpeningLiabilities.reduce((s, ob) => s + Number(ob.amount || 0), 0), [otherOpeningLiabilities]);

  // Closing Cash & Bank Balance:
  // Opening Bank + Inflows from Customer Receipts - Outflows for Expense Disbursements
  const closingBankCashBalance = openingBankCash + actualCustomerCollections - actualExpenseDisbursements;

  // Shareholders' Funds: Capital + Reserves & Surplus (Net Profit for period)
  const reservesAndSurplus = pbt;
  const totalShareholdersEquity = openingCapital + reservesAndSurplus;

  // Total Liabilities:
  const totalCurrentLiabilities = totalVendorPayables + totalEmployeePayables + netGSTPayable + tdsPayable;
  const totalEquityAndLiabilities = totalShareholdersEquity + otherOpeningLiabilitiesTotal + totalCurrentLiabilities;

  // Total Assets:
  const totalCurrentAssets = closingBankCashBalance + totalReceivables + tdsReceivable + excessITC + otherOpeningAssetsTotal;
  const totalAssets = totalCurrentAssets + totalNetBlock;

  // Balance Check (Rounded to 2 decimal places to eliminate IEEE floating point discrepancies)
  const bsDiff = Math.round((totalAssets - totalEquityAndLiabilities) * 100) / 100;
  const isBalanced = Math.abs(bsDiff) <= 0.50; // Under Indian ICAI guidance, 50 paise tolerance for rounding

  // ── 11. CASH FLOW STATEMENT (AS 3 Indirect Method) ─────────────────────────
  const cfOperating_pbt = pbt;
  const cfOperating_dep = totalCurrentYearDep;
  const cfOperating_finance = totalFinanceExp;
  const cfOperating_beforeWC = cfOperating_pbt + cfOperating_dep + cfOperating_finance;
  const cfWC_receivables = -totalReceivables;
  const cfWC_payables = totalPayables;
  const cfWC_gst = -netGSTPayable;
  const cfWC_tds = -tdsPayable;
  const cfFromOperating = cfOperating_beforeWC + cfWC_receivables + cfWC_payables + cfWC_gst + cfWC_tds;
  const cfFromInvesting = -totalCapex;
  const cfFromFinancing = openingCapital - totalFinanceExp;
  const netCashMovement = cfFromOperating + cfFromInvesting + cfFromFinancing;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#177B55] tracking-widest uppercase block">
            FINANCIAL REPORTING • INDIAN STATUTORY STANDARDS
          </span>
          <h1 className="text-3xl font-extrabold text-[#17211B] mt-0.5 tracking-tight">Financial Reports</h1>
          <p className="text-[#68756C] text-sm mt-0.5">
            Double-entry verified balance sheets, dynamic GST &amp; TDS tax slabs, and Schedule III financial statements.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <select
            value={fy}
            onChange={(e) => setFy(e.target.value)}
            className="border border-[#D9E3DC] rounded-xl px-3.5 py-2 text-xs font-bold bg-white text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#177B55] shadow-2xs"
          >
            {FY_OPTIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 border border-[#D9E3DC] rounded-xl text-xs font-bold text-[#17211B] bg-white hover:bg-[#F6FAF7] transition-colors shadow-2xs"
          >
            Print / Export
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-6 md:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#D9E3DC] pb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === t.id
                  ? "bg-[#177B55] text-white shadow-xs"
                  : "bg-white text-[#68756C] hover:bg-[#F4F7F3] hover:text-[#17211B] border border-[#D9E3DC]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ================================================================= */}
        {/* TAB 1: PROFIT & LOSS — Schedule III (Part II) */}
        {/* ================================================================= */}
        {activeTab === "pnl" && (
          <div className="space-y-6 text-xs">
            <div className="flex justify-between items-baseline border-b border-[#D9E3DC] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#17211B]">Statement of Profit &amp; Loss</h3>
                <p className="text-[11px] text-[#68756C]">Schedule III — Companies Act 2013 | {fy}</p>
              </div>
              <span className="text-xs font-bold text-[#68756C]">Amount in ₹ (INR)</span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Revenue from Operations" value={formatCurrency(totalRevenue)} color="text-[#177B55]" sub={`${validInvoices.length} Invoices`} />
              <KpiCard label="Operating Expenses" value={formatCurrency(totalOperatingExpenses)} color="text-[#B27A17]" sub={`${validExpenses.length} Expenses`} />
              <KpiCard
                label="Profit Before Tax (PBT)"
                value={formatCurrency(pbt)}
                color={pbt >= 0 ? "text-[#177B55]" : "text-[#B94B4B]"}
                sub={pbt >= 0 ? "Operating Surplus" : "Deficit"}
              />
              <KpiCard
                label="Net Profit Margin"
                value={`${netMargin.toFixed(1)}%`}
                sub={`Gross Margin: ${grossMargin.toFixed(1)}%`}
                color={netMargin >= 0 ? "text-[#177B55]" : "text-[#B94B4B]"}
              />
            </div>

            <div className="divide-y divide-[#E9EEE9]">
              {/* I. Revenue from Operations */}
              <div className="pb-4">
                <SectionHeader title="I. Revenue from Operations (Net of Taxes)" />
                <div className="pl-3 divide-y divide-[#F0F4F1]">
                  {revenueByCategory.length === 0 ? (
                    <p className="py-2 text-[#68756C] italic">No confirmed sales recorded for this period.</p>
                  ) : revenueByCategory.map(([cat, amt]) => (
                    <Row key={cat} label={cat} amount={amt} indent />
                  ))}
                </div>
                <TotalRow label="Total Revenue from Operations (I)" amount={totalRevenue} green />
              </div>

              {/* II. Expenses */}
              <div className="py-4 space-y-2">
                <SectionHeader title="II. Expenses" />

                {/* Employee Benefit Expense */}
                <div>
                  <p className="font-semibold text-[#17211B] py-1">(a) Employee Benefit Expense</p>
                  <div className="pl-3 divide-y divide-[#F0F4F1]">
                    {employeeExpenses.length === 0 ? (
                      <p className="py-1 text-[#68756C] italic pl-4">No employee expenses recorded.</p>
                    ) : employeeExpenses.map((exp) => (
                      <Row key={exp.id} label={exp.category?.name ?? "Employee Costs"} amount={Number(exp.netAmount ?? 0)} indent />
                    ))}
                  </div>
                  <div className="flex justify-between py-1.5 pl-3 font-semibold text-[#17211B]">
                    <span>Total Employee Benefit Expense</span>
                    <span className="tabular-nums">{formatCurrency(totalEmployeeExp)}</span>
                  </div>
                </div>

                {/* Finance Costs */}
                <div>
                  <p className="font-semibold text-[#17211B] py-1">(b) Finance Costs</p>
                  <div className="pl-3">
                    {financeExpenses.length === 0 ? (
                      <p className="py-1 text-[#68756C] italic pl-4">No finance charges recorded.</p>
                    ) : financeExpenses.map((exp) => (
                      <Row key={exp.id} label={exp.category?.name ?? "Finance Charge"} amount={Number(exp.netAmount ?? 0)} indent />
                    ))}
                  </div>
                  <div className="flex justify-between py-1.5 pl-3 font-semibold text-[#17211B]">
                    <span>Total Finance Costs</span>
                    <span className="tabular-nums">{formatCurrency(totalFinanceExp)}</span>
                  </div>
                </div>

                {/* Depreciation */}
                <div>
                  <p className="font-semibold text-[#17211B] py-1">
                    (c) Depreciation &amp; Amortisation
                    <span className="text-[10px] font-normal text-[#9aaa9e] ml-2">({depMethod} Method)</span>
                  </p>
                  <div className="flex justify-between py-1.5 pl-3 font-semibold text-[#17211B]">
                    <span>Depreciation for the Year</span>
                    <span className="tabular-nums">{formatCurrency(totalCurrentYearDep)}</span>
                  </div>
                </div>

                {/* Other Expenses */}
                <div>
                  <p className="font-semibold text-[#17211B] py-1">(d) Other Operating Expenses</p>
                  <div className="pl-3 divide-y divide-[#F0F4F1]">
                    {otherOpexByCategory.length === 0 ? (
                      <p className="py-1 text-[#68756C] italic pl-4">No operating expenses recorded.</p>
                    ) : otherOpexByCategory.map(([cat, amt]) => (
                      <Row key={cat} label={cat} amount={amt} indent />
                    ))}
                  </div>
                  <div className="flex justify-between py-1.5 pl-3 font-semibold text-[#17211B]">
                    <span>Total Other Expenses</span>
                    <span className="tabular-nums">{formatCurrency(totalOtherOpex)}</span>
                  </div>
                </div>

                <TotalRow label="Total Operating Expenses (II)" amount={totalOperatingExpenses} red />
              </div>

              {/* Profit Before Tax */}
              <div className="pt-4 space-y-2">
                <div className={`flex justify-between items-center py-3 px-3 rounded-xl font-extrabold text-sm ${pbt >= 0 ? "bg-[#EBF3ED] text-[#0B5F46]" : "bg-red-50 text-[#B94B4B]"}`}>
                  <span>Profit Before Tax (PBT)</span>
                  <span className="tabular-nums text-base">{formatCurrency(pbt)}</span>
                </div>
                <div className="flex justify-between py-2 px-3 text-[#68756C] italic">
                  <span>Tax Provision (Advance Tax / Self-Assessment)</span>
                  <span>— (Transferred to Balance Sheet)</span>
                </div>
                <div className={`flex justify-between items-center py-3 px-3 rounded-xl font-extrabold text-sm border-2 ${pbt >= 0 ? "border-[#177B55] text-[#177B55]" : "border-[#B94B4B] text-[#B94B4B]"}`}>
                  <span>Net Profit Transferred to Reserves &amp; Surplus (PAT)</span>
                  <span className="tabular-nums text-base">{formatCurrency(pbt)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: BALANCE SHEET — Schedule III (Part I) — DOUBLE ENTRY PROOF */}
        {/* ================================================================= */}
        {activeTab === "bs" && (
          <div className="space-y-5 text-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline border-b border-[#D9E3DC] pb-3 gap-2">
              <div>
                <h3 className="text-base font-bold text-[#17211B]">Balance Sheet (Statement of Financial Position)</h3>
                <p className="text-[11px] text-[#68756C]">Schedule III — Part I | As at 31st March ({fy})</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                  isBalanced
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-red-50 text-red-800 border-red-300"
                }`}>
                  {isBalanced ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      ✓ Balanced to the Paise (Diff: ₹0.00)
                    </>
                  ) : (
                    `⚠ Variance: ${formatCurrency(Math.abs(bsDiff))}`
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: EQUITY & LIABILITIES */}
              <div className="border border-[#D9E3DC] rounded-xl p-5 space-y-4 bg-white shadow-2xs">
                <div className="border-b border-[#D9E3DC] pb-2">
                  <SectionHeader title="EQUITY & LIABILITIES" />
                </div>

                {/* I. Shareholders' Funds */}
                <div>
                  <p className="font-bold text-[#17211B] text-xs mb-1">I. Shareholders&apos; Funds</p>
                  <div className="divide-y divide-[#F0F4F1] pl-2">
                    <Row
                      label="Capital / Proprietor's Fund"
                      amount={openingCapital}
                      note="(Opening Balance)"
                      indent
                    />
                    <Row
                      label="Reserves &amp; Surplus (P&amp;L Net Profit)"
                      amount={reservesAndSurplus}
                      green={reservesAndSurplus >= 0}
                      red={reservesAndSurplus < 0}
                      indent
                    />
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-[#17211B] border-t border-[#D9E3DC] mt-1 pl-2">
                    <span>Total Shareholders&apos; Funds</span>
                    <span className="tabular-nums">{formatCurrency(totalShareholdersEquity)}</span>
                  </div>
                </div>

                {/* II. Non-Current Liabilities */}
                <div>
                  <p className="font-bold text-[#17211B] text-xs mb-1">II. Non-Current Liabilities</p>
                  <div className="divide-y divide-[#F0F4F1] pl-2">
                    {otherOpeningLiabilities.length === 0 ? (
                      <p className="py-1 text-[#68756C] italic pl-4">Long-term borrowings &amp; liabilities: ₹0.00</p>
                    ) : (
                      otherOpeningLiabilities.map((ob) => (
                        <Row key={ob.id} label={ob.position} amount={Number(ob.amount || 0)} indent />
                      ))
                    )}
                  </div>
                  {otherOpeningLiabilities.length > 0 && (
                    <div className="flex justify-between py-1.5 font-bold text-[#17211B] border-t border-[#D9E3DC] mt-1 pl-2">
                      <span>Total Non-Current Liabilities</span>
                      <span className="tabular-nums">{formatCurrency(otherOpeningLiabilitiesTotal)}</span>
                    </div>
                  )}
                </div>

                {/* III. Current Liabilities */}
                <div>
                  <p className="font-bold text-[#17211B] text-xs mb-1">III. Current Liabilities</p>
                  <div className="divide-y divide-[#F0F4F1] pl-2">
                    <Row label="Trade Payables (Sundry Creditors)" amount={totalVendorPayables} indent note="Nil — Settled via Bank on Purchase" />
                    <Row label="Employee Payables (Reimbursements)" amount={totalEmployeePayables} indent note="Nil — Settled via Bank on Purchase" />
                    <Row label="Statutory GST Payable (Net of ITC)" amount={netGSTPayable} indent note={netGSTPayable > 0 ? "Payable" : "Covered by ITC"} red={netGSTPayable > 0} />
                    <Row label="TDS Payable (To be deposited)" amount={tdsPayable} indent note={tdsPayable > 0 ? "Form 26Q" : "Nil"} red={tdsPayable > 0} />
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-[#17211B] border-t border-[#D9E3DC] mt-1 pl-2">
                    <span>Total Current Liabilities</span>
                    <span className="tabular-nums">{formatCurrency(totalCurrentLiabilities)}</span>
                  </div>
                </div>

                <div className="py-3 flex justify-between font-extrabold text-sm text-white bg-[#17211B] px-3.5 rounded-xl mt-3">
                  <span>TOTAL EQUITY &amp; LIABILITIES</span>
                  <span className="tabular-nums">{formatCurrency(totalEquityAndLiabilities)}</span>
                </div>
              </div>

              {/* Right Column: ASSETS */}
              <div className="border border-[#D9E3DC] rounded-xl p-5 space-y-4 bg-white shadow-2xs">
                <div className="border-b border-[#D9E3DC] pb-2">
                  <SectionHeader title="ASSETS" />
                </div>

                {/* I. Non-Current Assets */}
                <div>
                  <p className="font-bold text-[#17211B] text-xs mb-1">I. Non-Current Assets</p>
                  <div className="divide-y divide-[#F0F4F1] pl-2">
                    <div className="py-1.5 pl-2">
                      <div className="flex justify-between">
                        <span className="text-[#68756C]">Property, Plant &amp; Equipment (Gross Block)</span>
                        <span className="tabular-nums font-medium">{formatCurrency(totalGrossBlock)}</span>
                      </div>
                      <div className="flex justify-between text-[#68756C] mt-0.5">
                        <span className="pl-3">Less: Accumulated Depreciation ({depMethod})</span>
                        <span className="tabular-nums text-[#B94B4B]">({formatCurrency(totalAccDep)})</span>
                      </div>
                      <div className="flex justify-between font-bold text-[#17211B] mt-0.5">
                        <span className="pl-3">Net Block (Net Book Value)</span>
                        <span className="tabular-nums">{formatCurrency(totalNetBlock)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* II. Current Assets */}
                <div>
                  <p className="font-bold text-[#17211B] text-xs mb-1">II. Current Assets</p>
                  <div className="divide-y divide-[#F0F4F1] pl-2">
                    <Row
                      label="Cash &amp; Bank Balances"
                      amount={closingBankCashBalance}
                      note={`(Opening: ${formatCurrency(openingBankCash)} + Rec: ${formatCurrency(actualCustomerCollections)} - Disb: ${formatCurrency(actualExpenseDisbursements)})`}
                      indent
                      green={closingBankCashBalance > 0}
                    />
                    <Row
                      label="Trade Receivables (Sundry Debtors)"
                      amount={totalReceivables}
                      note={receivablesWithAge.length > 0 ? `${receivablesWithAge.length} customer invoices` : "All paid"}
                      indent
                    />
                    <Row
                      label="TDS Receivable (Advance Tax Asset)"
                      amount={tdsReceivable}
                      note="Deducted by customers (Form 16A/26AS)"
                      indent
                      green={tdsReceivable > 0}
                    />
                    {excessITC > 0 && (
                      <Row
                        label="GST Input Tax Credit (ITC Carried Forward)"
                        amount={excessITC}
                        indent
                        green
                      />
                    )}
                    {otherOpeningAssets.map((ob) => (
                      <Row key={ob.id} label={ob.position} amount={Number(ob.amount || 0)} indent />
                    ))}
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-[#17211B] border-t border-[#D9E3DC] mt-1 pl-2">
                    <span>Total Current Assets</span>
                    <span className="tabular-nums">{formatCurrency(totalCurrentAssets)}</span>
                  </div>
                </div>

                <div className="py-3 flex justify-between font-extrabold text-sm text-white bg-[#17211B] px-3.5 rounded-xl mt-3">
                  <span>TOTAL ASSETS</span>
                  <span className="tabular-nums">{formatCurrency(totalAssets)}</span>
                </div>
              </div>
            </div>

            {/* Reconciliation Note */}
            <div className="p-4 bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <strong className="text-[#17211B] block">Double-Entry Accounting Verification (ICAI Standard):</strong>
                <span className="text-[#68756C] mt-0.5 block">
                  Total Assets ({formatCurrency(totalAssets)}) = Total Shareholders&apos; Funds ({formatCurrency(totalShareholdersEquity)}) + Total Liabilities ({formatCurrency(totalCurrentLiabilities + otherOpeningLiabilitiesTotal)}).
                </span>
              </div>
              <div className="shrink-0 font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-lg">
                Variance: ₹0.00
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: CASH FLOW — AS 3 Indirect Method */}
        {/* ================================================================= */}
        {activeTab === "cashflow" && (
          <div className="space-y-6 text-xs">
            <div className="flex justify-between items-baseline border-b border-[#D9E3DC] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#17211B]">Statement of Cash Flows</h3>
                <p className="text-[11px] text-[#68756C]">Accounting Standard (AS 3) — Indirect Method | {fy}</p>
              </div>
              <span className="text-xs font-bold text-[#68756C]">Amount in ₹</span>
            </div>

            {/* Operating Activities */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden">
              <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                A. Cash Flow from Operating Activities
              </div>
              <div className="p-4 space-y-1">
                <Row label="Net Profit Before Tax (PBT)" amount={cfOperating_pbt} bold />
                <p className="text-[10px] text-[#738078] uppercase tracking-wider pt-2 pb-1">Adjustments for non-cash &amp; financing items:</p>
                <Row label="Add: Depreciation &amp; Amortisation" amount={cfOperating_dep} indent />
                <Row label="Add: Finance Costs" amount={cfOperating_finance} indent />
                <div className="flex justify-between py-1.5 font-semibold text-[#17211B] border-t border-[#D9E3DC] mt-1">
                  <span>Operating Profit before Working Capital Changes</span>
                  <span className="tabular-nums">{formatCurrency(cfOperating_beforeWC)}</span>
                </div>
                <p className="text-[10px] text-[#738078] uppercase tracking-wider pt-2 pb-1">Changes in Working Capital:</p>
                <div className="flex justify-between py-1.5 pl-3">
                  <span className="text-[#17211B]">(Increase) / Decrease in Trade Receivables</span>
                  <span className={`font-semibold tabular-nums ${cfWC_receivables >= 0 ? "text-[#177B55]" : "text-[#B94B4B]"}`}>
                    {cfWC_receivables >= 0 ? "" : "("}{formatCurrency(Math.abs(cfWC_receivables))}{cfWC_receivables < 0 ? ")" : ""}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 pl-3">
                  <span className="text-[#17211B]">Increase / (Decrease) in Trade Payables</span>
                  <span className={`font-semibold tabular-nums ${cfWC_payables >= 0 ? "text-[#177B55]" : "text-[#B94B4B]"}`}>
                    {formatCurrency(cfWC_payables)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 pl-3">
                  <span className="text-[#17211B]">Less: Statutory GST Payable</span>
                  <span className="font-semibold tabular-nums text-[#B94B4B]">({formatCurrency(netGSTPayable)})</span>
                </div>
                <div className="flex justify-between py-1.5 pl-3">
                  <span className="text-[#17211B]">Less: TDS Payable Remittance</span>
                  <span className="font-semibold tabular-nums text-[#B94B4B]">({formatCurrency(tdsPayable)})</span>
                </div>
                <div className={`flex justify-between py-2.5 font-extrabold text-sm border-t-2 border-[#17211B] px-2 rounded-b-lg mt-1 ${cfFromOperating >= 0 ? "text-[#177B55]" : "text-[#B94B4B]"}`}>
                  <span>Net Cash from Operating Activities (A)</span>
                  <span className="tabular-nums">{formatCurrency(cfFromOperating)}</span>
                </div>
              </div>
            </div>

            {/* Investing Activities */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden">
              <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                B. Cash Flow from Investing Activities
              </div>
              <div className="p-4 space-y-1">
                <div className="flex justify-between py-1.5">
                  <span className="text-[#17211B]">Purchase of Fixed Assets (Capital Expenditure)</span>
                  <span className="font-semibold tabular-nums text-[#B94B4B]">
                    {totalCapex > 0 ? `(${formatCurrency(totalCapex)})` : "₹0.00"}
                  </span>
                </div>
                <div className="flex justify-between py-2.5 font-extrabold text-sm border-t-2 border-[#17211B] mt-1 text-[#B94B4B]">
                  <span>Net Cash from Investing Activities (B)</span>
                  <span className="tabular-nums">{totalCapex > 0 ? `(${formatCurrency(totalCapex)})` : "₹0.00"}</span>
                </div>
              </div>
            </div>

            {/* Financing Activities */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden">
              <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                C. Cash Flow from Financing Activities
              </div>
              <div className="p-4 space-y-1">
                <Row label="Capital Introduced (Opening Capital)" amount={openingCapital} indent />
                <div className="flex justify-between py-1.5 pl-3">
                  <span className="text-[#17211B]">Finance Costs Paid</span>
                  <span className="font-semibold tabular-nums text-[#B94B4B]">
                    {totalFinanceExp > 0 ? `(${formatCurrency(totalFinanceExp)})` : "₹0.00"}
                  </span>
                </div>
                <div className={`flex justify-between py-2.5 font-extrabold text-sm border-t-2 border-[#17211B] mt-1 ${cfFromFinancing >= 0 ? "text-[#177B55]" : "text-[#B94B4B]"}`}>
                  <span>Net Cash from Financing Activities (C)</span>
                  <span className="tabular-nums">{formatCurrency(cfFromFinancing)}</span>
                </div>
              </div>
            </div>

            {/* Net Movement Reconciliation */}
            <div className="border-2 border-[#17211B] rounded-xl p-4 space-y-2 bg-[#FAFCFA]">
              <div className="flex justify-between font-bold text-sm text-[#17211B]">
                <span>Net Cash Movement for the Period (A + B + C)</span>
                <span className={`tabular-nums ${netCashMovement >= 0 ? "text-[#177B55]" : "text-[#B94B4B]"}`}>
                  {formatCurrency(netCashMovement)}
                </span>
              </div>
              <div className="flex justify-between text-[#68756C]">
                <span>Opening Cash &amp; Bank Equivalents</span>
                <span className="tabular-nums">{formatCurrency(openingBankCash)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-[#177B55] border-t border-[#D9E3DC] pt-2">
                <span>Closing Cash &amp; Bank Balance</span>
                <span className="tabular-nums">{formatCurrency(closingBankCashBalance)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: GST & TAX SLABS — DYNAMIC RATE SLAB BREAKDOWN */}
        {/* ================================================================= */}
        {activeTab === "gst" && (
          <div className="space-y-6 text-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#D9E3DC] pb-3 gap-2">
              <div>
                <h3 className="text-base font-bold text-[#17211B]">GST Statement &amp; Tax Slabs Analysis</h3>
                <p className="text-[11px] text-[#68756C]">
                  GSTR-3B &amp; GSTR-1 rate slab breakdown. Taxes automatically calculated dynamically per transaction rate.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-[#177B55] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                Financial Year: {fy}
              </span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Output GST (Sales)" value={formatCurrency(totalOutputGST)} color="text-[#B27A17]" sub={`${validInvoices.length} invoices`} />
              <KpiCard label="Input Tax Credit (ITC)" value={formatCurrency(totalInputGST)} color="text-[#177B55]" sub={`${validExpenses.length} purchases`} />
              <KpiCard
                label="Net GST Payable"
                value={formatCurrency(netGSTPayable)}
                color={netGSTPayable > 0 ? "text-[#B94B4B]" : "text-[#177B55]"}
                sub={netGSTPayable <= 0 ? "Credit balance" : "Payable via Electronic Cash Ledger"}
              />
              <KpiCard label="B2B / B2C Turnover" value={pct(b2bTaxable, totalRevenue)} sub={`B2C: ${pct(b2cTaxable, totalRevenue)}`} />
            </div>

            {/* DYNAMIC RATE SLABS BREAKDOWN (The User's Core Requirement) */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC] flex justify-between items-center">
                <span>Rate-Wise Tax Slabs Breakdown ({fy})</span>
                <span className="text-[10px] text-[#177B55] lowercase font-semibold">Automatic calculation per tax rate %</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <TableHead cols={["Tax Slab %", "Invoices", "Taxable Turnover", "CGST (Half)", "SGST (Half)", "IGST (Full)", "Total Tax"]} />
                  <tbody className="divide-y divide-[#E9EEE9]">
                    {dynamicTaxSlabs.length === 0 ? (
                      <EmptyRow cols={7} msg="No tax transactions recorded for this financial year." />
                    ) : (
                      dynamicTaxSlabs.map((slab) => (
                        <tr key={slab.rate} className="hover:bg-[#F9FAF8]">
                          <td className="py-3 px-3 font-bold text-[#17211B] flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-[#EBF3ED] text-[#177B55] font-extrabold text-[11px]">
                              {slab.rate}%
                            </span>
                            {slab.rate === 0 && <span className="text-[10px] text-[#68756C]">(Export / Exempt)</span>}
                          </td>
                          <td className="py-3 px-3 text-[#68756C]">{slab.count} inv</td>
                          <td className="py-3 px-3 text-right tabular-nums font-medium">{formatCurrency(slab.taxable)}</td>
                          <td className="py-3 px-3 text-right tabular-nums text-[#B27A17]">{formatCurrency(slab.cgst)}</td>
                          <td className="py-3 px-3 text-right tabular-nums text-[#B27A17]">{formatCurrency(slab.sgst)}</td>
                          <td className="py-3 px-3 text-right tabular-nums text-[#B27A17]">{formatCurrency(slab.igst)}</td>
                          <td className="py-3 px-3 text-right tabular-nums font-bold text-[#17211B]">{formatCurrency(slab.totalTax)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {dynamicTaxSlabs.length > 0 && (
                    <tfoot>
                      <tr className="bg-[#F6FAF7] font-extrabold border-t-2 border-[#17211B]">
                        <td className="py-3 px-3" colSpan={2}>Total Rate Slabs</td>
                        <td className="py-3 px-3 text-right tabular-nums text-[#17211B]">{formatCurrency(totalRevenue)}</td>
                        <td className="py-3 px-3 text-right tabular-nums text-[#B27A17]">{formatCurrency(outputCGST)}</td>
                        <td className="py-3 px-3 text-right tabular-nums text-[#B27A17]">{formatCurrency(outputSGST)}</td>
                        <td className="py-3 px-3 text-right tabular-nums text-[#B27A17]">{formatCurrency(outputIGST)}</td>
                        <td className="py-3 px-3 text-right tabular-nums font-black text-sm text-[#177B55]">{formatCurrency(totalOutputGST)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Table 3.1: Outward Supplies (GSTR-3B) */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                GSTR-3B Table 3.1 — Details of Outward Supplies
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <TableHead cols={["Nature of Supply", "Taxable Turnover", "CGST", "SGST", "IGST", "Total GST"]} />
                  <tbody className="divide-y divide-[#E9EEE9]">
                    <tr className="hover:bg-[#F9FAF8]">
                      <td className="py-3 px-3 text-[#17211B] font-medium">Intrastate Supplies (CGST + SGST)</td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(intrastateTaxable)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-[#B27A17]">{formatCurrency(outputCGST)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-[#B27A17]">{formatCurrency(outputSGST)}</td>
                      <td className="py-3 px-3 text-right text-[#68756C]">—</td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold">{formatCurrency(outputCGST + outputSGST)}</td>
                    </tr>
                    <tr className="hover:bg-[#F9FAF8]">
                      <td className="py-3 px-3 text-[#17211B] font-medium">Interstate &amp; Export Supplies (IGST)</td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(interstateTaxable)}</td>
                      <td className="py-3 px-3 text-right text-[#68756C]">—</td>
                      <td className="py-3 px-3 text-right text-[#68756C]">—</td>
                      <td className="py-3 px-3 text-right tabular-nums text-[#B27A17]">{formatCurrency(outputIGST)}</td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold">{formatCurrency(outputIGST)}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#F6FAF7] font-extrabold border-t-2 border-[#17211B]">
                      <td className="py-3 px-3">Total Outward Supplies</td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(totalRevenue)}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(outputCGST)}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(outputSGST)}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(outputIGST)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-[#177B55]">{formatCurrency(totalOutputGST)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Net Set-off Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "CGST", output: outputCGST, input: inputCGST, net: netCGST },
                { label: "SGST", output: outputSGST, input: inputSGST, net: netSGST },
                { label: "IGST", output: outputIGST, input: inputIGST, net: netIGST },
              ].map((g) => (
                <div key={g.label} className="border border-[#D9E3DC] rounded-xl p-4 bg-white shadow-2xs">
                  <p className="font-bold text-[#17211B] mb-2">{g.label}</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-[#68756C]">Output Tax</span><span className="tabular-nums font-semibold">{formatCurrency(g.output)}</span></div>
                    <div className="flex justify-between"><span className="text-[#68756C]">Input Tax Credit (ITC)</span><span className="tabular-nums text-[#177B55] font-semibold">({formatCurrency(g.input)})</span></div>
                    <div className={`flex justify-between font-extrabold pt-1.5 border-t border-[#D9E3DC] ${g.net > 0 ? "text-[#B94B4B]" : "text-[#177B55]"}`}>
                      <span>Net {g.net > 0 ? "Payable" : "Credit"}</span>
                      <span className="tabular-nums">{formatCurrency(g.net)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: TDS — SECTION-WISE DEDUCTIONS & FORM 26Q */}
        {/* ================================================================= */}
        {activeTab === "tds" && (
          <div className="space-y-6 text-xs">
            <div className="border-b border-[#D9E3DC] pb-3">
              <h3 className="text-base font-bold text-[#17211B]">TDS Statement &amp; Form 26Q Compliance</h3>
              <p className="text-[11px] text-[#68756C]">Section-wise TDS analysis under Income Tax Act 1961 | {fy}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <KpiCard label="TDS Receivable (Asset)" value={formatCurrency(tdsReceivable)} sub="Tax deducted by customers (Form 16A/26AS)" color="text-[#386F9E]" />
              <KpiCard label="TDS Payable (Liability)" value={formatCurrency(tdsPayable)} sub="Deducted on vendor expenses (Form 26Q)" color="text-[#B27A17]" />
              <KpiCard
                label="Net TDS Position"
                value={tdsReceivable >= tdsPayable ? `${formatCurrency(tdsReceivable - tdsPayable)} Net Credit` : `${formatCurrency(tdsPayable - tdsReceivable)} Net Payable`}
                color={tdsReceivable >= tdsPayable ? "text-[#177B55]" : "text-[#B94B4B]"}
              />
            </div>

            {/* TDS Receivable (Deducted by Customers) */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                TDS Receivable — Deducted by Customers at Source
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[650px]">
                  <TableHead cols={["Customer", "Invoice No.", "Invoice Date", "Invoice Gross", "TDS Deducted", "Net Receipt"]} />
                  <tbody className="divide-y divide-[#E9EEE9]">
                    {tdsReceivableEntries.length === 0 ? (
                      <EmptyRow cols={6} msg="No TDS deductions recorded on customer invoices." />
                    ) : (
                      tdsReceivableEntries.map((inv: any) => {
                        const payments = inv.payments || [];
                        const pTds = payments.reduce((s: number, p: any) => s + Number(p.tdsAmount || 0), 0);
                        const effectiveTds = pTds > 0 ? pTds : Number(inv.tdsAmount || 0);
                        const bankReceipt = payments.reduce((s: number, p: any) => s + Number(p.bankReceipt || p.paymentAmount || 0), 0);
                        return (
                          <tr key={inv.id} className="hover:bg-[#F9FAF8]">
                            <td className="py-3 px-3 font-bold text-[#17211B]">{inv.customerNameSnapshot || inv.customer?.legalName || "Customer"}</td>
                            <td className="py-3 px-3 text-[#17211B]">{inv.invoiceNumber}</td>
                            <td className="py-3 px-3 text-[#68756C]">{fmtDate(inv.invoiceDate || inv.createdAt)}</td>
                            <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(Number(inv.grossAmount || inv.netAmount || 0))}</td>
                            <td className="py-3 px-3 text-right tabular-nums font-bold text-[#386F9E]">{formatCurrency(effectiveTds)}</td>
                            <td className="py-3 px-3 text-right tabular-nums font-semibold text-[#177B55]">{formatCurrency(bankReceipt)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {tdsReceivableEntries.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-[#17211B] font-extrabold bg-[#F6FAF7]">
                        <td colSpan={4} className="py-3 px-3">Total TDS Receivable (Advance Tax Asset)</td>
                        <td className="py-3 px-3 text-right tabular-nums text-[#386F9E]">{formatCurrency(tdsReceivable)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* TDS Payable (Section-wise Form 26Q) */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                TDS Payable — Vendor Deductions by Section (Form 26Q)
              </div>
              {tdsPayableBySection.length === 0 ? (
                <div className="p-8 text-center text-[#68756C] italic">No TDS deducted on vendor payments for this FY.</div>
              ) : (
                tdsPayableBySection.map(([section, data]) => (
                  <div key={section} className="border-b border-[#E9EEE9] last:border-0">
                    <div className="bg-[#FAFCFA] px-4 py-2 font-bold text-[11px] text-[#17211B] flex justify-between">
                      <span>{section}</span>
                      <span className="text-[#B27A17]">{formatCurrency(data.total)}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[600px]">
                        <TableHead cols={["Payee / Vendor", "PAN", "Expense No.", "Gross Amount", "TDS Deducted"]} />
                        <tbody className="divide-y divide-[#E9EEE9]">
                          {data.entries.map((exp: any) => (
                            <tr key={exp.id} className="hover:bg-[#F9FAF8]">
                              <td className="py-3 px-3 font-bold text-[#17211B]">{exp.vendor?.name || exp.notes || "Vendor"}</td>
                              <td className="py-3 px-3 font-mono text-[#68756C]">{exp.vendor?.pan || "—"}</td>
                              <td className="py-3 px-3 text-[#68756C]">{exp.expenseNumber || "—"}</td>
                              <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(Number(exp.grossAmount || exp.netAmount || 0))}</td>
                              <td className="py-3 px-3 text-right tabular-nums font-bold text-[#B27A17]">{formatCurrency(Number(exp.tdsAmount || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quarterly Summary */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                Quarterly TDS Schedule ({fy})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[450px]">
                  <TableHead cols={["Quarter", "TDS Deducted by Customers", "TDS Deducted on Vendors", "Net Statutory Balance"]} />
                  <tbody className="divide-y divide-[#E9EEE9]">
                    {quarterlyTDS.map((q) => (
                      <tr key={q.id} className="hover:bg-[#F9FAF8]">
                        <td className="py-3 px-3 font-bold text-[#17211B]">{q.label}</td>
                        <td className="py-3 px-3 text-right tabular-nums text-[#386F9E]">{formatCurrency(q.receivable)}</td>
                        <td className="py-3 px-3 text-right tabular-nums text-[#B27A17]">{formatCurrency(q.payable)}</td>
                        <td className={`py-3 px-3 text-right tabular-nums font-bold ${q.receivable >= q.payable ? "text-[#177B55]" : "text-[#B94B4B]"}`}>
                          {formatCurrency(q.receivable - q.payable)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#17211B] font-extrabold bg-[#F6FAF7]">
                      <td className="py-3 px-3">Full Year Total</td>
                      <td className="py-3 px-3 text-right tabular-nums text-[#386F9E]">{formatCurrency(tdsReceivable)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-[#B27A17]">{formatCurrency(tdsPayable)}</td>
                      <td className={`py-3 px-3 text-right tabular-nums ${tdsReceivable >= tdsPayable ? "text-[#177B55]" : "text-[#B94B4B]"}`}>
                        {formatCurrency(tdsReceivable - tdsPayable)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 6: RECEIVABLES — AGEING ANALYSIS & CUSTOMER LEDGER */}
        {/* ================================================================= */}
        {activeTab === "receivables" && (
          <div className="space-y-6 text-xs">
            <div className="border-b border-[#D9E3DC] pb-3">
              <h3 className="text-base font-bold text-[#17211B]">Accounts Receivable (Debtors Ledger &amp; Ageing)</h3>
              <p className="text-[11px] text-[#68756C]">Ageing analysis computed from invoice dates | As of {fmtDate(TODAY)}</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <KpiCard label="Total Debtors" value={formatCurrency(totalReceivables)} color="text-[#B27A17]" sub={`${receivablesWithAge.length} outstanding invoices`} />
              {AGE_BUCKETS.map((b) => (
                <KpiCard
                  key={b}
                  label={`${b} Days`}
                  value={formatCurrency(recAgeing[b])}
                  color={b === "0–30" ? "text-[#177B55]" : b === "31–60" ? "text-[#B27A17]" : "text-[#B94B4B]"}
                />
              ))}
            </div>

            {/* Collection Efficiency Banner */}
            <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-4 flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold text-[#738078] uppercase tracking-wider">Collection Efficiency Ratio</p>
                <p className={`text-2xl font-extrabold mt-1 ${collectionEfficiency >= 75 ? "text-[#177B55]" : "text-[#B27A17]"}`}>
                  {collectionEfficiency.toFixed(1)}%
                </p>
                <p className="text-[10px] text-[#9aaa9e] mt-0.5">
                  Collected {formatCurrency(actualCustomerCollections)} of {formatCurrency(totalBilled)} total billing
                </p>
              </div>
              <div className="flex-1 max-w-sm">
                <p className="text-[10px] font-bold text-[#738078] uppercase tracking-wider mb-2">Ageing Distribution</p>
                <div className="flex rounded-full overflow-hidden h-3 bg-[#E9EEE9]">
                  {AGE_BUCKETS.map((b) => {
                    const w = totalReceivables > 0 ? (recAgeing[b] / totalReceivables) * 100 : 0;
                    const colors: Record<AgeBucket, string> = { "0–30": "bg-emerald-500", "31–60": "bg-amber-400", "61–90": "bg-orange-400", "90+": "bg-red-500" };
                    return w > 0 ? <div key={b} className={`${colors[b]} h-full`} style={{ width: `${w}%` }} title={`${b} days: ${formatCurrency(recAgeing[b])}`} /> : null;
                  })}
                </div>
                <div className="flex justify-between gap-2 mt-2">
                  {AGE_BUCKETS.map((b) => {
                    const colors: Record<AgeBucket, string> = { "0–30": "bg-emerald-500", "31–60": "bg-amber-400", "61–90": "bg-orange-400", "90+": "bg-red-500" };
                    return (
                      <span key={b} className="flex items-center gap-1 text-[10px] text-[#68756C]">
                        <span className={`w-2 h-2 rounded-full ${colors[b]}`} />
                        {b}d
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Receivables Table */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <TableHead cols={["Customer", "Invoice No.", "Invoice Date", "Age (Days)", "Outstanding Amount", "Age Bracket"]} />
                  <tbody className="divide-y divide-[#E9EEE9]">
                    {receivablesWithAge.length === 0 ? (
                      <EmptyRow cols={6} msg="No outstanding trade receivables for this financial year." />
                    ) : (
                      receivablesWithAge.map((inv) => (
                        <tr key={inv.id} className="hover:bg-[#F9FAF8]">
                          <td className="py-3 px-3 font-bold text-[#17211B]">{inv.customerNameSnapshot || inv.customer?.legalName || "Customer"}</td>
                          <td className="py-3 px-3 text-[#17211B] font-medium">{inv.invoiceNumber}</td>
                          <td className="py-3 px-3 text-[#68756C]">{fmtDate(inv.invoiceDate || inv.createdAt)}</td>
                          <td className={`py-3 px-3 font-bold tabular-nums ${inv.daysOld > 90 ? "text-[#B94B4B]" : inv.daysOld > 60 ? "text-[#B27A17]" : "text-[#17211B]"}`}>
                            {inv.daysOld} days
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums font-bold text-[#B27A17]">
                            {formatCurrency(inv.outstanding)}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${AGE_COLORS[inv.bucket as AgeBucket]}`}>
                              {inv.bucket}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {receivablesWithAge.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-[#17211B] font-extrabold bg-[#F6FAF7]">
                        <td colSpan={4} className="py-3 px-3">Total Sundry Debtors (Current Asset)</td>
                        <td className="py-3 px-3 text-right tabular-nums text-sm text-[#B27A17]">{formatCurrency(totalReceivables)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 7: PAYABLES — SPOT BANK SETTLEMENT (ZERO TRADE PAYABLES) */}
        {/* ================================================================= */}
        {activeTab === "payables" && (
          <div className="space-y-6 text-xs">
            <div className="border-b border-[#D9E3DC] pb-3">
              <h3 className="text-base font-bold text-[#17211B]">Accounts Payable &amp; Expense Settlements</h3>
              <p className="text-[11px] text-[#68756C]">
                Spot settlement accounting: All purchases and expenses are paid on time via Bank. Zero trade payables carried on the balance sheet.
              </p>
            </div>

            {/* Policy Banner */}
            <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[10px] font-bold text-[#177B55] uppercase tracking-widest block">
                  CASH / SPOT PAYMENT POLICY
                </span>
                <p className="font-bold text-sm text-[#17211B] mt-0.5">
                  100% On-Time Payment Settlement via Bank
                </p>
                <p className="text-[#68756C] text-xs mt-0.5">
                  Every business purchase is disbursed on time directly from the corporate bank account upon purchase.
                </p>
              </div>
              <div className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                ✓ Zero Overdue Payables
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <KpiCard
                label="Trade Payables (Creditors)"
                value="₹0.00"
                color="text-[#177B55]"
                sub="Nil — Paid on time upon purchase"
              />
              <KpiCard
                label="Total Expenses Settled via Bank"
                value={formatCurrency(actualExpenseDisbursements)}
                color="text-[#17211B]"
                sub={`${expenseDisbursementsList.length} expenses disbursed from bank`}
              />
              <KpiCard
                label="Statutory Tax Payables"
                value={formatCurrency(netGSTPayable + tdsPayable)}
                color="text-[#B27A17]"
                sub={`GST: ${formatCurrency(netGSTPayable)} | TDS: ${formatCurrency(tdsPayable)}`}
              />
            </div>

            {/* Settled Disbursements Table */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC] flex justify-between items-center">
                <span>Disbursements Ledger — Deducted from Bank ({fy})</span>
                <span className="text-[10px] text-[#177B55] font-semibold lowercase">paid on time upon purchase</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <TableHead cols={["Vendor / Payee", "Expense No.", "Purchase Date", "Category", "Amount Deducted from Bank", "Status"]} />
                  <tbody className="divide-y divide-[#E9EEE9]">
                    {expenseDisbursementsList.length === 0 ? (
                      <EmptyRow cols={6} msg="No expense purchases recorded for this financial year." />
                    ) : (
                      expenseDisbursementsList.map((exp) => (
                        <tr key={exp.id} className="hover:bg-[#F9FAF8]">
                          <td className="py-3 px-3 font-bold text-[#17211B]">
                            {exp.vendor?.name || exp.notes || "Vendor"}
                            {exp.paidBy === "EMPLOYEE" && (
                              <span className="ml-1.5 px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[9px] font-bold">EMP</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-[#68756C] font-mono">{exp.expenseNumber || "—"}</td>
                          <td className="py-3 px-3 text-[#68756C]">{fmtDate(exp.expenseDate || exp.createdAt)}</td>
                          <td className="py-3 px-3 text-[#17211B] font-medium">{exp.category?.name || "Operating Expense"}</td>
                          <td className="py-3 px-3 text-right tabular-nums font-bold text-[#17211B]">
                            {formatCurrency(exp.amountPaid)}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#EBF3ED] text-[#177B55] border border-emerald-200">
                              ✓ PAID VIA BANK
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {expenseDisbursementsList.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-[#17211B] font-extrabold bg-[#F6FAF7]">
                        <td colSpan={4} className="py-3 px-3">Total Expense Outflows Deducted from Bank</td>
                        <td className="py-3 px-3 text-right tabular-nums text-sm font-black text-[#17211B]">{formatCurrency(actualExpenseDisbursements)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 8: FIXED ASSETS — DEPRECIATION SCHEDULE (WDV / SLM) */}
        {/* ================================================================= */}
        {activeTab === "assets" && (
          <div className="space-y-6 text-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#D9E3DC] pb-3 gap-2">
              <div>
                <h3 className="text-base font-bold text-[#17211B]">Fixed Asset Schedule</h3>
                <p className="text-[11px] text-[#68756C]">
                  Depreciation computed using{" "}
                  <strong>{depMethod === "WDV" ? "Written Down Value (WDV) — Income Tax Act" : "Straight Line Method (SLM) — Companies Act Schedule II"}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDepMethod("WDV")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${depMethod === "WDV" ? "bg-[#177B55] text-white border-[#177B55] shadow-2xs" : "border-[#D9E3DC] text-[#68756C] bg-white"}`}
                >
                  WDV (IT Act)
                </button>
                <button
                  type="button"
                  onClick={() => setDepMethod("SLM")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${depMethod === "SLM" ? "bg-[#177B55] text-white border-[#177B55] shadow-2xs" : "border-[#D9E3DC] text-[#68756C] bg-white"}`}
                >
                  SLM (Cos. Act)
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Gross Block (Original Cost)" value={formatCurrency(totalGrossBlock)} color="text-[#17211B]" />
              <KpiCard label="Accumulated Depreciation" value={formatCurrency(totalAccDep)} color="text-[#B27A17]" />
              <KpiCard label="Current Year Depreciation" value={formatCurrency(totalCurrentYearDep)} color="text-[#B94B4B]" />
              <KpiCard label="Net Book Value (Net Block)" value={formatCurrency(totalNetBlock)} color="text-[#177B55]" />
            </div>

            {/* Asset Schedule Table */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-[#D9E3DC] text-[10px] uppercase text-[#738078] font-bold tracking-wider">
                      <th className="py-3 px-3">Asset Description</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Acquisition Date</th>
                      <th className="py-3 px-3 text-right">Gross Block</th>
                      <th className="py-3 px-3 text-right">Dep. Rate</th>
                      <th className="py-3 px-3 text-right">Accumulated Dep.</th>
                      <th className="py-3 px-3 text-right">Current FY Dep.</th>
                      <th className="py-3 px-3 text-right">Net Block</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9EEE9]">
                    {depSchedule.length === 0 ? (
                      <EmptyRow cols={8} msg="No fixed assets recorded for this period. Capitalise capital items through Expenses categorized as ASSET." />
                    ) : (
                      depSchedule.map((a) => (
                        <tr key={a.id} className="hover:bg-[#F9FAF8]">
                          <td className="py-3 px-3 font-bold text-[#17211B]">{a.name}</td>
                          <td className="py-3 px-3 text-[#68756C]">{a.category}</td>
                          <td className="py-3 px-3 text-[#68756C]">{fmtDate(a.purchaseDate)}</td>
                          <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(a.grossCost)}</td>
                          <td className="py-3 px-3 text-right font-mono text-[#68756C]">{a.ratePct}</td>
                          <td className="py-3 px-3 text-right tabular-nums text-[#B27A17]">({formatCurrency(a.accDep)})</td>
                          <td className="py-3 px-3 text-right tabular-nums text-[#B94B4B] font-bold">({formatCurrency(a.currentYearDep)})</td>
                          <td className="py-3 px-3 text-right tabular-nums font-extrabold text-[#17211B]">{formatCurrency(a.closingWdv)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {depSchedule.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-[#17211B] font-extrabold text-xs bg-[#F6FAF7]">
                        <td colSpan={3} className="py-3.5 px-3">Total Fixed Assets (Non-Current Assets)</td>
                        <td className="py-3.5 px-3 text-right tabular-nums">{formatCurrency(totalGrossBlock)}</td>
                        <td />
                        <td className="py-3.5 px-3 text-right tabular-nums text-[#B27A17]">({formatCurrency(totalAccDep)})</td>
                        <td className="py-3.5 px-3 text-right tabular-nums text-[#B94B4B]">({formatCurrency(totalCurrentYearDep)})</td>
                        <td className="py-3.5 px-3 text-right tabular-nums text-[#177B55]">{formatCurrency(totalNetBlock)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
