"use client";

import { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/utils/currency";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY HELPERS
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
  "0–30":  "bg-emerald-50 text-emerald-700",
  "31–60": "bg-amber-50 text-amber-700",
  "61–90": "bg-orange-50 text-orange-700",
  "90+":   "bg-red-50 text-red-700",
};

const TDS_SECTION_MAP: Record<string, string> = {
  "192":  "192 — Salary",
  "194A": "194A — Interest (other than securities)",
  "194C": "194C — Contractors & Sub-contractors",
  "194H": "194H — Commission & Brokerage",
  "194I": "194I — Rent",
  "194J": "194J — Professional / Technical Services",
  "194Q": "194Q — Purchase of Goods",
};
function tdsLabel(code?: string | null): string {
  if (!code) return "194J — Professional / Technical Services";
  return TDS_SECTION_MAP[code] || `${code} — Other`;
}

// WDV rates — Income Tax Act, Appendix I
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

// SLM useful life — Companies Act Schedule II
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
  if (!den) return "—";
  return ((num / den) * 100).toFixed(dec) + "%";
}
function sign(n: number): string { return n >= 0 ? "+" : ""; }

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "pnl" | "bs" | "cashflow" | "gst" | "tds" | "receivables" | "payables" | "assets";
const TABS: { id: Tab; label: string }[] = [
  { id: "pnl",         label: "Profit & Loss" },
  { id: "bs",          label: "Balance Sheet" },
  { id: "cashflow",    label: "Cash Flow" },
  { id: "gst",         label: "GST" },
  { id: "tds",         label: "TDS" },
  { id: "receivables", label: "Receivables" },
  { id: "payables",    label: "Payables" },
  { id: "assets",      label: "Fixed Assets" },
];

// Indian FY quarters (April start)
const QUARTERS = [
  { id: "Q1", label: "Q1 Apr–Jun", months: [3, 4, 5] },
  { id: "Q2", label: "Q2 Jul–Sep", months: [6, 7, 8] },
  { id: "Q3", label: "Q3 Oct–Dec", months: [9, 10, 11] },
  { id: "Q4", label: "Q4 Jan–Mar", months: [0, 1, 2] },
];

// Reusable sub-components
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
    <div className="bg-white border border-[#D9E3DC] rounded-xl p-4">
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

  // ── 1. Base filtered sets ──────────────────────────────────────────────────
  const validInvoices = useMemo(
    () => invoices.filter((inv) => !["CANCELLED", "DRAFT"].includes(inv.status ?? "")),
    [invoices]
  );
  const validExpenses = useMemo(
    () => expenses.filter((exp) => !["CANCELLED", "REJECTED", "DRAFT"].includes(exp.status ?? "")),
    [expenses]
  );

  // ── 2. REVENUE ─────────────────────────────────────────────────────────────
  const totalRevenue = useMemo(
    () => validInvoices.reduce((s, inv) => s + Number(inv.taxableAmount ?? inv.subtotal ?? 0), 0),
    [validInvoices]
  );
  const revenueByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const inv of validInvoices) {
      if (inv.items?.length) {
        for (const item of inv.items) {
          const k = item.name || "Service Income";
          map[k] = (map[k] ?? 0) + Number(item.taxableAmount ?? item.totalAmount ?? 0);
        }
      } else {
        const k = "Revenue from Operations";
        map[k] = (map[k] ?? 0) + Number(inv.taxableAmount ?? 0);
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [validInvoices]);

  // ── 3. EXPENSES — categorised ─────────────────────────────────────────────
  const isAssetExpense = (exp: any) => {
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

  const sumAmt = (arr: any[]) => arr.reduce((s, e) => s + Number(e.netAmount ?? 0), 0);

  const totalEmployeeExp = useMemo(() => sumAmt(employeeExpenses), [employeeExpenses]);
  const totalFinanceExp = useMemo(() => sumAmt(financeExpenses), [financeExpenses]);
  const totalCapex = useMemo(() => sumAmt(assetExpenses), [assetExpenses]);

  // Other OPEX grouped by category
  const otherOpexByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const exp of otherOpex) {
      const k = exp.category?.name ?? "Operating Expenses";
      map[k] = (map[k] ?? 0) + Number(exp.netAmount ?? 0);
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [otherOpex]);
  const totalOtherOpex = useMemo(() => sumAmt(otherOpex), [otherOpex]);

  // ── 4. DEPRECIATION SCHEDULE ──────────────────────────────────────────────
  const depSchedule = useMemo(() =>
    assetExpenses.map((exp) => {
      const cost = Number(exp.netAmount ?? 0);
      const catName = exp.category?.name ?? exp.notes ?? "Fixed Asset";
      const purchaseDate = new Date(exp.expenseDate ?? TODAY);
      const yearsHeld = Math.max(0.5, (TODAY.getTime() - purchaseDate.getTime()) / (365.25 * 86_400_000));
      const rate = depMethod === "WDV" ? getWdvRate(catName) : getSlmRate(catName);
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
        rateDisplay: depMethod === "WDV" ? Math.round(rate * 100) : Math.round((1 / (1 / rate)) * 100),
        ratePct: `${Math.round(rate * 100)}%`,
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

  // ── 5. P&L SUMMARY ────────────────────────────────────────────────────────
  const totalExpenses = totalEmployeeExp + totalFinanceExp + totalCurrentYearDep + totalOtherOpex;
  const grossProfit = totalRevenue - totalOtherOpex; // Simplified gross
  const pbt = totalRevenue - totalExpenses;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMargin = totalRevenue > 0 ? (pbt / totalRevenue) * 100 : 0;

  // ── 6. GST ────────────────────────────────────────────────────────────────
  const outputCGST = useMemo(() => validInvoices.reduce((s, inv) => s + Number(inv.totalCGST ?? 0), 0), [validInvoices]);
  const outputSGST = useMemo(() => validInvoices.reduce((s, inv) => s + Number(inv.totalSGST ?? 0), 0), [validInvoices]);
  const outputIGST = useMemo(() => validInvoices.reduce((s, inv) => s + Number(inv.totalIGST ?? 0), 0), [validInvoices]);
  const totalOutputGST = outputCGST + outputSGST + outputIGST;

  const inputCGST = useMemo(() => validExpenses.reduce((s, e) => s + Number(e.inputCGST ?? 0), 0), [validExpenses]);
  const inputSGST = useMemo(() => validExpenses.reduce((s, e) => s + Number(e.inputSGST ?? 0), 0), [validExpenses]);
  const inputIGST = useMemo(() => validExpenses.reduce((s, e) => s + Number(e.inputIGST ?? 0), 0), [validExpenses]);
  const totalInputGST = inputCGST + inputSGST + inputIGST;

  // IGST can set off against CGST & SGST (simplified sequential)
  let remainingITC_IGST = inputIGST;
  let netCGST = Math.max(0, outputCGST - inputCGST);
  if (netCGST > 0 && remainingITC_IGST > 0) { const off = Math.min(netCGST, remainingITC_IGST); netCGST -= off; remainingITC_IGST -= off; }
  let netSGST = Math.max(0, outputSGST - inputSGST);
  if (netSGST > 0 && remainingITC_IGST > 0) { const off = Math.min(netSGST, remainingITC_IGST); netSGST -= off; remainingITC_IGST -= off; }
  const netIGST = Math.max(0, outputIGST - inputIGST - (inputIGST > outputIGST ? 0 : 0));
  const netGSTPayable = netCGST + netSGST + Math.max(0, outputIGST - inputIGST);

  // Intrastate vs Interstate
  const intrastateInvoices = useMemo(() => validInvoices.filter((inv) => Number(inv.totalIGST ?? 0) === 0), [validInvoices]);
  const interstateInvoices = useMemo(() => validInvoices.filter((inv) => Number(inv.totalIGST ?? 0) > 0), [validInvoices]);
  const intrastateTaxable = useMemo(() => intrastateInvoices.reduce((s, inv) => s + Number(inv.taxableAmount ?? 0), 0), [intrastateInvoices]);
  const interstateTaxable = useMemo(() => interstateInvoices.reduce((s, inv) => s + Number(inv.taxableAmount ?? 0), 0), [interstateInvoices]);

  // B2B vs B2C
  const b2bTaxable = useMemo(
    () => validInvoices.filter((inv) => inv.customer?.gstin).reduce((s, inv) => s + Number(inv.taxableAmount ?? 0), 0),
    [validInvoices]
  );
  const b2cTaxable = totalRevenue - b2bTaxable;

  // HSN summary
  const hsnSummary = useMemo(() => {
    const map: Record<string, { taxable: number; cgst: number; sgst: number; igst: number }> = {};
    for (const inv of validInvoices) {
      if (inv.items?.length) {
        for (const item of inv.items) {
          const hsn = item.hsnSacCode ?? "UNCLASSIFIED";
          if (!map[hsn]) map[hsn] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
          const tv = Number(item.taxableAmount ?? 0);
          const rate = Number(item.gstRate ?? 18) / 100;
          const isIgst = Number(inv.totalIGST ?? 0) > 0;
          map[hsn].taxable += tv;
          map[hsn].cgst += isIgst ? 0 : (tv * rate) / 2;
          map[hsn].sgst += isIgst ? 0 : (tv * rate) / 2;
          map[hsn].igst += isIgst ? tv * rate : 0;
        }
      }
    }
    return Object.entries(map).sort((a, b) => b[1].taxable - a[1].taxable);
  }, [validInvoices]);

  // Monthly GST
  const monthlyGST = useMemo(() => {
    const map: Record<string, { output: number; input: number }> = {};
    for (const inv of validInvoices) {
      const d = new Date(inv.invoiceDate ?? 0);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[k]) map[k] = { output: 0, input: 0 };
      map[k].output += Number(inv.totalGST ?? 0);
    }
    for (const exp of validExpenses) {
      const d = new Date(exp.expenseDate ?? 0);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[k]) map[k] = { output: 0, input: 0 };
      map[k].input += Number(exp.totalInputGST ?? 0);
    }
    return Object.entries(map).sort().map(([month, v]) => ({ month, ...v, net: v.output - v.input }));
  }, [validInvoices, validExpenses]);

  // ── 7. TDS ────────────────────────────────────────────────────────────────
  const tdsReceivable = useMemo(() => validInvoices.reduce((s, inv) => s + Number(inv.tdsAmount ?? 0), 0), [validInvoices]);
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
    () => validInvoices.filter((inv) => Number(inv.tdsAmount ?? 0) > 0),
    [validInvoices]
  );

  const quarterlyTDS = useMemo(() =>
    QUARTERS.map((q) => {
      const payable = validExpenses
        .filter((e) => q.months.includes(new Date(e.expenseDate ?? 0).getMonth()))
        .reduce((s, e) => s + Number(e.tdsAmount ?? 0), 0);
      const receivable = validInvoices
        .filter((inv) => q.months.includes(new Date(inv.invoiceDate ?? 0).getMonth()))
        .reduce((s, inv) => s + Number(inv.tdsAmount ?? 0), 0);
      return { ...q, payable, receivable };
    }),
    [validInvoices, validExpenses]
  );

  // ── 8. RECEIVABLES ────────────────────────────────────────────────────────
  const receivablesList = useMemo(
    () => validInvoices.filter((inv) => !["PAID"].includes(inv.status ?? "")),
    [validInvoices]
  );
  const totalReceivables = useMemo(() => sumAmt(receivablesList), [receivablesList]);
  const receivablesWithAge = useMemo(
    () => receivablesList.map((inv) => {
      const days = daysBetween(inv.invoiceDate);
      return { ...inv, daysOld: days, bucket: ageBucket(days) };
    }).sort((a, b) => b.daysOld - a.daysOld),
    [receivablesList]
  );
  const recAgeing = useMemo(() => {
    const m: Record<AgeBucket, number> = { "0–30": 0, "31–60": 0, "61–90": 0, "90+": 0 };
    for (const inv of receivablesWithAge) m[inv.bucket as AgeBucket] += Number(inv.netAmount ?? 0);
    return m;
  }, [receivablesWithAge]);

  const paidInvoicesTotal = useMemo(
    () => validInvoices.filter((inv) => inv.status === "PAID").reduce((s, inv) => s + Number(inv.netAmount ?? 0), 0),
    [validInvoices]
  );
  const totalBilled = useMemo(() => validInvoices.reduce((s, inv) => s + Number(inv.netAmount ?? 0), 0), [validInvoices]);
  const collectionEfficiency = totalBilled > 0 ? (paidInvoicesTotal / totalBilled) * 100 : 0;

  // ── 9. PAYABLES ───────────────────────────────────────────────────────────
  const payablesList = useMemo(
    () => validExpenses.filter((exp) => exp.paymentStatus !== "PAID"),
    [validExpenses]
  );
  const totalPayables = useMemo(() => sumAmt(payablesList), [payablesList]);
  const payablesWithAge = useMemo(
    () => payablesList.map((exp) => {
      const days = daysBetween(exp.expenseDate);
      return { ...exp, daysOld: days, bucket: ageBucket(days) };
    }).sort((a, b) => b.daysOld - a.daysOld),
    [payablesList]
  );
  const payAgeing = useMemo(() => {
    const m: Record<AgeBucket, number> = { "0–30": 0, "31–60": 0, "61–90": 0, "90+": 0 };
    for (const exp of payablesWithAge) m[exp.bucket as AgeBucket] += Number(exp.netAmount ?? 0);
    return m;
  }, [payablesWithAge]);

  const employeePayables = useMemo(() => payablesList.filter((e) => e.paidBy === "EMPLOYEE"), [payablesList]);
  const vendorPayables = useMemo(() => payablesList.filter((e) => e.paidBy !== "EMPLOYEE"), [payablesList]);
  const totalEmployeePayables = useMemo(() => sumAmt(employeePayables), [employeePayables]);
  const totalVendorPayables = useMemo(() => sumAmt(vendorPayables), [vendorPayables]);

  const paidExpensesTotal = useMemo(
    () => validExpenses.filter((e) => e.paymentStatus === "PAID").reduce((s, e) => s + Number(e.netAmount ?? 0), 0),
    [validExpenses]
  );

  // ── 10. BALANCE SHEET ─────────────────────────────────────────────────────
  const openingAssets = useMemo(() => openingBalances.filter((ob) => ob.type === "Asset"), [openingBalances]);
  const openingLiabilities = useMemo(() => openingBalances.filter((ob) => ob.type === "Liability"), [openingBalances]);
  const capitalTotal = useMemo(() => openingLiabilities.reduce((s, ob) => s + Number(ob.amount ?? 0), 0), [openingLiabilities]);
  const openingAssetsTotal = useMemo(() => openingAssets.reduce((s, ob) => s + Number(ob.amount ?? 0), 0), [openingAssets]);
  const cashBalance = paidInvoicesTotal - paidExpensesTotal;
  const reservesAndSurplus = pbt;

  const totalShareholdersEquity = capitalTotal + reservesAndSurplus;
  const totalCurrentLiabilities = totalVendorPayables + totalEmployeePayables + netGSTPayable + tdsPayable;
  const totalEquityAndLiabilities = totalShareholdersEquity + totalCurrentLiabilities;
  const totalCurrentAssets = Math.max(0, cashBalance) + totalReceivables + totalInputGST + tdsReceivable + openingAssetsTotal;
  const totalAssets = totalCurrentAssets + totalNetBlock;
  const bsDiff = totalAssets - totalEquityAndLiabilities;
  const isBalanced = Math.abs(bsDiff) < 1;

  // ── 11. CASH FLOW (AS 3 Indirect) ────────────────────────────────────────
  const cfOperating_pbt = pbt;
  const cfOperating_dep = totalCurrentYearDep;
  const cfOperating_finance = totalFinanceExp;
  const cfOperating_beforeWC = cfOperating_pbt + cfOperating_dep + cfOperating_finance;
  const cfWC_receivables = -totalReceivables; // increase in debtors = outflow
  const cfWC_payables = totalPayables;        // increase in creditors = inflow
  const cfWC_gst = -netGSTPayable;
  const cfWC_tds = -tdsPayable;
  const cfFromOperating = cfOperating_beforeWC + cfWC_receivables + cfWC_payables + cfWC_gst + cfWC_tds;
  const cfFromInvesting = -totalCapex;
  const cfFromFinancing = capitalTotal - totalFinanceExp;
  const netCashMovement = cfFromOperating + cfFromInvesting + cfFromFinancing;
  const openingCashBalance = openingAssetsTotal > 0 ? openingAssetsTotal : 0;
  const closingCashBalance = openingCashBalance + netCashMovement;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#177B55] tracking-widest uppercase block">
            FINANCIAL STATEMENTS • INDIA
          </span>
          <h1 className="text-3xl font-extrabold text-[#17211B] mt-0.5 tracking-tight">Reports</h1>
          <p className="text-[#68756C] text-sm mt-0.5">
            CA-grade statements computed from confirmed tax invoices and expense records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={fy}
            onChange={(e) => setFy(e.target.value)}
            className="border border-[#D9E3DC] rounded-xl px-3 py-2 text-xs font-semibold bg-white text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#177B55]"
          >
            {["FY 2026–27", "FY 2025–26", "FY 2024–25"].map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 border border-[#D9E3DC] rounded-xl text-xs font-bold text-[#17211B] hover:bg-[#F6FAF7] transition-colors"
          >
            Print / Export
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-6 md:p-8 space-y-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#D9E3DC] pb-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === t.id
                  ? "bg-[#1b5e4b] text-white shadow-sm"
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
                <p className="text-[11px] text-[#68756C]">As per Schedule III — Companies Act 2013 | {fy}</p>
              </div>
              <span className="text-xs font-bold text-[#68756C]">Amount in ₹</span>
            </div>

            {/* KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Total Revenue" value={formatCurrency(totalRevenue)} color="text-[#177B55]" />
              <KpiCard label="Total Expenses" value={formatCurrency(totalExpenses)} color="text-[#B27A17]" />
              <KpiCard
                label="Profit Before Tax"
                value={formatCurrency(pbt)}
                color={pbt >= 0 ? "text-[#177B55]" : "text-[#B94B4B]"}
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
                <SectionHeader title="I. Revenue from Operations" />
                <div className="pl-3 divide-y divide-[#F0F4F1]">
                  {revenueByCategory.length === 0 ? (
                    <p className="py-2 text-[#68756C] italic">No revenue transactions recorded.</p>
                  ) : revenueByCategory.map(([cat, amt]) => (
                    <Row key={cat} label={cat} amount={amt} indent />
                  ))}
                </div>
                <TotalRow label="Total Revenue from Operations" amount={totalRevenue} green />
              </div>

              {/* II. Other Income — placeholder */}
              <div className="py-4">
                <SectionHeader title="II. Other Income" />
                <div className="py-1.5 flex justify-between text-[#68756C] italic">
                  <span>Other Income</span>
                  <span>—</span>
                </div>
              </div>

              {/* IV. Expenses */}
              <div className="py-4 space-y-2">
                <SectionHeader title="IV. Expenses" />

                {/* Employee Benefit Expense */}
                <div>
                  <p className="font-semibold text-[#17211B] py-1">(a) Employee Benefit Expense</p>
                  <div className="pl-3 divide-y divide-[#F0F4F1]">
                    {employeeExpenses.length === 0 ? (
                      <p className="py-1.5 text-[#68756C] italic">—</p>
                    ) : employeeExpenses.map((exp) => (
                      <Row key={exp.id} label={exp.category?.name ?? "Employee Expense"} amount={Number(exp.netAmount ?? 0)} indent />
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
                      <p className="py-1.5 text-[#68756C] italic">—</p>
                    ) : financeExpenses.map((exp) => (
                      <Row key={exp.id} label={exp.category?.name ?? "Finance Cost"} amount={Number(exp.netAmount ?? 0)} indent />
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
                  <p className="font-semibold text-[#17211B] py-1">(d) Other Expenses</p>
                  <div className="pl-3 divide-y divide-[#F0F4F1]">
                    {otherOpexByCategory.length === 0 ? (
                      <p className="py-1.5 text-[#68756C] italic">—</p>
                    ) : otherOpexByCategory.map(([cat, amt]) => (
                      <Row key={cat} label={cat} amount={amt} indent />
                    ))}
                  </div>
                  <div className="flex justify-between py-1.5 pl-3 font-semibold text-[#17211B]">
                    <span>Total Other Expenses</span>
                    <span className="tabular-nums">{formatCurrency(totalOtherOpex)}</span>
                  </div>
                </div>

                <TotalRow label="Total Expenses (IV)" amount={totalExpenses} red />
              </div>

              {/* V. Profit Before Tax */}
              <div className="pt-4">
                <div className={`flex justify-between items-center py-3 px-3 rounded-xl font-extrabold text-sm ${pbt >= 0 ? "bg-[#EBF3ED] text-[#0B5F46]" : "bg-red-50 text-[#B94B4B]"}`}>
                  <span>V. Profit Before Tax (PBT)</span>
                  <span className="tabular-nums text-base">{formatCurrency(pbt)}</span>
                </div>
                <div className="mt-2 flex justify-between py-2 px-3 text-[#68756C] italic">
                  <span>VI. Tax Expense (Current Tax / Deferred Tax)</span>
                  <span>— (Provision required)</span>
                </div>
                <div className={`flex justify-between items-center py-3 px-3 rounded-xl font-extrabold text-sm mt-1 border-2 ${pbt >= 0 ? "border-[#177B55] text-[#177B55]" : "border-[#B94B4B] text-[#B94B4B]"}`}>
                  <span>VII. Profit for the Period (PAT)</span>
                  <span className="tabular-nums text-base">{formatCurrency(pbt)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: BALANCE SHEET — Schedule III (Part I) */}
        {/* ================================================================= */}
        {activeTab === "bs" && (
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-baseline border-b border-[#D9E3DC] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#17211B]">Balance Sheet</h3>
                <p className="text-[11px] text-[#68756C]">As per Schedule III — Companies Act 2013 | As at {fy}</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${isBalanced ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {isBalanced ? "✓ Balanced" : `⚠ Difference: ${formatCurrency(Math.abs(bsDiff))}`}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left: Equity & Liabilities */}
              <div className="border border-[#D9E3DC] rounded-xl p-4 space-y-4">
                <SectionHeader title="EQUITY & LIABILITIES" />

                {/* I. Shareholders' Funds */}
                <div>
                  <p className="font-bold text-[#17211B] mb-1">I. Shareholders&apos; Funds</p>
                  <div className="divide-y divide-[#F0F4F1] pl-2">
                    {openingLiabilities.length === 0 ? (
                      <div className="py-1.5 flex justify-between text-[#68756C] italic">
                        <span>Share Capital / Capital</span><span>—</span>
                      </div>
                    ) : openingLiabilities.map((ob) => (
                      <Row key={ob.id} label={ob.position} amount={Number(ob.amount ?? 0)} indent />
                    ))}
                    <Row
                      label="Reserves & Surplus (Current Year P&L)"
                      amount={reservesAndSurplus}
                      green={reservesAndSurplus >= 0}
                      red={reservesAndSurplus < 0}
                      indent
                    />
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-[#17211B] border-t border-[#D9E3DC] mt-1">
                    <span>Total Shareholders&apos; Funds</span>
                    <span className="tabular-nums">{formatCurrency(totalShareholdersEquity)}</span>
                  </div>
                </div>

                {/* II. Non-current Liabilities */}
                <div>
                  <p className="font-bold text-[#17211B] mb-1">II. Non-Current Liabilities</p>
                  <div className="py-1.5 text-[#68756C] italic pl-2">Long-term Borrowings — (record via Opening Balance)</div>
                </div>

                {/* III. Current Liabilities */}
                <div>
                  <p className="font-bold text-[#17211B] mb-1">III. Current Liabilities</p>
                  <div className="divide-y divide-[#F0F4F1] pl-2">
                    <Row label="Trade Payables (Vendors)" amount={totalVendorPayables} indent />
                    <Row label="Employee Payables" amount={totalEmployeePayables} indent />
                    <Row label="GST Payable (Net)" amount={netGSTPayable} indent />
                    <Row label="TDS Payable" amount={tdsPayable} indent />
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-[#17211B] border-t border-[#D9E3DC] mt-1">
                    <span>Total Current Liabilities</span>
                    <span className="tabular-nums">{formatCurrency(totalCurrentLiabilities)}</span>
                  </div>
                </div>

                <div className="py-3 flex justify-between font-extrabold text-sm text-white bg-[#17211B] px-3 rounded-xl mt-2">
                  <span>TOTAL EQUITY &amp; LIABILITIES</span>
                  <span className="tabular-nums">{formatCurrency(totalEquityAndLiabilities)}</span>
                </div>
              </div>

              {/* Right: Assets */}
              <div className="border border-[#D9E3DC] rounded-xl p-4 space-y-4">
                <SectionHeader title="ASSETS" />

                {/* I. Non-Current Assets */}
                <div>
                  <p className="font-bold text-[#17211B] mb-1">I. Non-Current Assets</p>
                  <div className="divide-y divide-[#F0F4F1] pl-2">
                    <div className="py-1.5">
                      <div className="flex justify-between">
                        <span className="text-[#68756C]">Tangible Fixed Assets — Gross Block</span>
                        <span className="tabular-nums">{formatCurrency(totalGrossBlock)}</span>
                      </div>
                      <div className="flex justify-between text-[#68756C] mt-0.5">
                        <span className="pl-3">Less: Accumulated Depreciation</span>
                        <span className="tabular-nums text-[#B94B4B]">({formatCurrency(totalAccDep)})</span>
                      </div>
                      <div className="flex justify-between font-bold text-[#17211B] mt-0.5">
                        <span className="pl-3">Net Block</span>
                        <span className="tabular-nums">{formatCurrency(totalNetBlock)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-[#17211B] border-t border-[#D9E3DC] mt-1">
                    <span>Total Non-Current Assets</span>
                    <span className="tabular-nums">{formatCurrency(totalNetBlock)}</span>
                  </div>
                </div>

                {/* II. Current Assets */}
                <div>
                  <p className="font-bold text-[#17211B] mb-1">II. Current Assets</p>
                  <div className="divide-y divide-[#F0F4F1] pl-2">
                    <Row label="Cash &amp; Bank Equivalents" amount={Math.max(0, cashBalance)} indent />
                    <Row label="Trade Receivables (Debtors)" amount={totalReceivables} indent />
                    <Row label="GST — Input Tax Credit (ITC)" amount={totalInputGST} green indent />
                    <Row label="TDS Receivable" amount={tdsReceivable} indent />
                    {openingAssets.map((ob) => (
                      <Row key={ob.id} label={ob.position} amount={Number(ob.amount ?? 0)} indent />
                    ))}
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-[#17211B] border-t border-[#D9E3DC] mt-1">
                    <span>Total Current Assets</span>
                    <span className="tabular-nums">{formatCurrency(totalCurrentAssets)}</span>
                  </div>
                </div>

                <div className="py-3 flex justify-between font-extrabold text-sm text-white bg-[#17211B] px-3 rounded-xl mt-2">
                  <span>TOTAL ASSETS</span>
                  <span className="tabular-nums">{formatCurrency(totalAssets)}</span>
                </div>
              </div>
            </div>

            {!isBalanced && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                ⚠ <strong>Balance Sheet does not tally.</strong> Difference of {formatCurrency(Math.abs(bsDiff))} — may be due to unrecorded opening balances, capital accounts, or unclassified transactions. Review opening balances under <em>Opening / Closing</em> module.
              </div>
            )}
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
                <p className="text-[11px] text-[#68756C]">As per AS 3 — Indirect Method | {fy}</p>
              </div>
              <span className="text-xs font-bold text-[#68756C]">Amount in ₹</span>
            </div>

            {/* Section A */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden">
              <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                A. Cash Flow from Operating Activities
              </div>
              <div className="p-4 space-y-1">
                <Row label="Net Profit Before Tax" amount={cfOperating_pbt} bold />
                <p className="text-[10px] text-[#738078] uppercase tracking-wider pt-2 pb-1">Adjustments for non-cash / financing items:</p>
                <Row label="Add: Depreciation &amp; Amortisation" amount={cfOperating_dep} indent />
                <Row label="Add: Finance Costs" amount={cfOperating_finance} indent />
                <div className="flex justify-between py-1.5 font-semibold text-[#17211B] border-t border-[#D9E3DC] mt-1">
                  <span>Operating Profit before Working Capital Changes</span>
                  <span className="tabular-nums">{formatCurrency(cfOperating_beforeWC)}</span>
                </div>
                <p className="text-[10px] text-[#738078] uppercase tracking-wider pt-2 pb-1">Changes in Working Capital:</p>
                <div className="flex justify-between py-1.5 pl-3">
                  <span className="text-[#17211B]">(Increase)/Decrease in Trade Receivables</span>
                  <span className={`font-semibold tabular-nums ${cfWC_receivables >= 0 ? "text-[#177B55]" : "text-[#B94B4B]"}`}>
                    {cfWC_receivables >= 0 ? "" : "("}{formatCurrency(Math.abs(cfWC_receivables))}{cfWC_receivables < 0 ? ")" : ""}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 pl-3">
                  <span className="text-[#17211B]">Increase/(Decrease) in Trade Payables</span>
                  <span className={`font-semibold tabular-nums ${cfWC_payables >= 0 ? "text-[#177B55]" : "text-[#B94B4B]"}`}>
                    {formatCurrency(cfWC_payables)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 pl-3">
                  <span className="text-[#17211B]">Less: GST Paid (net)</span>
                  <span className="font-semibold tabular-nums text-[#B94B4B]">({formatCurrency(netGSTPayable)})</span>
                </div>
                <div className="flex justify-between py-1.5 pl-3">
                  <span className="text-[#17211B]">Less: TDS Remitted</span>
                  <span className="font-semibold tabular-nums text-[#B94B4B]">({formatCurrency(tdsPayable)})</span>
                </div>
                <div className={`flex justify-between py-2.5 font-extrabold text-sm border-t-2 border-[#17211B] px-2 rounded-b-lg mt-1 ${cfFromOperating >= 0 ? "text-[#177B55]" : "text-[#B94B4B]"}`}>
                  <span>Net Cash from Operating Activities (A)</span>
                  <span className="tabular-nums">{formatCurrency(cfFromOperating)}</span>
                </div>
              </div>
            </div>

            {/* Section B */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden">
              <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                B. Cash Flow from Investing Activities
              </div>
              <div className="p-4 space-y-1">
                <div className="flex justify-between py-1.5">
                  <span className="text-[#17211B]">Purchase of Fixed Assets (CAPEX)</span>
                  <span className="font-semibold tabular-nums text-[#B94B4B]">
                    {totalCapex > 0 ? `(${formatCurrency(totalCapex)})` : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-2.5 font-extrabold text-sm border-t-2 border-[#17211B] mt-1 text-[#B94B4B]">
                  <span>Net Cash from Investing Activities (B)</span>
                  <span className="tabular-nums">{totalCapex > 0 ? `(${formatCurrency(totalCapex)})` : "—"}</span>
                </div>
              </div>
            </div>

            {/* Section C */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden">
              <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                C. Cash Flow from Financing Activities
              </div>
              <div className="p-4 space-y-1">
                <Row label="Capital / Equity Introduced (Opening Balance)" amount={capitalTotal} indent />
                <div className="flex justify-between py-1.5 pl-3">
                  <span className="text-[#17211B]">Finance Costs Paid</span>
                  <span className="font-semibold tabular-nums text-[#B94B4B]">
                    {totalFinanceExp > 0 ? `(${formatCurrency(totalFinanceExp)})` : "—"}
                  </span>
                </div>
                <div className={`flex justify-between py-2.5 font-extrabold text-sm border-t-2 border-[#17211B] mt-1 ${cfFromFinancing >= 0 ? "text-[#177B55]" : "text-[#B94B4B]"}`}>
                  <span>Net Cash from Financing Activities (C)</span>
                  <span className="tabular-nums">{formatCurrency(cfFromFinancing)}</span>
                </div>
              </div>
            </div>

            {/* Net Summary */}
            <div className="border-2 border-[#17211B] rounded-xl p-4 space-y-2">
              <div className="flex justify-between font-bold">
                <span>Net Increase/(Decrease) in Cash (A+B+C)</span>
                <span className={`tabular-nums ${netCashMovement >= 0 ? "text-[#177B55]" : "text-[#B94B4B]"}`}>{sign(netCashMovement)}{formatCurrency(netCashMovement)}</span>
              </div>
              <div className="flex justify-between text-[#68756C]">
                <span>Opening Cash &amp; Cash Equivalents</span>
                <span className="tabular-nums">{formatCurrency(openingCashBalance)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-[#177B55] border-t border-[#D9E3DC] pt-2">
                <span>Closing Cash &amp; Cash Equivalents</span>
                <span className="tabular-nums">{formatCurrency(closingCashBalance)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: GST — GSTR-3B Format */}
        {/* ================================================================= */}
        {activeTab === "gst" && (
          <div className="space-y-6 text-xs">
            <div className="border-b border-[#D9E3DC] pb-3">
              <h3 className="text-base font-bold text-[#17211B]">GST Statement</h3>
              <p className="text-[11px] text-[#68756C]">GSTR-3B Summary — Output Tax, Input Tax Credit &amp; Net Payable | {fy}</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Total Output GST" value={formatCurrency(totalOutputGST)} color="text-[#B27A17]" />
              <KpiCard label="Total Input Tax Credit" value={formatCurrency(totalInputGST)} color="text-[#177B55]" />
              <KpiCard
                label="Net GST Payable"
                value={formatCurrency(netGSTPayable)}
                color={netGSTPayable > 0 ? "text-[#B94B4B]" : "text-[#177B55]"}
                sub={netGSTPayable <= 0 ? "Credit balance" : "Cash payment required"}
              />
              <KpiCard label="B2B / B2C Split" value={pct(b2bTaxable, totalRevenue)} sub={`B2C: ${pct(b2cTaxable, totalRevenue)}`} />
            </div>

            {/* Table 3.1: Outward Supplies */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden">
              <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                Table 3.1 — Details of Outward Supplies (Output Tax)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <TableHead cols={["Nature of Supply", "Taxable Value", "CGST", "SGST", "IGST", "Total GST"]} />
                  <tbody className="divide-y divide-[#E9EEE9]">
                    <tr className="hover:bg-[#F9FAF8]">
                      <td className="py-3 px-3 text-[#17211B] font-medium">Intrastate (CGST + SGST)</td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(intrastateTaxable)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-[#B27A17]">{formatCurrency(outputCGST)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-[#B27A17]">{formatCurrency(outputSGST)}</td>
                      <td className="py-3 px-3 text-right text-[#68756C]">—</td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold">{formatCurrency(outputCGST + outputSGST)}</td>
                    </tr>
                    <tr className="hover:bg-[#F9FAF8]">
                      <td className="py-3 px-3 text-[#17211B] font-medium">Interstate (IGST)</td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(interstateTaxable)}</td>
                      <td className="py-3 px-3 text-right text-[#68756C]">—</td>
                      <td className="py-3 px-3 text-right text-[#68756C]">—</td>
                      <td className="py-3 px-3 text-right tabular-nums text-[#B27A17]">{formatCurrency(outputIGST)}</td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold">{formatCurrency(outputIGST)}</td>
                    </tr>
                    <tr className="bg-[#F6FAF7] font-extrabold border-t-2 border-[#17211B]">
                      <td className="py-3 px-3">Total Outward</td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(totalRevenue)}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(outputCGST)}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(outputSGST)}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(outputIGST)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-[#B27A17]">{formatCurrency(totalOutputGST)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 4: ITC */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden">
              <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                Table 4 — Eligible Input Tax Credit (ITC)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[500px]">
                  <TableHead cols={["Source", "CGST", "SGST", "IGST", "Total ITC"]} />
                  <tbody>
                    <tr className="hover:bg-[#F9FAF8]">
                      <td className="py-3 px-3 text-[#17211B]">4(A)(IV) — All other ITC (Purchases &amp; Expenses)</td>
                      <td className="py-3 px-3 text-right tabular-nums text-[#177B55]">{formatCurrency(inputCGST)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-[#177B55]">{formatCurrency(inputSGST)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-[#177B55]">{formatCurrency(inputIGST)}</td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold text-[#177B55]">{formatCurrency(totalInputGST)}</td>
                    </tr>
                    <tr className="bg-[#F6FAF7] font-extrabold border-t-2 border-[#17211B]">
                      <td className="py-3 px-3">Total ITC Available</td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(inputCGST)}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(inputSGST)}</td>
                      <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(inputIGST)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-[#177B55]">{formatCurrency(totalInputGST)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Net Payable reconciliation */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "CGST", output: outputCGST, input: inputCGST, net: netCGST },
                { label: "SGST", output: outputSGST, input: inputSGST, net: netSGST },
                { label: "IGST", output: outputIGST, input: inputIGST, net: Math.max(0, outputIGST - inputIGST) },
              ].map((g) => (
                <div key={g.label} className="border border-[#D9E3DC] rounded-xl p-4">
                  <p className="font-bold text-[#17211B] mb-2">{g.label}</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-[#68756C]">Output</span><span className="tabular-nums">{formatCurrency(g.output)}</span></div>
                    <div className="flex justify-between"><span className="text-[#68756C]">ITC</span><span className="tabular-nums text-[#177B55]">({formatCurrency(g.input)})</span></div>
                    <div className={`flex justify-between font-extrabold pt-1 border-t border-[#D9E3DC] ${g.net > 0 ? "text-[#B94B4B]" : "text-[#177B55]"}`}>
                      <span>Net {g.net > 0 ? "Payable" : "Credit"}</span>
                      <span className="tabular-nums">{formatCurrency(g.net)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* HSN Summary */}
            {hsnSummary.length > 0 && (
              <div className="border border-[#D9E3DC] rounded-xl overflow-hidden">
                <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                  HSN / SAC Wise Summary
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <TableHead cols={["HSN / SAC", "Taxable Value", "CGST", "SGST", "IGST", "Total Tax"]} />
                    <tbody className="divide-y divide-[#E9EEE9]">
                      {hsnSummary.map(([hsn, v]) => (
                        <tr key={hsn} className="hover:bg-[#F9FAF8]">
                          <td className="py-3 px-3 font-mono font-bold text-[#17211B]">{hsn}</td>
                          <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(v.taxable)}</td>
                          <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(v.cgst)}</td>
                          <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(v.sgst)}</td>
                          <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(v.igst)}</td>
                          <td className="py-3 px-3 text-right tabular-nums font-bold">{formatCurrency(v.cgst + v.sgst + v.igst)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Monthly GST Table */}
            {monthlyGST.length > 0 && (
              <div className="border border-[#D9E3DC] rounded-xl overflow-hidden">
                <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                  Month-wise GST Summary
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[400px]">
                    <TableHead cols={["Month", "Output GST", "Input ITC", "Net Payable/(Credit)"]} />
                    <tbody className="divide-y divide-[#E9EEE9]">
                      {monthlyGST.map((row) => (
                        <tr key={row.month} className="hover:bg-[#F9FAF8]">
                          <td className="py-3 px-3 font-medium text-[#17211B]">{row.month}</td>
                          <td className="py-3 px-3 text-right tabular-nums text-[#B27A17]">{formatCurrency(row.output)}</td>
                          <td className="py-3 px-3 text-right tabular-nums text-[#177B55]">{formatCurrency(row.input)}</td>
                          <td className={`py-3 px-3 text-right tabular-nums font-bold ${row.net >= 0 ? "text-[#B94B4B]" : "text-[#177B55]"}`}>
                            {row.net >= 0 ? formatCurrency(row.net) : `(${formatCurrency(Math.abs(row.net))})`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: TDS — Form 26Q / Section-wise */}
        {/* ================================================================= */}
        {activeTab === "tds" && (
          <div className="space-y-6 text-xs">
            <div className="border-b border-[#D9E3DC] pb-3">
              <h3 className="text-base font-bold text-[#17211B]">TDS Statement</h3>
              <p className="text-[11px] text-[#68756C]">Section-wise deductions — Form 26Q summary | {fy}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <KpiCard label="TDS Receivable" value={formatCurrency(tdsReceivable)} sub="Deducted by customers" color="text-[#386F9E]" />
              <KpiCard label="TDS Payable (Deducted)" value={formatCurrency(tdsPayable)} sub="To be remitted to IT dept." color="text-[#B27A17]" />
              <KpiCard
                label="Net TDS Position"
                value={tdsReceivable >= tdsPayable ? formatCurrency(tdsReceivable - tdsPayable) + " Receivable" : formatCurrency(tdsPayable - tdsReceivable) + " Payable"}
                color={tdsReceivable >= tdsPayable ? "text-[#177B55]" : "text-[#B94B4B]"}
              />
            </div>

            {/* TDS Payable — Section-wise (Form 26Q) */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden">
              <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                TDS Payable — Section-wise Details (Form 26Q)
              </div>
              {tdsPayableBySection.length === 0 ? (
                <div className="p-6 text-center text-[#68756C] italic">No TDS deductions recorded.</div>
              ) : tdsPayableBySection.map(([section, data]) => (
                <div key={section} className="border-b border-[#E9EEE9] last:border-0">
                  <div className="bg-[#FAFCFA] px-4 py-2 font-bold text-[11px] text-[#17211B] flex justify-between">
                    <span>{section}</span>
                    <span className="text-[#B27A17]">{formatCurrency(data.total)}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                      <TableHead cols={["Deductee / Vendor", "PAN", "Expense No.", "Gross Amount", "TDS Amount"]} />
                      <tbody className="divide-y divide-[#E9EEE9]">
                        {data.entries.map((exp: any) => (
                          <tr key={exp.id} className="hover:bg-[#F9FAF8]">
                            <td className="py-3 px-3 font-bold text-[#17211B]">{exp.vendor?.name ?? exp.notes ?? "Vendor"}</td>
                            <td className="py-3 px-3 font-mono text-[#68756C]">{exp.vendor?.pan ?? "—"}</td>
                            <td className="py-3 px-3 text-[#68756C]">{exp.expenseNumber ?? "—"}</td>
                            <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(Number(exp.grossAmount ?? 0))}</td>
                            <td className="py-3 px-3 text-right tabular-nums font-bold text-[#B27A17]">{formatCurrency(Number(exp.tdsAmount ?? 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            {/* TDS Receivable from Customers */}
            {tdsReceivableEntries.length > 0 && (
              <div className="border border-[#D9E3DC] rounded-xl overflow-hidden">
                <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                  TDS Receivable — Deducted by Customers (Form 16A)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <TableHead cols={["Customer", "Invoice No.", "Invoice Date", "Invoice Amount", "TDS Deducted"]} />
                    <tbody className="divide-y divide-[#E9EEE9]">
                      {tdsReceivableEntries.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-[#F9FAF8]">
                          <td className="py-3 px-3 font-bold text-[#17211B]">{inv.customerNameSnapshot ?? inv.customer?.legalName ?? "Customer"}</td>
                          <td className="py-3 px-3 text-[#68756C]">{inv.invoiceNumber}</td>
                          <td className="py-3 px-3 text-[#68756C]">{fmtDate(inv.invoiceDate)}</td>
                          <td className="py-3 px-3 text-right tabular-nums">{formatCurrency(Number(inv.netAmount ?? 0))}</td>
                          <td className="py-3 px-3 text-right tabular-nums font-bold text-[#386F9E]">{formatCurrency(Number(inv.tdsAmount ?? 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[#17211B] font-extrabold bg-[#F6FAF7]">
                        <td colSpan={4} className="py-3 px-3">Total TDS Receivable</td>
                        <td className="py-3 px-3 text-right tabular-nums text-[#386F9E]">{formatCurrency(tdsReceivable)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Quarterly Summary */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden">
              <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                Quarterly TDS Summary (Indian FY)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[400px]">
                  <TableHead cols={["Quarter", "TDS Receivable", "TDS Payable", "Net"]} />
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
                      <td className="py-3 px-3">Total (Full Year)</td>
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
        {/* TAB 6: RECEIVABLES — Ageing Analysis */}
        {/* ================================================================= */}
        {activeTab === "receivables" && (
          <div className="space-y-6 text-xs">
            <div className="border-b border-[#D9E3DC] pb-3">
              <h3 className="text-base font-bold text-[#17211B]">Accounts Receivable — Customer Ledger &amp; Ageing</h3>
              <p className="text-[11px] text-[#68756C]">Trade Receivables (Debtors) ageing analysis | As of {fmtDate(TODAY.toISOString())}</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <KpiCard label="Total Outstanding" value={formatCurrency(totalReceivables)} color="text-[#B27A17]" />
              {AGE_BUCKETS.map((b) => (
                <KpiCard
                  key={b}
                  label={`${b} Days`}
                  value={formatCurrency(recAgeing[b])}
                  color={b === "0–30" ? "text-[#177B55]" : b === "31–60" ? "text-[#B27A17]" : "text-[#B94B4B]"}
                />
              ))}
            </div>

            {/* Collection Efficiency */}
            <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-4 flex flex-col sm:flex-row justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-[#738078] uppercase tracking-wider">Collection Efficiency</p>
                <p className={`text-2xl font-extrabold mt-1 ${collectionEfficiency >= 80 ? "text-[#177B55]" : "text-[#B27A17]"}`}>
                  {collectionEfficiency.toFixed(1)}%
                </p>
                <p className="text-[10px] text-[#9aaa9e] mt-0.5">
                  Collected {formatCurrency(paidInvoicesTotal)} of {formatCurrency(totalBilled)} billed
                </p>
              </div>
              {/* Ageing bar */}
              <div className="flex-1 max-w-xs">
                <p className="text-[10px] text-[#738078] mb-2">Ageing Distribution</p>
                <div className="flex rounded-full overflow-hidden h-3">
                  {AGE_BUCKETS.map((b) => {
                    const w = totalReceivables > 0 ? (recAgeing[b] / totalReceivables) * 100 : 0;
                    const colors: Record<AgeBucket, string> = { "0–30": "bg-emerald-400", "31–60": "bg-amber-400", "61–90": "bg-orange-400", "90+": "bg-red-500" };
                    return w > 0 ? <div key={b} className={`${colors[b]} h-full`} style={{ width: `${w}%` }} title={`${b}: ${pct(recAgeing[b], totalReceivables)}`} /> : null;
                  })}
                </div>
                <div className="flex gap-3 mt-1.5">
                  {AGE_BUCKETS.map((b) => {
                    const colors: Record<AgeBucket, string> = { "0–30": "bg-emerald-400", "31–60": "bg-amber-400", "61–90": "bg-orange-400", "90+": "bg-red-500" };
                    return <span key={b} className="flex items-center gap-1 text-[10px] text-[#68756C]"><span className={`w-2 h-2 rounded-full ${colors[b]}`} />{b}</span>;
                  })}
                </div>
              </div>
            </div>

            {/* Ageing Table */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <TableHead cols={["Customer", "Invoice No.", "Invoice Date", "Days Old", "Amount", "Bucket"]} />
                  <tbody className="divide-y divide-[#E9EEE9]">
                    {receivablesWithAge.length === 0 ? (
                      <EmptyRow cols={6} msg="No outstanding receivables. ✓" />
                    ) : receivablesWithAge.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#F9FAF8]">
                        <td className="py-3 px-3 font-bold text-[#17211B]">
                          {inv.customerNameSnapshot ?? inv.customer?.legalName ?? "Customer"}
                        </td>
                        <td className="py-3 px-3 text-[#17211B]">{inv.invoiceNumber}</td>
                        <td className="py-3 px-3 text-[#68756C]">{fmtDate(inv.invoiceDate)}</td>
                        <td className={`py-3 px-3 font-bold tabular-nums ${inv.daysOld > 90 ? "text-[#B94B4B]" : inv.daysOld > 60 ? "text-[#B27A17]" : "text-[#17211B]"}`}>
                          {inv.daysOld} days
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums font-bold text-[#B27A17]">
                          {formatCurrency(Number(inv.netAmount ?? 0))}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${AGE_COLORS[inv.bucket as AgeBucket]}`}>
                            {inv.bucket}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {receivablesWithAge.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-[#17211B] font-extrabold bg-[#F6FAF7]">
                        <td colSpan={4} className="py-3.5 px-3">Total Receivables</td>
                        <td className="py-3.5 px-3 text-right tabular-nums text-sm text-[#B27A17]">{formatCurrency(totalReceivables)}</td>
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
        {/* TAB 7: PAYABLES — Ageing Analysis */}
        {/* ================================================================= */}
        {activeTab === "payables" && (
          <div className="space-y-6 text-xs">
            <div className="border-b border-[#D9E3DC] pb-3">
              <h3 className="text-base font-bold text-[#17211B]">Accounts Payable — Vendor Ledger &amp; Ageing</h3>
              <p className="text-[11px] text-[#68756C]">Trade Payables (Creditors) ageing analysis | As of {fmtDate(TODAY.toISOString())}</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <KpiCard label="Total Payables" value={formatCurrency(totalPayables)} color="text-[#B94B4B]" />
              {AGE_BUCKETS.map((b) => (
                <KpiCard
                  key={b}
                  label={`${b} Days`}
                  value={formatCurrency(payAgeing[b])}
                  color={b === "0–30" ? "text-[#177B55]" : b === "31–60" ? "text-[#B27A17]" : "text-[#B94B4B]"}
                />
              ))}
            </div>

            {/* Statutory Payables summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-[#D9E3DC] rounded-xl p-4">
                <p className="text-[11px] font-bold text-[#738078] uppercase tracking-wider mb-2">Trade Payables (Vendors)</p>
                <p className="text-xl font-extrabold text-[#B94B4B]">{formatCurrency(totalVendorPayables)}</p>
                <p className="text-[10px] text-[#9aaa9e] mt-0.5">{vendorPayables.length} outstanding expenses</p>
              </div>
              <div className="border border-[#D9E3DC] rounded-xl p-4">
                <p className="text-[11px] font-bold text-[#738078] uppercase tracking-wider mb-2">Employee Reimbursements</p>
                <p className="text-xl font-extrabold text-[#B27A17]">{formatCurrency(totalEmployeePayables)}</p>
                <p className="text-[10px] text-[#9aaa9e] mt-0.5">{employeePayables.length} pending claims</p>
              </div>
              <div className="border border-[#D9E3DC] rounded-xl p-4">
                <p className="text-[11px] font-bold text-[#738078] uppercase tracking-wider mb-2">Statutory Payables</p>
                <p className="text-xl font-extrabold text-[#B94B4B]">{formatCurrency(netGSTPayable + tdsPayable)}</p>
                <p className="text-[10px] text-[#9aaa9e] mt-0.5">GST {formatCurrency(netGSTPayable)} + TDS {formatCurrency(tdsPayable)}</p>
              </div>
            </div>

            {/* Payables Ageing Table */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden">
              <div className="bg-[#F6FAF7] px-4 py-2.5 font-bold text-[11px] uppercase text-[#738078] tracking-wider border-b border-[#D9E3DC]">
                Vendor / Trade Payables Ledger
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <TableHead cols={["Vendor / Payee", "Expense No.", "Date", "Days Old", "Amount Due", "Bucket"]} />
                  <tbody className="divide-y divide-[#E9EEE9]">
                    {payablesWithAge.length === 0 ? (
                      <EmptyRow cols={6} msg="No outstanding payables. ✓" />
                    ) : payablesWithAge.map((exp) => (
                      <tr key={exp.id} className="hover:bg-[#F9FAF8]">
                        <td className="py-3 px-3 font-bold text-[#17211B]">
                          {exp.vendor?.name ?? exp.notes ?? "Vendor"}
                          {exp.paidBy === "EMPLOYEE" && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[9px] font-bold">EMP</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[#68756C]">{exp.expenseNumber ?? "—"}</td>
                        <td className="py-3 px-3 text-[#68756C]">{fmtDate(exp.expenseDate)}</td>
                        <td className={`py-3 px-3 font-bold tabular-nums ${exp.daysOld > 90 ? "text-[#B94B4B]" : exp.daysOld > 60 ? "text-[#B27A17]" : "text-[#17211B]"}`}>
                          {exp.daysOld} days
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums font-bold text-[#B94B4B]">
                          {formatCurrency(Number(exp.netAmount ?? 0))}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${AGE_COLORS[exp.bucket as AgeBucket]}`}>
                            {exp.bucket}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {payablesWithAge.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-[#17211B] font-extrabold bg-[#F6FAF7]">
                        <td colSpan={4} className="py-3.5 px-3">Total Trade Payables</td>
                        <td className="py-3.5 px-3 text-right tabular-nums text-sm text-[#B94B4B]">{formatCurrency(totalPayables)}</td>
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
        {/* TAB 8: FIXED ASSETS — Depreciation Schedule */}
        {/* ================================================================= */}
        {activeTab === "assets" && (
          <div className="space-y-6 text-xs">
            <div className="flex justify-between items-center border-b border-[#D9E3DC] pb-3">
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${depMethod === "WDV" ? "bg-[#1b5e4b] text-white border-[#1b5e4b]" : "border-[#D9E3DC] text-[#68756C]"}`}
                >
                  WDV (IT Act)
                </button>
                <button
                  type="button"
                  onClick={() => setDepMethod("SLM")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${depMethod === "SLM" ? "bg-[#1b5e4b] text-white border-[#1b5e4b]" : "border-[#D9E3DC] text-[#68756C]"}`}
                >
                  SLM (Cos. Act)
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Gross Block" value={formatCurrency(totalGrossBlock)} color="text-[#17211B]" />
              <KpiCard label="Accumulated Depreciation" value={formatCurrency(totalAccDep)} color="text-[#B27A17]" />
              <KpiCard label="Current Year Dep." value={formatCurrency(totalCurrentYearDep)} color="text-[#B94B4B]" />
              <KpiCard label="Net Block (WDV/NBV)" value={formatCurrency(totalNetBlock)} color="text-[#177B55]" />
            </div>

            {/* Depreciation Schedule Table */}
            <div className="border border-[#D9E3DC] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-[#D9E3DC] text-[10px] uppercase text-[#738078] font-bold tracking-wider">
                      <th className="py-3 px-3">Asset / Description</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Purchase Date</th>
                      <th className="py-3 px-3 text-right">Gross Cost</th>
                      <th className="py-3 px-3 text-right">Rate</th>
                      <th className="py-3 px-3 text-right">Acc. Dep.</th>
                      <th className="py-3 px-3 text-right">Current Year</th>
                      <th className="py-3 px-3 text-right">Net Block</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9EEE9]">
                    {depSchedule.length === 0 ? (
                      <EmptyRow cols={8} msg="No fixed assets recorded. Capitalise assets via Expenses with ASSET category type." />
                    ) : depSchedule.map((a) => (
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
                    ))}
                  </tbody>
                  {depSchedule.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-[#17211B] font-extrabold text-xs bg-[#F6FAF7]">
                        <td colSpan={3} className="py-3.5 px-3">TOTAL</td>
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

            {depMethod === "WDV" && (
              <p className="text-[10px] text-[#9aaa9e]">
                * WDV rates applied as per Income Tax Act Appendix I: Computers 40%, Vehicles 15%, Plant &amp; Machinery 15%, Furniture 10%, Buildings 10%.
              </p>
            )}
            {depMethod === "SLM" && (
              <p className="text-[10px] text-[#9aaa9e]">
                * Useful life as per Companies Act 2013, Schedule II: Computers 3 years, Vehicles 10 years, Plant &amp; Machinery 15 years, Furniture 10 years, Buildings 60 years.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
