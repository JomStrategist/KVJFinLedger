"use client";

import { useState, useMemo, useTransition } from "react";
import { formatCurrency } from "@/lib/utils/currency";
import { recordGstFilingAction, deleteGstFilingAction } from "./gst-actions";
import { recordTdsDepositAction, markExpenseTdsPaidAction, deleteTdsDepositAction } from "./tds-actions";

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
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "pnl",         label: "Profit & Loss",        icon: "📊" },
  { id: "bs",          label: "Balance Sheet",       icon: "⚖️" },
  { id: "cashflow",    label: "Cash Flow",           icon: "💵" },
  { id: "gst",         label: "GST & Tax Slabs",     icon: "📑" },
  { id: "tds",         label: "TDS (Form 26Q)",      icon: "🏛️" },
  { id: "receivables", label: "Receivables (Debtors)", icon: "📈" },
  { id: "payables",    label: "Payables (Disbursements)", icon: "💳" },
  { id: "assets",      label: "Fixed Assets Schedule", icon: "🏢" },
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
// REUSABLE UI PRIMITIVES (SCHEDULE III CORPORATE STANDARDS)
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <span className="font-extrabold text-[10px] text-[#4B5750] tracking-widest uppercase block mb-1">
      {title}
    </span>
  );
}

function LedgerRow({
  code,
  label,
  amount,
  indent = 0,
  note,
  bold = false,
  green = false,
  red = false,
  isHeader = false,
}: {
  code?: string;
  label: string;
  amount?: number | null;
  indent?: number;
  note?: string;
  bold?: boolean;
  green?: boolean;
  red?: boolean;
  isHeader?: boolean;
}) {
  const indentClass = indent === 1 ? "pl-4 sm:pl-6" : indent === 2 ? "pl-7 sm:pl-10" : "";
  const textColor = green ? "text-[#166534]" : red ? "text-[#B94B4B]" : bold ? "text-[#111827]" : "text-[#1F2937]";

  if (isHeader) {
    return (
      <div className={`py-2 px-3 bg-[#F8FAF8] border-y border-[#E2E8E4] text-xs font-black uppercase tracking-wider text-[#374151] ${indentClass}`}>
        {label}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between py-2.5 px-3 text-xs hover:bg-[#F9FAF9] transition-colors border-b border-[#EEF2EF] ${indentClass}`}>
      <div className="flex items-baseline gap-2 flex-1 pr-3 min-w-0">
        {code && <span className="font-mono text-[10px] text-[#78887D] font-bold shrink-0">{code}</span>}
        <span className={`truncate ${bold ? "font-bold text-[#111827]" : "text-[#374151] font-medium"}`}>
          {label}
        </span>
        {note && (
          <span className="text-[10px] text-[#6B7280] font-normal truncate shrink-0">
            • {note}
          </span>
        )}
      </div>
      <div className="border-b border-dotted border-[#CBD5E1] flex-1 mx-2 hidden sm:block opacity-50" />
      <div className={`tabular-nums font-mono text-right shrink-0 min-w-[120px] ${bold ? "font-black text-sm" : "font-semibold"} ${textColor}`}>
        {amount !== undefined && amount !== null ? (amount < 0 ? `(${formatCurrency(Math.abs(amount))})` : formatCurrency(amount)) : "—"}
      </div>
    </div>
  );
}

function SubtotalRow({
  label,
  amount,
  green = false,
  red = false,
  bg = "bg-[#F7F9F7]",
}: {
  label: string;
  amount: number;
  green?: boolean;
  red?: boolean;
  bg?: string;
}) {
  const textColor = green ? "text-[#166534]" : red ? "text-[#B94B4B]" : "text-[#111827]";
  return (
    <div className={`py-2.5 px-3 flex justify-between items-center text-xs font-bold border-t border-b border-[#D2DCD4] ${bg} my-1 rounded-md`}>
      <span className="uppercase tracking-wider text-[11px] font-extrabold text-[#1F2937]">{label}</span>
      <span className={`tabular-nums font-mono text-sm font-black ${textColor}`}>
        {amount < 0 ? `(${formatCurrency(Math.abs(amount))})` : formatCurrency(amount)}
      </span>
    </div>
  );
}

function GrandTotalRow({
  label,
  amount,
  highlight = "emerald",
}: {
  label: string;
  amount: number;
  highlight?: "emerald" | "slate" | "amber";
}) {
  const bg =
    highlight === "emerald"
      ? "bg-[#F0FDF4] border-t-2 border-b-4 border-double border-[#166534] text-[#166534]"
      : highlight === "amber"
      ? "bg-[#FFFBEB] border-t-2 border-b-4 border-double border-[#B45309] text-[#B45309]"
      : "bg-[#F8FAFC] border-t-2 border-b-4 border-double border-[#1E293B] text-[#0F172A]";

  return (
    <div className={`py-3.5 px-4 flex justify-between items-center text-sm font-black rounded-xl ${bg} shadow-xs my-2`}>
      <span className="tracking-wide uppercase text-xs sm:text-sm font-extrabold">{label}</span>
      <span className="tabular-nums font-mono text-base sm:text-lg font-black">
        {amount < 0 ? `(${formatCurrency(Math.abs(amount))})` : formatCurrency(amount)}
      </span>
    </div>
  );
}

function Row({ label, amount, bold, green, red, indent, note }: {
  label: string; amount: number; bold?: boolean; green?: boolean; red?: boolean; indent?: boolean; note?: string;
}) {
  return (
    <LedgerRow
      label={label}
      amount={amount}
      indent={indent ? 1 : 0}
      bold={bold}
      green={green}
      red={red}
      note={note}
    />
  );
}

function TotalRow({ label, amount, green, red }: { label: string; amount: number; green?: boolean; red?: boolean }) {
  return <SubtotalRow label={label} amount={amount} green={green} red={red} />;
}

function KpiCard({
  label,
  value,
  sub,
  color,
  badge,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  badge?: string;
  icon?: string;
}) {
  return (
    <div className="bg-white border border-[#E2E8E4] rounded-2xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all relative overflow-hidden group">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-[#5F6D64] uppercase tracking-wider block">
          {label}
        </span>
        {icon && <span className="text-base opacity-70 group-hover:scale-110 transition-transform">{icon}</span>}
      </div>
      <div className={`text-2xl font-black tracking-tight mt-1.5 tabular-nums ${color || "text-[#17211B]"}`}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-[#7A887F] font-medium mt-1 flex items-center gap-1.5">
          {sub}
        </div>
      )}
      {badge && (
        <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
          {badge}
        </span>
      )}
    </div>
  );
}

function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="bg-[#F8FAF8] border-b-2 border-[#DCE4DE] text-[10px] uppercase text-[#4B5750] font-black tracking-wider">
        {cols.map((c, i) => (
          <th key={i} className={`py-3 px-3.5 ${i > 1 ? "text-right" : "text-left"}`}>{c}</th>
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
  gstFilings = [],
  tdsDeposits = [],
}: {
  invoices?: any[];
  expenses?: any[];
  openingBalances?: any[];
  gstFilings?: any[];
  tdsDeposits?: any[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("pnl");
  const [fy, setFy] = useState("FY 2026–27");
  const [depMethod, setDepMethod] = useState<"WDV" | "SLM">("WDV");

  // GST Filing State
  const [allFilings, setAllFilings] = useState<any[]>(gstFilings);
  const [isFilingModalOpen, setIsFilingModalOpen] = useState(false);
  const [filingDate, setFilingDate] = useState(new Date().toISOString().split("T")[0]);
  const [filingArn, setFilingArn] = useState("");
  const [filingChallan, setFilingChallan] = useState("");
  const [isFilingPending, startFilingTransition] = useTransition();

  // TDS Deposit State (Form 26Q & Challan ITNS 281)
  const [allTdsDeposits, setAllTdsDeposits] = useState<any[]>(tdsDeposits);
  const [localPaidTdsExpenseIds, setLocalPaidTdsExpenseIds] = useState<Set<string>>(new Set());
  const [isTdsModalOpen, setIsTdsModalOpen] = useState(false);
  const [selectedExpenseForTds, setSelectedExpenseForTds] = useState<any | null>(null);
  const [tdsDepositDate, setTdsDepositDate] = useState(new Date().toISOString().split("T")[0]);
  const [tdsChallanNumber, setTdsChallanNumber] = useState("");
  const [tdsBsrCode, setTdsBsrCode] = useState("0510001");
  const [tdsChallanSerial, setTdsChallanSerial] = useState("00124");
  const [isTdsPending, startTdsTransition] = useTransition();

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

  // ── GST FILING STATUS & SETTLEMENT ─────────────────────────────────────────
  const currentGstFiling = useMemo(
    () => allFilings.find((f: any) => f.financialYear === fy && f.returnType === "GSTR-3B" && f.status === "FILED"),
    [allFilings, fy]
  );
  const isGstFiled = Boolean(currentGstFiling);
  const gstChallanPaid = isGstFiled ? Number(currentGstFiling?.netTaxPaid ?? netGSTPayable) : 0;
  const effectiveGSTPayable = isGstFiled ? Math.max(0, netGSTPayable - gstChallanPaid) : netGSTPayable;

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
  const totalTdsDeductedOnExpenses = useMemo(
    () => validExpenses.reduce((s, e) => s + Number(e.tdsAmount ?? 0), 0),
    [validExpenses]
  );

  const fyTdsDeposits = useMemo(
    () => allTdsDeposits.filter((d: any) => d.financialYear === fy),
    [allTdsDeposits, fy]
  );

  const isExpenseTdsPaid = (e: any) => {
    return e.tdsPaymentStatus === "PAID" || localPaidTdsExpenseIds.has(e.id) || fyTdsDeposits.some((d) => d.challanNumber === e.tdsChallanNumber);
  };

  const totalTdsDeposited = useMemo(() => {
    const challanPaid = fyTdsDeposits.reduce((s, d) => s + Number(d.amountPaid || 0), 0);
    const directPaid = validExpenses
      .filter((e) => (e.tdsPaymentStatus === "PAID" || localPaidTdsExpenseIds.has(e.id)) && !fyTdsDeposits.some((d) => d.challanNumber === e.tdsChallanNumber))
      .reduce((s, e) => s + Number(e.tdsAmount || 0), 0);
    return challanPaid + directPaid;
  }, [fyTdsDeposits, validExpenses, localPaidTdsExpenseIds]);

  const outstandingTdsPayable = Math.max(0, totalTdsDeductedOnExpenses - totalTdsDeposited);
  const tdsPaidViaBank = Math.min(totalTdsDeductedOnExpenses, totalTdsDeposited);
  const tdsPayable = outstandingTdsPayable;

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
  // Opening Bank + Inflows from Customer Receipts - Outflows for Expense Disbursements - GST Paid via Bank Challan - TDS Paid via Bank Challan
  const closingBankCashBalance = openingBankCash + actualCustomerCollections - actualExpenseDisbursements - gstChallanPaid - tdsPaidViaBank;

  // Shareholders' Funds: Capital + Reserves & Surplus (Net Profit for period)
  const reservesAndSurplus = pbt;
  const totalShareholdersEquity = openingCapital + reservesAndSurplus;

  // Total Liabilities:
  const totalCurrentLiabilities = totalVendorPayables + totalEmployeePayables + effectiveGSTPayable + outstandingTdsPayable;
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

  // ── GST FILING HANDLERS ──────────────────────────────────────────────────
  const handleMarkGstFiled = () => {
    startFilingTransition(async () => {
      const payload = {
        financialYear: fy,
        returnType: "GSTR-3B",
        period: "Annual",
        filingDate,
        arn: filingArn.trim() || `AA${fy.replace(/[^0-9]/g, "").slice(0, 4)}0${Math.floor(10000000 + Math.random() * 90000000)}`,
        challanNumber: filingChallan.trim() || `CIN/HDFC/${Date.now().toString().slice(-8)}`,
        taxableTurnover: totalRevenue,
        totalOutputGST,
        totalITC: totalInputGST,
        netTaxPaid: netGSTPayable,
        status: "FILED",
        paymentMode: "BANK",
        notes: `GSTR-3B filed for ${fy} and net tax ${formatCurrency(netGSTPayable)} settled via Bank Challan.`,
      };

      const res = await recordGstFilingAction(payload);
      if (res.success && res.data) {
        setAllFilings((prev) => {
          const filtered = prev.filter((f) => !(f.financialYear === fy && f.returnType === "GSTR-3B"));
          return [...filtered, res.data];
        });
        setIsFilingModalOpen(false);
      } else {
        alert(res.error || "Failed to mark GST as filed");
      }
    });
  };

  const handleReopenGstFiling = (id: string) => {
    if (!confirm("Are you sure you want to mark GSTR-3B as unfiled? The GST liability will be restored on the Balance Sheet.")) return;
    startFilingTransition(async () => {
      const res = await deleteGstFilingAction(id);
      if (res.success) {
        setAllFilings((prev) => prev.filter((f) => f.id !== id));
      } else {
        alert(res.error || "Failed to reopen GST filing");
      }
    });
  };

  // ── TDS DEPOSIT (CHALLAN ITNS 281) HANDLERS ──────────────────────────────
  const handleRecordTdsDeposit = () => {
    startTdsTransition(async () => {
      const amountToPay = selectedExpenseForTds ? Number(selectedExpenseForTds.tdsAmount || 0) : outstandingTdsPayable;
      const expenseIds = selectedExpenseForTds
        ? [selectedExpenseForTds.id]
        : validExpenses.filter((e) => Number(e.tdsAmount || 0) > 0 && !isExpenseTdsPaid(e)).map((e) => e.id);

      const challan = tdsChallanNumber.trim() || `ITNS281/${tdsBsrCode}/${tdsChallanSerial}`;

      const payload = {
        financialYear: fy,
        quarter: "Annual",
        section: selectedExpenseForTds?.tdsSection || "194J",
        challanNumber: challan,
        bsrCode: tdsBsrCode,
        challanSerial: tdsChallanSerial,
        depositDate: tdsDepositDate,
        amountPaid: amountToPay,
        bankAccount: "Primary Bank Account",
        notes: `TDS Challan ITNS 281 deposited for ${fy}. Paid via Bank.`,
        expenseIds,
      };

      const res = await recordTdsDepositAction(payload);
      if (res.success && res.data) {
        setAllTdsDeposits((prev) => [res.data, ...prev]);
        setLocalPaidTdsExpenseIds((prev) => {
          const next = new Set(prev);
          expenseIds.forEach((id) => next.add(id));
          return next;
        });
        setIsTdsModalOpen(false);
        setSelectedExpenseForTds(null);
      } else {
        alert(res.error || "Failed to record TDS deposit");
      }
    });
  };

  const handleOpenTdsModal = (exp?: any) => {
    setSelectedExpenseForTds(exp || null);
    const bsr = "0510001";
    const serial = String(Math.floor(10000 + Math.random() * 90000));
    setTdsBsrCode(bsr);
    setTdsChallanSerial(serial);
    setTdsChallanNumber(`ITNS281/${bsr}/${serial}`);
    setTdsDepositDate(new Date().toISOString().split("T")[0]);
    setIsTdsModalOpen(true);
  };

  const handleReopenTdsDeposit = (id: string) => {
    if (!confirm("Are you sure you want to reopen this TDS deposit? The TDS liability will be restored on the Balance Sheet.")) return;
    startTdsTransition(async () => {
      const res = await deleteTdsDepositAction(id);
      if (res.success) {
        setAllTdsDeposits((prev) => prev.filter((d) => d.id !== id));
      } else {
        alert(res.error || "Failed to reopen TDS deposit");
      }
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Top Header & Toolbar */}
      <div className="bg-white border border-[#E2E8E4] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-[#EEF2EF] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 border border-emerald-300">
                ICAI &amp; Schedule III Compliant
              </span>
              <span className="text-xs text-[#6B7280] font-medium">• Corporate ERP Financial Reporting</span>
            </div>
            <h1 className="text-2xl font-black text-[#111827] tracking-tight mt-1">
              Financial Statements &amp; Statutory Reports
            </h1>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Comprehensive double-entry general ledger statements, statutory taxation, and cash movement schedules.
            </p>
          </div>

          {/* Controls: FY Dropdown, Depreciation Method, Print */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* FY Dropdown */}
            <div className="relative">
              <select
                value={fy}
                onChange={(e) => setFy(e.target.value)}
                className="h-[38px] pl-3.5 pr-8 py-1.5 bg-white border border-[#D9E3DC] rounded-xl text-xs font-extrabold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#177B55] shadow-2xs cursor-pointer appearance-none"
              >
                {FY_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#6B7280]">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>

            <div className="flex items-center bg-[#F3F4F6] rounded-xl p-1 border border-[#E5E7EB]">
              <span className="text-[10px] font-bold text-[#6B7280] px-2">Dep:</span>
              <button
                type="button"
                onClick={() => setDepMethod("WDV")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  depMethod === "WDV" ? "bg-white text-[#166534] shadow-xs" : "text-[#6B7280]"
                }`}
                title="Written Down Value (Income Tax Act)"
              >
                WDV
              </button>
              <button
                type="button"
                onClick={() => setDepMethod("SLM")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  depMethod === "SLM" ? "bg-white text-[#166534] shadow-xs" : "text-[#6B7280]"
                }`}
                title="Straight Line Method (Companies Act Schedule II)"
              >
                SLM
              </button>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-[#D1D5DB] bg-white text-[#374151] hover:bg-[#F9FAFB] shadow-2xs cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <span>🖨️</span> Print / PDF
            </button>
          </div>
        </div>

        {/* Segmented Tab Navigation Bar */}
        <div className="overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5 min-w-max bg-[#F3F6F4] p-1.5 rounded-xl border border-[#E2E8E4]">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#177B55] text-white shadow-sm"
                      : "text-[#4B5750] hover:text-[#17211B] hover:bg-white/60"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-6 md:p-8 space-y-6">
        {/* ================================================================= */}
        {/* TAB 1: PROFIT & LOSS — Schedule III (Part II) */}
        {/* ================================================================= */}
        {activeTab === "pnl" && (
          <div className="space-y-6 text-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E2E8E4] pb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-[#111827]">Statement of Profit &amp; Loss</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
                    Schedule III • Part II
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Statement of Comprehensive Income for the financial year ended 31st March ({fy}).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#4B5750] bg-[#F8FAF8] border border-[#DCE4DE] px-3 py-1.5 rounded-xl">
                  Reporting Currency: INR (₹) • Accrual Basis
                </span>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Revenue from Operations" value={formatCurrency(totalRevenue)} color="text-[#166534]" sub={`${validInvoices.length} Invoices Billed`} icon="📈" />
              <KpiCard label="Operating Expenses" value={formatCurrency(totalOperatingExpenses)} color="text-[#B45309]" sub={`${validExpenses.length} Expense Disbursements`} icon="💳" />
              <KpiCard
                label="Profit Before Tax (PBT)"
                value={formatCurrency(pbt)}
                color={pbt >= 0 ? "text-[#166534]" : "text-[#B94B4B]"}
                sub={pbt >= 0 ? "Operating Surplus" : "Operating Deficit"}
                icon="⚖️"
              />
              <KpiCard
                label="Net Profit Margin"
                value={`${netMargin.toFixed(1)}%`}
                sub={`Gross Margin: ${grossMargin.toFixed(1)}%`}
                color={netMargin >= 0 ? "text-[#166534]" : "text-[#B94B4B]"}
                icon="📊"
              />
            </div>

            {/* Schedule III P&L Ledger Container */}
            <div className="border border-[#DCE4DE] rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-[#F8FAF8] px-4 py-3 border-b border-[#DCE4DE] flex justify-between items-center text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">
                <span>Particulars / Nature of Line Item</span>
                <span>Amount for Period (₹)</span>
              </div>

              <div className="divide-y divide-[#E2E8E4]">
                {/* I. Revenue from Operations */}
                <div className="p-3 sm:p-4 space-y-1">
                  <div className="px-2 py-1 text-xs font-black text-[#111827] uppercase tracking-wider flex justify-between items-center">
                    <span>I. REVENUE FROM OPERATIONS (NET OF STATUTORY TAXES)</span>
                    <span className="text-[10px] text-[#6B7280] font-mono font-normal">Schedule 1</span>
                  </div>
                  <div className="space-y-0.5">
                    {revenueByCategory.length === 0 ? (
                      <p className="py-2 text-[#6B7280] italic px-4">No confirmed revenue recorded for this period.</p>
                    ) : (
                      revenueByCategory.map(([cat, amt]) => (
                        <LedgerRow key={cat} label={cat} amount={amt} indent={1} />
                      ))
                    )}
                  </div>
                  <SubtotalRow label="Total Revenue from Operations (I)" amount={totalRevenue} green bg="bg-[#F0FDF4]/70" />
                </div>

                {/* II. Expenses */}
                <div className="p-3 sm:p-4 space-y-3">
                  <div className="px-2 py-1 text-xs font-black text-[#111827] uppercase tracking-wider flex justify-between items-center">
                    <span>II. EXPENSES</span>
                    <span className="text-[10px] text-[#6B7280] font-mono font-normal">Schedule 2</span>
                  </div>

                  {/* (a) Employee Benefit Expense */}
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-[#374151] px-2 flex justify-between">
                      <span>(a) Employee Benefit Expense</span>
                      <span className="font-mono tabular-nums font-bold text-[#374151]">{formatCurrency(totalEmployeeExp)}</span>
                    </div>
                    {employeeExpenses.length > 0 ? (
                      employeeExpenses.map((exp) => (
                        <LedgerRow key={exp.id} label={exp.category?.name ?? "Employee Costs"} amount={Number(exp.netAmount ?? 0)} indent={2} />
                      ))
                    ) : (
                      <div className="text-[11px] text-[#9CA3AF] italic px-6 py-1">No employee costs incurred.</div>
                    )}
                  </div>

                  {/* (b) Finance Costs */}
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-[#374151] px-2 flex justify-between">
                      <span>(b) Finance Costs &amp; Bank Charges</span>
                      <span className="font-mono tabular-nums font-bold text-[#374151]">{formatCurrency(totalFinanceExp)}</span>
                    </div>
                    {financeExpenses.length > 0 ? (
                      financeExpenses.map((exp) => (
                        <LedgerRow key={exp.id} label={exp.category?.name ?? "Finance Charge"} amount={Number(exp.netAmount ?? 0)} indent={2} />
                      ))
                    ) : (
                      <div className="text-[11px] text-[#9CA3AF] italic px-6 py-1">No finance charges or interest expense.</div>
                    )}
                  </div>

                  {/* (c) Depreciation & Amortisation */}
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-[#374151] px-2 flex justify-between items-center">
                      <span>
                        (c) Depreciation &amp; Amortisation Expense
                        <span className="text-[10px] font-normal text-[#6B7280] ml-2">({depMethod} Method)</span>
                      </span>
                      <span className="font-mono tabular-nums font-bold text-[#374151]">{formatCurrency(totalCurrentYearDep)}</span>
                    </div>
                  </div>

                  {/* (d) Other Operating Expenses */}
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-[#374151] px-2 flex justify-between">
                      <span>(d) Other Operating Expenses</span>
                      <span className="font-mono tabular-nums font-bold text-[#374151]">{formatCurrency(totalOtherOpex)}</span>
                    </div>
                    {otherOpexByCategory.length > 0 ? (
                      otherOpexByCategory.map(([cat, amt]) => (
                        <LedgerRow key={cat} label={cat} amount={amt} indent={2} />
                      ))
                    ) : (
                      <div className="text-[11px] text-[#9CA3AF] italic px-6 py-1">No other operating expenses.</div>
                    )}
                  </div>

                  <SubtotalRow label="Total Operating Expenses (II)" amount={totalOperatingExpenses} red bg="bg-[#FEF2F2]/60" />
                </div>

                {/* III. Profit Before Tax & Net Profit Transferred */}
                <div className="p-3 sm:p-4 space-y-2 bg-[#FAFBF9]">
                  <LedgerRow
                    label="III. PROFIT BEFORE EXCEPTIONAL ITEMS & TAX (I - II)"
                    amount={pbt}
                    bold
                    green={pbt >= 0}
                    red={pbt < 0}
                  />
                  <div className="flex justify-between py-2 px-3 text-xs text-[#6B7280] italic">
                    <span>IV. Tax Expense / Provisions (Advance Tax &amp; Self-Assessment)</span>
                    <span className="font-mono font-medium">₹0.00</span>
                  </div>
                  <GrandTotalRow
                    label="V. NET PROFIT TRANSFERRED TO RESERVES & SURPLUS (PAT)"
                    amount={pbt}
                    highlight={pbt >= 0 ? "emerald" : "amber"}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: BALANCE SHEET — Schedule III (Part I) — DOUBLE ENTRY PROOF */}
        {/* ================================================================= */}
        {activeTab === "bs" && (
          <div className="space-y-6 text-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E2E8E4] pb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-[#111827]">Balance Sheet (Statement of Financial Position)</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                    Schedule III • Part I
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Statement of Assets, Equity and Liabilities as at 31st March ({fy}).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black px-3.5 py-1.5 rounded-xl border flex items-center gap-2 shadow-2xs ${
                  isBalanced
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-red-50 text-red-800 border-red-300"
                }`}>
                  {isBalanced ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>✓ Balanced to the Paise (Variance: ₹0.00)</span>
                    </>
                  ) : (
                    `⚠️ Variance Detected: ${formatCurrency(Math.abs(bsDiff))}`
                  )}
                </span>
              </div>
            </div>

            {/* Symmetrical Dual Ledger Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: EQUITY & LIABILITIES */}
              <div className="border border-[#DCE4DE] rounded-2xl overflow-hidden bg-white shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="bg-[#F8FAF8] px-4 py-3 border-b border-[#DCE4DE] flex justify-between items-center text-[11px] font-black text-[#374151] uppercase tracking-wider">
                    <span>Equity &amp; Liabilities (Sources of Funds)</span>
                    <span>Amount (₹)</span>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* I. Shareholders' Funds */}
                    <div className="space-y-1">
                      <div className="px-2 py-1 text-xs font-black text-[#111827] uppercase tracking-wider">
                        I. SHAREHOLDERS&apos; FUNDS
                      </div>
                      <LedgerRow
                        label="Capital / Proprietor's Fund"
                        amount={openingCapital}
                        note="Opening Balance"
                        indent={1}
                      />
                      <LedgerRow
                        label="Reserves &amp; Surplus (P&amp;L Net Surplus)"
                        amount={reservesAndSurplus}
                        green={reservesAndSurplus >= 0}
                        red={reservesAndSurplus < 0}
                        indent={1}
                      />
                      <SubtotalRow
                        label="Total Shareholders' Funds"
                        amount={totalShareholdersEquity}
                      />
                    </div>

                    {/* II. Non-Current Liabilities */}
                    <div className="space-y-1">
                      <div className="px-2 py-1 text-xs font-black text-[#111827] uppercase tracking-wider">
                        II. NON-CURRENT LIABILITIES
                      </div>
                      {otherOpeningLiabilities.length === 0 ? (
                        <div className="text-[11px] text-[#9CA3AF] italic px-6 py-1">
                          Long-term borrowings &amp; liabilities: Nil
                        </div>
                      ) : (
                        otherOpeningLiabilities.map((ob) => (
                          <LedgerRow key={ob.id} label={ob.position} amount={Number(ob.amount || 0)} indent={1} />
                        ))
                      )}
                      {otherOpeningLiabilities.length > 0 && (
                        <SubtotalRow
                          label="Total Non-Current Liabilities"
                          amount={otherOpeningLiabilitiesTotal}
                        />
                      )}
                    </div>

                    {/* III. Current Liabilities */}
                    <div className="space-y-1">
                      <div className="px-2 py-1 text-xs font-black text-[#111827] uppercase tracking-wider">
                        III. CURRENT LIABILITIES
                      </div>
                      <LedgerRow
                        label="Trade Payables (Sundry Creditors)"
                        amount={totalVendorPayables}
                        indent={1}
                        note="Nil — Spot Settlement Policy"
                      />
                      <LedgerRow
                        label="Employee Payables (Reimbursements)"
                        amount={totalEmployeePayables}
                        indent={1}
                        note="Nil — Spot Settlement Policy"
                      />
                      <LedgerRow
                        label="Statutory GST Payable (Net of ITC)"
                        amount={effectiveGSTPayable}
                        indent={1}
                        note={
                          isGstFiled
                            ? `Nil — GSTR-3B Filed & Paid (${currentGstFiling?.arn || "Challan Paid"})`
                            : effectiveGSTPayable > 0
                            ? "Pending Return Filing"
                            : "Covered by ITC"
                        }
                        red={!isGstFiled && effectiveGSTPayable > 0}
                        green={isGstFiled}
                      />
                      <LedgerRow
                        label="TDS Payable (Statutory Withholding)"
                        amount={outstandingTdsPayable}
                        indent={1}
                        note={
                          outstandingTdsPayable === 0 && totalTdsDeductedOnExpenses > 0
                            ? "Nil — Deposited via Challan ITNS 281"
                            : outstandingTdsPayable > 0
                            ? "Form 26Q (Pending Deposit)"
                            : "Nil"
                        }
                        red={outstandingTdsPayable > 0}
                        green={outstandingTdsPayable === 0 && totalTdsDeductedOnExpenses > 0}
                      />
                      <SubtotalRow
                        label="Total Current Liabilities"
                        amount={totalCurrentLiabilities}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#FAFBF9] border-t border-[#DCE4DE]">
                  <GrandTotalRow
                    label="TOTAL EQUITY & LIABILITIES"
                    amount={totalEquityAndLiabilities}
                    highlight="slate"
                  />
                </div>
              </div>

              {/* Right Column: ASSETS */}
              <div className="border border-[#DCE4DE] rounded-2xl overflow-hidden bg-white shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="bg-[#F8FAF8] px-4 py-3 border-b border-[#DCE4DE] flex justify-between items-center text-[11px] font-black text-[#374151] uppercase tracking-wider">
                    <span>Assets (Application of Funds)</span>
                    <span>Amount (₹)</span>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* I. Non-Current Assets */}
                    <div className="space-y-1">
                      <div className="px-2 py-1 text-xs font-black text-[#111827] uppercase tracking-wider">
                        I. NON-CURRENT ASSETS
                      </div>
                      <LedgerRow
                        label="Property, Plant &amp; Equipment (Gross Block)"
                        amount={totalGrossBlock}
                        indent={1}
                      />
                      <LedgerRow
                        label={`Less: Accumulated Depreciation (${depMethod})`}
                        amount={totalAccDep > 0 ? -totalAccDep : 0}
                        red={totalAccDep > 0}
                        indent={1}
                      />
                      <SubtotalRow
                        label="Net Block (Net Book Value)"
                        amount={totalNetBlock}
                      />
                    </div>

                    {/* II. Current Assets */}
                    <div className="space-y-1">
                      <div className="px-2 py-1 text-xs font-black text-[#111827] uppercase tracking-wider">
                        II. CURRENT ASSETS
                      </div>
                      <LedgerRow
                        label="Cash &amp; Bank Balances"
                        amount={closingBankCashBalance}
                        indent={1}
                        green={closingBankCashBalance > 0}
                        note={`Opening ${formatCurrency(openingBankCash)} + Receipts ${formatCurrency(actualCustomerCollections)} - Outflows ${formatCurrency(actualExpenseDisbursements + gstChallanPaid + tdsPaidViaBank)}`}
                      />
                      <LedgerRow
                        label="Trade Receivables (Sundry Debtors)"
                        amount={totalReceivables}
                        indent={1}
                        note={receivablesWithAge.length > 0 ? `${receivablesWithAge.length} customer invoices` : "All settled"}
                      />
                      <LedgerRow
                        label="TDS Receivable (Advance Tax Asset)"
                        amount={tdsReceivable}
                        indent={1}
                        green={tdsReceivable > 0}
                        note="Deducted by customers (Form 16A/26AS)"
                      />
                      {excessITC > 0 && (
                        <LedgerRow
                          label="GST Input Tax Credit (ITC Carried Forward)"
                          amount={excessITC}
                          indent={1}
                          green
                        />
                      )}
                      {otherOpeningAssets.map((ob) => (
                        <LedgerRow key={ob.id} label={ob.position} amount={Number(ob.amount || 0)} indent={1} />
                      ))}
                      <SubtotalRow
                        label="Total Current Assets"
                        amount={totalCurrentAssets}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#FAFBF9] border-t border-[#DCE4DE]">
                  <GrandTotalRow
                    label="TOTAL ASSETS"
                    amount={totalAssets}
                    highlight="slate"
                  />
                </div>
              </div>
            </div>

            {/* Reconciliation Audit Trail Box */}
            <div className="p-4 sm:p-5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚖️</span>
                  <strong className="text-[#166534] text-sm">Double-Entry Accounting Verification (ICAI Standard)</strong>
                </div>
                <p className="text-xs text-[#14532D]">
                  Total Assets ({formatCurrency(totalAssets)}) = Total Shareholders&apos; Funds ({formatCurrency(totalShareholdersEquity)}) + Total Liabilities ({formatCurrency(totalCurrentLiabilities + otherOpeningLiabilitiesTotal)}).
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-[#86EFAC] shadow-xs">
                <span className="text-[11px] font-bold text-[#6B7280]">Variance:</span>
                <span className="font-mono text-sm font-black text-[#166534]">₹0.00</span>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: CASH FLOW — AS 3 Indirect Method */}
        {/* ================================================================= */}
        {activeTab === "cashflow" && (
          <div className="space-y-6 text-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E2E8E4] pb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-[#111827]">Statement of Cash Flows</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300">
                    AS 3 • Indirect Method
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Reconciliation of operating, investing, and financing cash flows for {fy}.
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#4B5750] bg-[#F8FAF8] border border-[#DCE4DE] px-3 py-1.5 rounded-xl">
                Amount in ₹ (INR)
              </span>
            </div>

            {/* Operating Activities */}
            <div className="border border-[#DCE4DE] rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-[#F8FAF8] px-4 py-3 border-b border-[#DCE4DE] flex justify-between items-center text-[11px] font-black text-[#374151] uppercase tracking-wider">
                <span>A. Cash Flow from Operating Activities</span>
                <span>Amount (₹)</span>
              </div>
              <div className="p-4 space-y-1">
                <LedgerRow label="Net Profit Before Tax (PBT)" amount={cfOperating_pbt} bold />
                <div className="text-[10px] font-black text-[#6B7280] uppercase tracking-wider pt-2 pb-1 px-3">
                  Adjustments for non-cash &amp; financing items:
                </div>
                <LedgerRow label="Add: Depreciation &amp; Amortisation" amount={cfOperating_dep} indent={1} />
                <LedgerRow label="Add: Finance Costs" amount={cfOperating_finance} indent={1} />
                <SubtotalRow
                  label="Operating Profit before Working Capital Changes"
                  amount={cfOperating_beforeWC}
                />

                <div className="text-[10px] font-black text-[#6B7280] uppercase tracking-wider pt-2 pb-1 px-3">
                  Changes in Working Capital:
                </div>
                <LedgerRow
                  label="(Increase) / Decrease in Trade Receivables"
                  amount={cfWC_receivables}
                  indent={1}
                  red={cfWC_receivables < 0}
                  green={cfWC_receivables > 0}
                />
                <LedgerRow
                  label="Increase / (Decrease) in Trade Payables"
                  amount={cfWC_payables}
                  indent={1}
                />
                <LedgerRow
                  label="Less: Statutory GST Liability Set-off / Outflow"
                  amount={-netGSTPayable}
                  indent={1}
                  red
                />
                <LedgerRow
                  label="Less: TDS Remittance on Vendor Expenses"
                  amount={-tdsPayable}
                  indent={1}
                  red={tdsPayable > 0}
                />

                <SubtotalRow
                  label="Net Cash from Operating Activities (A)"
                  amount={cfFromOperating}
                  green={cfFromOperating >= 0}
                  red={cfFromOperating < 0}
                  bg={cfFromOperating >= 0 ? "bg-[#F0FDF4]/70" : "bg-[#FEF2F2]/70"}
                />
              </div>
            </div>

            {/* Investing Activities */}
            <div className="border border-[#DCE4DE] rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-[#F8FAF8] px-4 py-3 border-b border-[#DCE4DE] flex justify-between items-center text-[11px] font-black text-[#374151] uppercase tracking-wider">
                <span>B. Cash Flow from Investing Activities</span>
                <span>Amount (₹)</span>
              </div>
              <div className="p-4 space-y-1">
                <LedgerRow
                  label="Purchase of Fixed Assets (Capital Expenditure)"
                  amount={totalCapex > 0 ? -totalCapex : 0}
                  red={totalCapex > 0}
                  indent={1}
                />
                <SubtotalRow
                  label="Net Cash from Investing Activities (B)"
                  amount={cfFromInvesting}
                  red={cfFromInvesting < 0}
                  bg="bg-[#F8FAF8]"
                />
              </div>
            </div>

            {/* Financing Activities */}
            <div className="border border-[#DCE4DE] rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-[#F8FAF8] px-4 py-3 border-b border-[#DCE4DE] flex justify-between items-center text-[11px] font-black text-[#374151] uppercase tracking-wider">
                <span>C. Cash Flow from Financing Activities</span>
                <span>Amount (₹)</span>
              </div>
              <div className="p-4 space-y-1">
                <LedgerRow
                  label="Capital Introduced (Opening Capital)"
                  amount={openingCapital}
                  indent={1}
                />
                <LedgerRow
                  label="Finance Costs Paid"
                  amount={totalFinanceExp > 0 ? -totalFinanceExp : 0}
                  red={totalFinanceExp > 0}
                  indent={1}
                />
                <SubtotalRow
                  label="Net Cash from Financing Activities (C)"
                  amount={cfFromFinancing}
                  green={cfFromFinancing >= 0}
                  red={cfFromFinancing < 0}
                  bg="bg-[#F8FAF8]"
                />
              </div>
            </div>

            {/* Net Movement Reconciliation */}
            <div className="border border-[#DCE4DE] rounded-2xl p-5 space-y-2 bg-[#FAFBF9] shadow-2xs">
              <div className="flex justify-between items-center text-xs font-bold text-[#111827]">
                <span>Net Cash Movement for the Period (A + B + C)</span>
                <span className={`tabular-nums font-mono text-sm font-black ${netCashMovement >= 0 ? "text-[#166534]" : "text-[#B94B4B]"}`}>
                  {netCashMovement < 0 ? `(${formatCurrency(Math.abs(netCashMovement))})` : formatCurrency(netCashMovement)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-[#6B7280]">
                <span>Add: Opening Cash &amp; Bank Equivalents</span>
                <span className="tabular-nums font-mono font-semibold">{formatCurrency(openingBankCash)}</span>
              </div>
              <GrandTotalRow
                label="CLOSING CASH & BANK BALANCE"
                amount={closingBankCashBalance}
                highlight="emerald"
              />
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: GST & TAX SLABS — DYNAMIC RATE SLAB BREAKDOWN */}
        {/* ================================================================= */}
        {activeTab === "gst" && (
          <div className="space-y-6 text-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E2E8E4] pb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-[#111827]">GST Statement &amp; Tax Slabs Analysis</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300">
                    GSTR-3B &amp; GSTR-1
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Statutory GST computation, rate-wise slabs analysis, and electronic cash ledger reconciliation for {fy}.
                </p>
              </div>
              <span className="text-[11px] font-black text-[#166534] bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl">
                Financial Year: {fy}
              </span>
            </div>

            {/* GSTR-3B Statutory Filing & Settlement Compliance Panel */}
            <div className={`border-2 rounded-2xl p-5 shadow-xs transition-all ${isGstFiled ? "bg-[#F0FDF4] border-[#86EFAC]" : "bg-[#FFFBEB] border-[#FCD34D]"}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase border ${isGstFiled ? "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]" : "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]"}`}>
                      {isGstFiled ? "✓ GSTR-3B Return Filed & Settled" : "⚠️ GSTR-3B Return Pending Filing"}
                    </span>
                    <span className="text-xs font-bold text-[#6B7280]">• {fy}</span>
                  </div>
                  <h4 className="text-base font-black text-[#111827]">
                    {isGstFiled
                      ? `Statutory Tax Discharged via Electronic Cash Ledger`
                      : `Net Output GST Liability to be Paid: ${formatCurrency(netGSTPayable)}`}
                  </h4>
                  <p className="text-xs text-[#4B5563]">
                    {isGstFiled
                      ? `Return filed on ${fmtDate(currentGstFiling?.filingDate)} | ARN: ${currentGstFiling?.arn || "N/A"} | Settled via Bank Challan.`
                      : "Output liability after Section 49(5) ITC set-off must be deposited via PMT-06 challan and filed in Form GSTR-3B."}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {isGstFiled ? (
                    <button
                      type="button"
                      onClick={() => handleReopenGstFiling(currentGstFiling.id)}
                      disabled={isFilingPending}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl border border-[#D1D5DB] bg-white text-[#B94B4B] hover:bg-red-50 hover:border-red-200 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      {isFilingPending ? "Reopening..." : "Reopen / Unfile"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setFilingArn(`AA${fy.replace(/[^0-9]/g, "").slice(0, 4)}0${Math.floor(10000000 + Math.random() * 90000000)}`);
                        setFilingChallan(`CIN/GST/${Date.now().toString().slice(-8)}`);
                        setIsFilingModalOpen(true);
                      }}
                      className="px-4 py-2.5 text-xs font-extrabold rounded-xl bg-[#177B55] text-white hover:bg-[#126344] transition-all shadow-sm cursor-pointer flex items-center gap-2"
                    >
                      <span>✓</span> Mark GSTR-3B as Filed &amp; Paid
                    </button>
                  )}
                </div>
              </div>

              {isGstFiled && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3.5 border-t border-[#BBF7D0] text-xs">
                  <div>
                    <span className="text-[#6B7280] block text-[10px] uppercase font-bold tracking-wider">Filing Date</span>
                    <span className="font-extrabold text-[#111827]">{fmtDate(currentGstFiling?.filingDate)}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block text-[10px] uppercase font-bold tracking-wider">Ack Ref / ARN</span>
                    <span className="font-mono font-bold text-[#166534]">{currentGstFiling?.arn}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block text-[10px] uppercase font-bold tracking-wider">Challan / CIN</span>
                    <span className="font-mono font-medium text-[#111827]">{currentGstFiling?.challanNumber || "Net Banking"}</span>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block text-[10px] uppercase font-bold tracking-wider">Challan Paid from Bank</span>
                    <span className="font-extrabold text-[#166534] font-mono tabular-nums">{formatCurrency(gstChallanPaid)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Output GST (Sales)" value={formatCurrency(totalOutputGST)} color="text-[#B45309]" sub={`${validInvoices.length} invoices billed`} icon="📤" />
              <KpiCard label="Input Tax Credit (ITC)" value={formatCurrency(totalInputGST)} color="text-[#166534]" sub={`${validExpenses.length} business purchases`} icon="📥" />
              <KpiCard
                label={isGstFiled ? "Net GST (Discharged)" : "Net GST Payable"}
                value={isGstFiled ? "₹0.00 (Settled)" : formatCurrency(netGSTPayable)}
                color={isGstFiled ? "text-[#166534]" : netGSTPayable > 0 ? "text-[#B94B4B]" : "text-[#166534]"}
                sub={isGstFiled ? "Discharged via Bank Challan" : netGSTPayable <= 0 ? "Credit balance carried forward" : "Payable via Electronic Cash Ledger"}
                icon="⚖️"
              />
              <KpiCard label="B2B / B2C Turnover" value={pct(b2bTaxable, totalRevenue)} sub={`B2C Share: ${pct(b2cTaxable, totalRevenue)}`} icon="📊" />
            </div>

            {/* DYNAMIC RATE SLABS BREAKDOWN */}
            <div className="border border-[#DCE4DE] rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-[#F8FAF8] px-4 py-3 font-black text-[11px] uppercase text-[#374151] tracking-wider border-b border-[#DCE4DE] flex justify-between items-center">
                <span>Rate-Wise Tax Slabs Breakdown ({fy})</span>
                <span className="text-[10px] text-[#166534] font-bold">Dynamic computation per item rate %</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <TableHead cols={["Tax Slab %", "Invoices", "Taxable Turnover", "CGST (Half)", "SGST (Half)", "IGST (Full)", "Total Tax"]} />
                  <tbody className="divide-y divide-[#EEF2EF]">
                    {dynamicTaxSlabs.length === 0 ? (
                      <EmptyRow cols={7} msg="No tax transactions recorded for this financial year." />
                    ) : (
                      dynamicTaxSlabs.map((slab) => (
                        <tr key={slab.rate} className="hover:bg-[#F9FAF9] transition-colors">
                          <td className="py-3 px-3.5 font-bold text-[#111827] flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] font-black text-[11px]">
                              {slab.rate}%
                            </span>
                            {slab.rate === 0 && <span className="text-[10px] text-[#6B7280] font-medium">(Export / Exempt)</span>}
                          </td>
                          <td className="py-3 px-3.5 text-[#6B7280] font-medium">{slab.count} inv</td>
                          <td className="py-3 px-3.5 text-right tabular-nums font-mono font-medium">{formatCurrency(slab.taxable)}</td>
                          <td className="py-3 px-3.5 text-right tabular-nums font-mono text-[#B45309]">{formatCurrency(slab.cgst)}</td>
                          <td className="py-3 px-3.5 text-right tabular-nums font-mono text-[#B45309]">{formatCurrency(slab.sgst)}</td>
                          <td className="py-3 px-3.5 text-right tabular-nums font-mono text-[#B45309]">{formatCurrency(slab.igst)}</td>
                          <td className="py-3 px-3.5 text-right tabular-nums font-mono font-black text-[#111827]">{formatCurrency(slab.totalTax)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {dynamicTaxSlabs.length > 0 && (
                    <tfoot>
                      <tr className="bg-[#F8FAF8] font-black border-t-2 border-[#111827]">
                        <td className="py-3.5 px-3.5 uppercase tracking-wider text-xs" colSpan={2}>Total Rate Slabs</td>
                        <td className="py-3.5 px-3.5 text-right tabular-nums font-mono text-[#111827]">{formatCurrency(totalRevenue)}</td>
                        <td className="py-3.5 px-3.5 text-right tabular-nums font-mono text-[#B45309]">{formatCurrency(outputCGST)}</td>
                        <td className="py-3.5 px-3.5 text-right tabular-nums font-mono text-[#B45309]">{formatCurrency(outputSGST)}</td>
                        <td className="py-3.5 px-3.5 text-right tabular-nums font-mono text-[#B45309]">{formatCurrency(outputIGST)}</td>
                        <td className="py-3.5 px-3.5 text-right tabular-nums font-mono font-black text-sm text-[#166534]">{formatCurrency(totalOutputGST)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Table 3.1: Outward Supplies (GSTR-3B) */}
            <div className="border border-[#DCE4DE] rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-[#F8FAF8] px-4 py-3 font-black text-[11px] uppercase text-[#374151] tracking-wider border-b border-[#DCE4DE]">
                GSTR-3B Table 3.1 — Details of Outward Supplies
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <TableHead cols={["Nature of Supply", "Taxable Turnover", "CGST", "SGST", "IGST", "Total GST"]} />
                  <tbody className="divide-y divide-[#EEF2EF]">
                    <tr className="hover:bg-[#F9FAF9] transition-colors">
                      <td className="py-3 px-3.5 text-[#111827] font-semibold">Intrastate Supplies (CGST + SGST)</td>
                      <td className="py-3 px-3.5 text-right tabular-nums font-mono">{formatCurrency(intrastateTaxable)}</td>
                      <td className="py-3 px-3.5 text-right tabular-nums font-mono text-[#B45309]">{formatCurrency(outputCGST)}</td>
                      <td className="py-3 px-3.5 text-right tabular-nums font-mono text-[#B45309]">{formatCurrency(outputSGST)}</td>
                      <td className="py-3 px-3.5 text-right text-[#9CA3AF]">—</td>
                      <td className="py-3 px-3.5 text-right tabular-nums font-mono font-black">{formatCurrency(outputCGST + outputSGST)}</td>
                    </tr>
                    <tr className="hover:bg-[#F9FAF9] transition-colors">
                      <td className="py-3 px-3.5 text-[#111827] font-semibold">Interstate &amp; Export Supplies (IGST)</td>
                      <td className="py-3 px-3.5 text-right tabular-nums font-mono">{formatCurrency(interstateTaxable)}</td>
                      <td className="py-3 px-3.5 text-right text-[#9CA3AF]">—</td>
                      <td className="py-3 px-3.5 text-right text-[#9CA3AF]">—</td>
                      <td className="py-3 px-3.5 text-right tabular-nums font-mono text-[#B45309]">{formatCurrency(outputIGST)}</td>
                      <td className="py-3 px-3.5 text-right tabular-nums font-mono font-black">{formatCurrency(outputIGST)}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#F8FAF8] font-black border-t-2 border-[#111827]">
                      <td className="py-3.5 px-3.5 uppercase tracking-wider text-xs">Total Outward Supplies</td>
                      <td className="py-3.5 px-3.5 text-right tabular-nums font-mono">{formatCurrency(totalRevenue)}</td>
                      <td className="py-3.5 px-3.5 text-right tabular-nums font-mono">{formatCurrency(outputCGST)}</td>
                      <td className="py-3.5 px-3.5 text-right tabular-nums font-mono">{formatCurrency(outputSGST)}</td>
                      <td className="py-3.5 px-3.5 text-right tabular-nums font-mono">{formatCurrency(outputIGST)}</td>
                      <td className="py-3.5 px-3.5 text-right tabular-nums font-mono font-black text-sm text-[#166534]">{formatCurrency(totalOutputGST)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Net Set-off Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "CGST (Central Tax)", output: outputCGST, input: inputCGST, net: netCGST },
                { label: "SGST (State Tax)", output: outputSGST, input: inputSGST, net: netSGST },
                { label: "IGST (Integrated Tax)", output: outputIGST, input: inputIGST, net: netIGST },
              ].map((g) => (
                <div key={g.label} className="border border-[#DCE4DE] rounded-2xl p-4.5 bg-white shadow-2xs">
                  <p className="font-black text-[#111827] text-xs mb-3 border-b border-[#EEF2EF] pb-2">{g.label}</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><span className="text-[#6B7280]">Output Tax</span><span className="tabular-nums font-mono font-semibold">{formatCurrency(g.output)}</span></div>
                    <div className="flex justify-between"><span className="text-[#6B7280]">Input Tax Credit (ITC)</span><span className="tabular-nums font-mono text-[#166534] font-semibold">({formatCurrency(g.input)})</span></div>
                    <div className={`flex justify-between font-black pt-2 border-t border-[#E2E8E4] ${g.net > 0 ? "text-[#B94B4B]" : "text-[#166534]"}`}>
                      <span className="uppercase text-[11px]">{g.net > 0 ? "Net Payable" : "Net Credit"}</span>
                      <span className="tabular-nums font-mono text-sm">{formatCurrency(g.net)}</span>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E2E8E4] pb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-[#111827]">TDS Statement &amp; Form 26Q Compliance</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                    Income Tax Act 1961
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Section-wise TDS analysis, Form 26Q deduction ledger, and Challan ITNS 281 deposits for {fy}.
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#4B5750] bg-[#F8FAF8] border border-[#DCE4DE] px-3 py-1.5 rounded-xl">
                Chapter XVII-B Compliance
              </span>
            </div>

            {/* TDS Challan ITNS 281 Compliance & Deposit Banner */}
            <div className={`border-2 rounded-2xl p-5 shadow-xs transition-all ${outstandingTdsPayable === 0 && totalTdsDeductedOnExpenses > 0 ? "bg-[#F0FDF4] border-[#86EFAC]" : outstandingTdsPayable > 0 ? "bg-[#FFFBEB] border-[#FCD34D]" : "bg-[#F8FAF8] border-[#DCE4DE]"}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase border ${
                      outstandingTdsPayable === 0 && totalTdsDeductedOnExpenses > 0
                        ? "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]"
                        : outstandingTdsPayable > 0
                        ? "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]"
                        : "bg-gray-100 text-gray-700 border-gray-300"
                    }`}>
                      {outstandingTdsPayable === 0 && totalTdsDeductedOnExpenses > 0
                        ? "✓ All TDS Liabilities Deposited (ITNS 281)"
                        : outstandingTdsPayable > 0
                        ? "⚠️ Form 26Q TDS Pending Deposit"
                        : "No TDS Liabilities"}
                    </span>
                    <span className="text-xs font-bold text-[#6B7280]">• {fy}</span>
                  </div>
                  <h4 className="text-base font-black text-[#111827]">
                    {outstandingTdsPayable === 0 && totalTdsDeductedOnExpenses > 0
                      ? `All Deductions Discharged via Challan ITNS 281 (Net Liability: ₹0.00)`
                      : outstandingTdsPayable > 0
                      ? `Statutory TDS Payable to Income Tax Dept: ${formatCurrency(outstandingTdsPayable)}`
                      : `Zero Outstanding TDS Liability`}
                  </h4>
                  <p className="text-xs text-[#4B5563]">
                    {outstandingTdsPayable === 0 && totalTdsDeductedOnExpenses > 0
                      ? `Total Deposited: ${formatCurrency(totalTdsDeposited)} via Bank Challan ITNS 281. Balance Sheet liability cleared to Nil.`
                      : outstandingTdsPayable > 0
                      ? "TDS deducted from vendors under Chapter XVII-B must be deposited via Challan ITNS 281 by the 7th of the following month."
                      : "No vendor payments subject to tax deduction at source in this period."}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {outstandingTdsPayable > 0 && (
                    <button
                      type="button"
                      onClick={() => handleOpenTdsModal()}
                      className="px-4 py-2.5 text-xs font-extrabold rounded-xl bg-[#177B55] text-white hover:bg-[#126344] transition-all shadow-sm cursor-pointer flex items-center gap-2"
                    >
                      <span>✓</span> Pay All Pending TDS (Challan ITNS 281)
                    </button>
                  )}
                </div>
              </div>

              {fyTdsDeposits.length > 0 && (
                <div className="mt-4 pt-3.5 border-t border-[#BBF7D0] space-y-2">
                  <span className="text-[10px] uppercase font-black tracking-wider text-[#4B5563] block">
                    Recorded ITNS 281 Bank Challan Deposits ({fyTdsDeposits.length}):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {fyTdsDeposits.map((dep: any) => (
                      <div key={dep.id} className="bg-white border border-[#BBF7D0] rounded-xl p-3 text-xs flex justify-between items-center shadow-xs">
                        <div>
                          <div className="font-mono font-bold text-[#166534] text-[11px]">{dep.challanNumber}</div>
                          <div className="text-[#6B7280] text-[10px] mt-0.5">
                            {fmtDate(dep.depositDate)} • BSR: {dep.bsrCode || "—"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black font-mono text-[#111827]">{formatCurrency(dep.amountPaid)}</div>
                          <button
                            type="button"
                            onClick={() => handleReopenTdsDeposit(dep.id)}
                            className="text-[10px] text-red-600 hover:underline font-bold cursor-pointer mt-0.5 block"
                          >
                            Reopen
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard label="TDS Receivable (Asset)" value={formatCurrency(tdsReceivable)} sub="Tax deducted by customers (Form 16A/26AS)" color="text-[#0369A1]" icon="📥" />
              <KpiCard
                label={outstandingTdsPayable === 0 && totalTdsDeductedOnExpenses > 0 ? "TDS Payable (Settled)" : "TDS Payable (Liability)"}
                value={outstandingTdsPayable === 0 && totalTdsDeductedOnExpenses > 0 ? "₹0.00 (Nil)" : formatCurrency(outstandingTdsPayable)}
                sub={outstandingTdsPayable === 0 && totalTdsDeductedOnExpenses > 0 ? "Deposited via Challan ITNS 281" : "Deducted on vendor expenses (Form 26Q)"}
                color={outstandingTdsPayable === 0 && totalTdsDeductedOnExpenses > 0 ? "text-[#166534]" : outstandingTdsPayable > 0 ? "text-[#B94B4B]" : "text-[#166534]"}
                icon="📤"
              />
              <KpiCard
                label="Net TDS Position"
                value={tdsReceivable >= outstandingTdsPayable ? `${formatCurrency(tdsReceivable - outstandingTdsPayable)} Net Credit` : `${formatCurrency(outstandingTdsPayable - tdsReceivable)} Net Payable`}
                color={tdsReceivable >= outstandingTdsPayable ? "text-[#166534]" : "text-[#B94B4B]"}
                icon="⚖️"
              />
            </div>

            {/* TDS Receivable (Deducted by Customers) */}
            <div className="border border-[#DCE4DE] rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-[#F8FAF8] px-4 py-3 font-black text-[11px] uppercase text-[#374151] tracking-wider border-b border-[#DCE4DE]">
                TDS Receivable — Deducted by Customers at Source (Form 16A/26AS)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[650px]">
                  <TableHead cols={["Customer", "Invoice No.", "Invoice Date", "Invoice Gross", "TDS Deducted", "Net Receipt"]} />
                  <tbody className="divide-y divide-[#EEF2EF]">
                    {tdsReceivableEntries.length === 0 ? (
                      <EmptyRow cols={6} msg="No TDS deductions recorded on customer invoices." />
                    ) : (
                      tdsReceivableEntries.map((inv: any) => {
                        const payments = inv.payments || [];
                        const pTds = payments.reduce((s: number, p: any) => s + Number(p.tdsAmount || 0), 0);
                        const effectiveTds = pTds > 0 ? pTds : Number(inv.tdsAmount || 0);
                        const bankReceipt = payments.reduce((s: number, p: any) => s + Number(p.bankReceipt || p.paymentAmount || 0), 0);
                        return (
                          <tr key={inv.id} className="hover:bg-[#F9FAF9] transition-colors">
                            <td className="py-3 px-3.5 font-bold text-[#111827]">{inv.customerNameSnapshot || inv.customer?.legalName || "Customer"}</td>
                            <td className="py-3 px-3.5 text-[#111827] font-medium font-mono">{inv.invoiceNumber}</td>
                            <td className="py-3 px-3.5 text-[#6B7280]">{fmtDate(inv.invoiceDate || inv.createdAt)}</td>
                            <td className="py-3 px-3.5 text-right tabular-nums font-mono">{formatCurrency(Number(inv.grossAmount || inv.netAmount || 0))}</td>
                            <td className="py-3 px-3.5 text-right tabular-nums font-mono font-bold text-[#0369A1]">{formatCurrency(effectiveTds)}</td>
                            <td className="py-3 px-3.5 text-right tabular-nums font-mono font-semibold text-[#166534]">{formatCurrency(bankReceipt)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {tdsReceivableEntries.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-[#111827] font-black bg-[#F8FAF8]">
                        <td colSpan={4} className="py-3.5 px-3.5 uppercase tracking-wider text-xs">Total TDS Receivable (Advance Tax Asset)</td>
                        <td className="py-3.5 px-3.5 text-right tabular-nums font-mono text-sm text-[#0369A1]">{formatCurrency(tdsReceivable)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* TDS Payable (Section-wise Form 26Q) */}
            <div className="border border-[#DCE4DE] rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-[#F8FAF8] px-4 py-3 font-black text-[11px] uppercase text-[#374151] tracking-wider border-b border-[#DCE4DE]">
                TDS Payable — Vendor Deductions by Section (Form 26Q)
              </div>
              {tdsPayableBySection.length === 0 ? (
                <div className="p-8 text-center text-[#6B7280] italic">No TDS deducted on vendor payments for this FY.</div>
              ) : (
                tdsPayableBySection.map(([section, data]) => (
                  <div key={section} className="border-b border-[#EEF2EF] last:border-0">
                    <div className="bg-[#FAFBF9] px-4 py-2.5 font-black text-xs text-[#111827] flex justify-between border-b border-[#EEF2EF]">
                      <span>Section {section}</span>
                      <span className="font-mono text-[#B45309]">{formatCurrency(data.total)}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[700px]">
                        <TableHead cols={["Payee / Vendor", "PAN", "Expense No.", "Gross Amount", "TDS Deducted", "Deposit Status", "Action"]} />
                        <tbody className="divide-y divide-[#EEF2EF]">
                          {data.entries.map((exp: any) => {
                            const isPaid = isExpenseTdsPaid(exp);
                            return (
                              <tr key={exp.id} className="hover:bg-[#F9FAF9] transition-colors">
                                <td className="py-3 px-3.5 font-bold text-[#111827]">{exp.vendor?.name || exp.notes || "Vendor"}</td>
                                <td className="py-3 px-3.5 font-mono text-[#6B7280] text-[11px]">{exp.vendor?.pan || "—"}</td>
                                <td className="py-3 px-3.5 text-[#6B7280] font-mono text-[11px]">{exp.expenseNumber || "—"}</td>
                                <td className="py-3 px-3.5 text-right tabular-nums font-mono">{formatCurrency(Number(exp.grossAmount || exp.netAmount || 0))}</td>
                                <td className="py-3 px-3.5 text-right tabular-nums font-mono font-bold text-[#B45309]">{formatCurrency(Number(exp.tdsAmount || 0))}</td>
                                <td className="py-3 px-3.5">
                                  {isPaid ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]">
                                      <span>✓</span> PAID (ITNS 281)
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
                                      <span>⚠️</span> PENDING
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3.5 text-right">
                                  {isPaid ? (
                                    <span className="text-[10px] text-[#6B7280] font-mono font-medium">
                                      {exp.tdsChallanNumber || "Settled"}
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenTdsModal(exp)}
                                      className="px-3 py-1 text-[11px] font-bold rounded-lg bg-[#177B55] text-white hover:bg-[#126344] transition-all shadow-2xs cursor-pointer"
                                    >
                                      Pay TDS
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quarterly Summary */}
            <div className="border border-[#DCE4DE] rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-[#F8FAF8] px-4 py-3 font-black text-[11px] uppercase text-[#374151] tracking-wider border-b border-[#DCE4DE]">
                Quarterly TDS Schedule ({fy})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[450px]">
                  <TableHead cols={["Quarter", "TDS Deducted by Customers", "TDS Deducted on Vendors", "Net Statutory Balance"]} />
                  <tbody className="divide-y divide-[#EEF2EF]">
                    {quarterlyTDS.map((q) => (
                      <tr key={q.id} className="hover:bg-[#F9FAF9] transition-colors">
                        <td className="py-3 px-3.5 font-bold text-[#111827]">{q.label}</td>
                        <td className="py-3 px-3.5 text-right tabular-nums font-mono text-[#0369A1]">{formatCurrency(q.receivable)}</td>
                        <td className="py-3 px-3.5 text-right tabular-nums font-mono text-[#B45309]">{formatCurrency(q.payable)}</td>
                        <td className={`py-3 px-3.5 text-right tabular-nums font-mono font-bold ${q.receivable >= q.payable ? "text-[#166534]" : "text-[#B94B4B]"}`}>
                          {formatCurrency(q.receivable - q.payable)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#111827] font-black bg-[#F8FAF8]">
                      <td className="py-3.5 px-3.5 uppercase tracking-wider text-xs">Full Year Total</td>
                      <td className="py-3.5 px-3.5 text-right tabular-nums font-mono text-[#0369A1]">{formatCurrency(tdsReceivable)}</td>
                      <td className="py-3.5 px-3.5 text-right tabular-nums font-mono text-[#B45309]">{formatCurrency(tdsPayable)}</td>
                      <td className={`py-3.5 px-3.5 text-right tabular-nums font-mono text-sm ${tdsReceivable >= tdsPayable ? "text-[#166534]" : "text-[#B94B4B]"}`}>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E2E8E4] pb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-[#111827]">Accounts Receivable (Debtors Ledger &amp; Ageing)</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300">
                    Ageing Analysis
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Ageing buckets computed strictly from invoice due dates | As of {fmtDate(TODAY)}.
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#4B5750] bg-[#F8FAF8] border border-[#DCE4DE] px-3 py-1.5 rounded-xl">
                Current Assets Schedule
              </span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <KpiCard label="Total Debtors" value={formatCurrency(totalReceivables)} color="text-[#B45309]" sub={`${receivablesWithAge.length} outstanding`} icon="👥" />
              {AGE_BUCKETS.map((b) => (
                <KpiCard
                  key={b}
                  label={`${b} Days`}
                  value={formatCurrency(recAgeing[b])}
                  color={b === "0–30" ? "text-[#166534]" : b === "31–60" ? "text-[#B45309]" : "text-[#B94B4B]"}
                />
              ))}
            </div>

            {/* Collection Efficiency Banner */}
            <div className="bg-[#FAFBF9] border border-[#DCE4DE] rounded-2xl p-5 flex flex-col sm:flex-row justify-between gap-6 shadow-2xs">
              <div>
                <p className="text-[11px] font-black text-[#4B5563] uppercase tracking-wider">Collection Efficiency Ratio</p>
                <p className={`text-3xl font-black mt-1 ${collectionEfficiency >= 75 ? "text-[#166534]" : "text-[#B45309]"}`}>
                  {collectionEfficiency.toFixed(1)}%
                </p>
                <p className="text-xs text-[#6B7280] mt-1 font-medium">
                  Collected {formatCurrency(actualCustomerCollections)} of {formatCurrency(totalBilled)} total billing
                </p>
              </div>
              <div className="flex-1 max-w-md">
                <p className="text-[11px] font-black text-[#4B5563] uppercase tracking-wider mb-2">Ageing Distribution</p>
                <div className="flex rounded-full overflow-hidden h-3.5 bg-[#E5EAE6] p-0.5">
                  {AGE_BUCKETS.map((b) => {
                    const w = totalReceivables > 0 ? (recAgeing[b] / totalReceivables) * 100 : 0;
                    const colors: Record<AgeBucket, string> = { "0–30": "bg-emerald-500", "31–60": "bg-amber-400", "61–90": "bg-orange-400", "90+": "bg-red-500" };
                    return w > 0 ? <div key={b} className={`${colors[b]} h-full rounded-full`} style={{ width: `${w}%` }} title={`${b} days: ${formatCurrency(recAgeing[b])}`} /> : null;
                  })}
                </div>
                <div className="flex justify-between gap-2 mt-2.5">
                  {AGE_BUCKETS.map((b) => {
                    const colors: Record<AgeBucket, string> = { "0–30": "bg-emerald-500", "31–60": "bg-amber-400", "61–90": "bg-orange-400", "90+": "bg-red-500" };
                    return (
                      <span key={b} className="flex items-center gap-1.5 text-xs text-[#4B5563] font-medium">
                        <span className={`w-2.5 h-2.5 rounded-full ${colors[b]}`} />
                        {b}d
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Receivables Table */}
            <div className="border border-[#DCE4DE] rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <TableHead cols={["Customer", "Invoice No.", "Invoice Date", "Age (Days)", "Outstanding Amount", "Age Bracket"]} />
                  <tbody className="divide-y divide-[#EEF2EF]">
                    {receivablesWithAge.length === 0 ? (
                      <EmptyRow cols={6} msg="No outstanding trade receivables for this financial year." />
                    ) : (
                      receivablesWithAge.map((inv) => (
                        <tr key={inv.id} className="hover:bg-[#F9FAF9] transition-colors">
                          <td className="py-3 px-3.5 font-bold text-[#111827]">{inv.customerNameSnapshot || inv.customer?.legalName || "Customer"}</td>
                          <td className="py-3 px-3.5 text-[#111827] font-mono font-medium">{inv.invoiceNumber}</td>
                          <td className="py-3 px-3.5 text-[#6B7280]">{fmtDate(inv.invoiceDate || inv.createdAt)}</td>
                          <td className={`py-3 px-3.5 font-bold tabular-nums ${inv.daysOld > 90 ? "text-[#B94B4B]" : inv.daysOld > 60 ? "text-[#B45309]" : "text-[#111827]"}`}>
                            {inv.daysOld} days
                          </td>
                          <td className="py-3 px-3.5 text-right tabular-nums font-mono font-bold text-[#B45309]">
                            {formatCurrency(inv.outstanding)}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${AGE_COLORS[inv.bucket as AgeBucket]}`}>
                              {inv.bucket}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {receivablesWithAge.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-[#111827] font-black bg-[#F8FAF8]">
                        <td colSpan={4} className="py-3.5 px-3.5 uppercase tracking-wider text-xs">Total Sundry Debtors (Current Asset)</td>
                        <td className="py-3.5 px-3.5 text-right tabular-nums font-mono text-sm font-black text-[#B45309]">{formatCurrency(totalReceivables)}</td>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E2E8E4] pb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-[#111827]">Accounts Payable &amp; Expense Settlements</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300">
                    Spot Settlement
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Spot payment accounting: All business expenses disbursed on time via Bank. Zero trade payables carried on balance sheet.
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#4B5750] bg-[#F8FAF8] border border-[#DCE4DE] px-3 py-1.5 rounded-xl">
                Current Liabilities Schedule
              </span>
            </div>

            {/* Policy Banner */}
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xs">
              <div>
                <span className="text-[10px] font-black text-[#166534] uppercase tracking-widest block">
                  CASH / SPOT PAYMENT POLICY
                </span>
                <p className="font-black text-sm text-[#111827] mt-0.5">
                  100% On-Time Payment Settlement via Bank
                </p>
                <p className="text-[#4B5563] text-xs mt-0.5">
                  Every business purchase is disbursed on time directly from the corporate bank account upon purchase.
                </p>
              </div>
              <div className="shrink-0 px-4 py-2 rounded-xl bg-white text-[#166534] border border-[#86EFAC] font-black text-xs shadow-xs">
                ✓ Zero Overdue Payables
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard
                label="Trade Payables (Creditors)"
                value="₹0.00"
                color="text-[#166534]"
                sub="Nil — Paid on time upon purchase"
                icon="💳"
              />
              <KpiCard
                label="Total Expenses Settled via Bank"
                value={formatCurrency(actualExpenseDisbursements)}
                color="text-[#111827]"
                sub={`${expenseDisbursementsList.length} expenses disbursed from bank`}
                icon="🏦"
              />
              <KpiCard
                label="Statutory Tax Payables"
                value={formatCurrency(netGSTPayable + tdsPayable)}
                color="text-[#B45309]"
                sub={`GST: ${formatCurrency(netGSTPayable)} | TDS: ${formatCurrency(tdsPayable)}`}
                icon="⚖️"
              />
            </div>

            {/* Settled Disbursements Table */}
            <div className="border border-[#DCE4DE] rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="bg-[#F8FAF8] px-4 py-3 font-black text-[11px] uppercase text-[#374151] tracking-wider border-b border-[#DCE4DE] flex justify-between items-center">
                <span>Disbursements Ledger — Deducted from Bank ({fy})</span>
                <span className="text-[10px] text-[#166534] font-bold lowercase">paid on time upon purchase</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <TableHead cols={["Vendor / Payee", "Expense No.", "Purchase Date", "Category", "Amount Deducted from Bank", "Status"]} />
                  <tbody className="divide-y divide-[#EEF2EF]">
                    {expenseDisbursementsList.length === 0 ? (
                      <EmptyRow cols={6} msg="No expense purchases recorded for this financial year." />
                    ) : (
                      expenseDisbursementsList.map((exp) => (
                        <tr key={exp.id} className="hover:bg-[#F9FAF9] transition-colors">
                          <td className="py-3 px-3.5 font-bold text-[#111827]">
                            {exp.vendor?.name || exp.notes || "Vendor"}
                            {exp.paidBy === "EMPLOYEE" && (
                              <span className="ml-1.5 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[9px] font-bold border border-purple-200">EMP</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-[#6B7280] font-mono text-[11px]">{exp.expenseNumber || "—"}</td>
                          <td className="py-3 px-3.5 text-[#6B7280]">{fmtDate(exp.expenseDate || exp.createdAt)}</td>
                          <td className="py-3 px-3.5 text-[#111827] font-semibold">{exp.category?.name || "Operating Expense"}</td>
                          <td className="py-3 px-3.5 text-right tabular-nums font-mono font-bold text-[#111827]">
                            {formatCurrency(exp.amountPaid)}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]">
                              ✓ PAID VIA BANK
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {expenseDisbursementsList.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-[#111827] font-black bg-[#F8FAF8]">
                        <td colSpan={4} className="py-3.5 px-3.5 uppercase tracking-wider text-xs">Total Expense Outflows Deducted from Bank</td>
                        <td className="py-3.5 px-3.5 text-right tabular-nums font-mono text-sm font-black text-[#111827]">{formatCurrency(actualExpenseDisbursements)}</td>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E2E8E4] pb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-[#111827]">Fixed Asset Schedule</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                    Companies Act Schedule II &amp; IT Act
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Depreciation computed using{" "}
                  <strong>{depMethod === "WDV" ? "Written Down Value (WDV) — Income Tax Act" : "Straight Line Method (SLM) — Companies Act Schedule II"}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDepMethod("WDV")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${depMethod === "WDV" ? "bg-[#177B55] text-white border-[#177B55] shadow-xs" : "border-[#D1D5DB] text-[#4B5563] bg-white hover:bg-[#F9FAFB]"}`}
                >
                  WDV (IT Act)
                </button>
                <button
                  type="button"
                  onClick={() => setDepMethod("SLM")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${depMethod === "SLM" ? "bg-[#177B55] text-white border-[#177B55] shadow-xs" : "border-[#D1D5DB] text-[#4B5563] bg-white hover:bg-[#F9FAFB]"}`}
                >
                  SLM (Cos. Act)
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Gross Block (Original Cost)" value={formatCurrency(totalGrossBlock)} color="text-[#111827]" icon="🏢" />
              <KpiCard label="Accumulated Depreciation" value={formatCurrency(totalAccDep)} color="text-[#B45309]" icon="📉" />
              <KpiCard label="Current Year Depreciation" value={formatCurrency(totalCurrentYearDep)} color="text-[#B94B4B]" icon="⏳" />
              <KpiCard label="Net Book Value (Net Block)" value={formatCurrency(totalNetBlock)} color="text-[#166534]" icon="✨" />
            </div>

            {/* Asset Schedule Table */}
            <div className="border border-[#DCE4DE] rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <TableHead cols={["Asset Description", "Category", "Acquisition Date", "Gross Block", "Dep. Rate", "Accumulated Dep.", "Current FY Dep.", "Net Block"]} />
                  <tbody className="divide-y divide-[#EEF2EF]">
                    {depSchedule.length === 0 ? (
                      <EmptyRow cols={8} msg="No fixed assets recorded for this period. Capitalise capital items through Expenses categorized as ASSET." />
                    ) : (
                      depSchedule.map((a) => (
                        <tr key={a.id} className="hover:bg-[#F9FAF9] transition-colors">
                          <td className="py-3 px-3.5 font-bold text-[#111827]">{a.name}</td>
                          <td className="py-3 px-3.5 text-[#6B7280]">{a.category}</td>
                          <td className="py-3 px-3.5 text-[#6B7280]">{fmtDate(a.purchaseDate)}</td>
                          <td className="py-3 px-3.5 text-right tabular-nums font-mono font-medium">{formatCurrency(a.grossCost)}</td>
                          <td className="py-3 px-3.5 text-right font-mono text-[#6B7280] font-semibold">{a.ratePct}</td>
                          <td className="py-3 px-3.5 text-right tabular-nums font-mono text-[#B45309]">({formatCurrency(a.accDep)})</td>
                          <td className="py-3 px-3.5 text-right tabular-nums font-mono text-[#B94B4B] font-bold">({formatCurrency(a.currentYearDep)})</td>
                          <td className="py-3 px-3.5 text-right tabular-nums font-mono font-black text-[#111827]">{formatCurrency(a.closingWdv)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {depSchedule.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-[#111827] font-black text-xs bg-[#F8FAF8]">
                        <td colSpan={3} className="py-3.5 px-3.5 uppercase tracking-wider">Total Fixed Assets (Non-Current Assets)</td>
                        <td className="py-3.5 px-3.5 text-right tabular-nums font-mono">{formatCurrency(totalGrossBlock)}</td>
                        <td />
                        <td className="py-3.5 px-3.5 text-right tabular-nums font-mono text-[#B45309]">({formatCurrency(totalAccDep)})</td>
                        <td className="py-3.5 px-3.5 text-right tabular-nums font-mono text-[#B94B4B]">({formatCurrency(totalCurrentYearDep)})</td>
                        <td className="py-3.5 px-3.5 text-right tabular-nums font-mono text-[#166534]">{formatCurrency(totalNetBlock)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* GSTR-3B Filing Modal */}
      {isFilingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#D9E3DC] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start border-b border-[#D9E3DC] pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#177B55] uppercase tracking-widest block">
                  STATUTORY COMPLIANCE • FORM GSTR-3B
                </span>
                <h3 className="text-lg font-black text-[#17211B] mt-0.5">Mark GST Return as Filed &amp; Paid</h3>
                <p className="text-xs text-[#68756C] mt-0.5">
                  Record official filing acknowledgment and disburse net tax payment from Bank.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFilingModalOpen(false)}
                className="text-[#68756C] hover:text-[#17211B] text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-3.5 space-y-1.5">
                <div className="flex justify-between text-[#68756C]">
                  <span>Financial Year:</span>
                  <span className="font-bold text-[#17211B]">{fy}</span>
                </div>
                <div className="flex justify-between text-[#68756C]">
                  <span>Total Output GST:</span>
                  <span className="font-bold text-[#17211B]">{formatCurrency(totalOutputGST)}</span>
                </div>
                <div className="flex justify-between text-[#68756C]">
                  <span>Input Tax Credit (ITC Set-off):</span>
                  <span className="font-bold text-[#177B55]">({formatCurrency(totalInputGST)})</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold pt-2 border-t border-[#D9E3DC]">
                  <span className="text-[#17211B]">Net Tax to Pay from Bank:</span>
                  <span className="text-[#177B55] tabular-nums">{formatCurrency(netGSTPayable)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211B] mb-1">
                  Filing Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={filingDate}
                  onChange={(e) => setFilingDate(e.target.value)}
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211B] mb-1">
                  ARN (Application Reference Number) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={filingArn}
                  onChange={(e) => setFilingArn(e.target.value)}
                  placeholder="e.g. AA3204260012345"
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs font-mono bg-white text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17211B] mb-1">
                  Challan / Payment Reference (CIN / CPIN)
                </label>
                <input
                  type="text"
                  value={filingChallan}
                  onChange={(e) => setFilingChallan(e.target.value)}
                  placeholder="e.g. CIN/HDFC/2026/001"
                  className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs font-mono bg-white text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span>ℹ️</span> Double-Entry Statutory Impact:
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                  <li>Statutory GST Payable on the Balance Sheet will be cleared to <strong>₹0.00</strong>.</li>
                  <li><strong>{formatCurrency(netGSTPayable)}</strong> will be deducted from Cash &amp; Bank balance as GST challan disbursement.</li>
                  <li>The Balance Sheet will remain 100% in equilibrium (₹0.00 variance).</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#D9E3DC]">
              <button
                type="button"
                onClick={() => setIsFilingModalOpen(false)}
                disabled={isFilingPending}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#D9E3DC] text-[#68756C] hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkGstFiled}
                disabled={isFilingPending}
                className="px-5 py-2 text-xs font-extrabold rounded-xl bg-[#177B55] text-white hover:bg-[#126344] transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isFilingPending ? "Recording Filing..." : "✓ Confirm Filing & Pay from Bank"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* TDS Challan ITNS 281 Payment Modal */}
      {isTdsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#D9E3DC] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start border-b border-[#D9E3DC] pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#177B55] uppercase tracking-widest block">
                  INCOME TAX DEPT • CHALLAN ITNS 281
                </span>
                <h3 className="text-lg font-black text-[#17211B] mt-0.5">Deposit TDS &amp; Settle Statutory Liability</h3>
                <p className="text-xs text-[#68756C] mt-0.5">
                  Record official bank challan payment for vendor tax deducted at source under Chapter XVII-B.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsTdsModalOpen(false);
                  setSelectedExpenseForTds(null);
                }}
                className="text-[#68756C] hover:text-[#17211B] text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="bg-[#F6FAF7] border border-[#D9E3DC] rounded-xl p-3.5 space-y-1.5">
                <div className="flex justify-between text-[#68756C]">
                  <span>Scope of Deposit:</span>
                  <span className="font-bold text-[#17211B]">
                    {selectedExpenseForTds
                      ? `Expense: ${selectedExpenseForTds.expenseNumber || "Selected"} (${selectedExpenseForTds.vendor?.name || "Vendor"})`
                      : `All Pending Form 26Q TDS Deductions (${fy})`}
                  </span>
                </div>
                <div className="flex justify-between text-[#68756C]">
                  <span>Statutory Section:</span>
                  <span className="font-bold text-[#17211B]">
                    {selectedExpenseForTds?.tdsSection || "194J / 194C (Vendor TDS)"}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold pt-2 border-t border-[#D9E3DC]">
                  <span className="text-[#17211B]">Amount to Disburse from Bank:</span>
                  <span className="text-[#177B55] tabular-nums">
                    {formatCurrency(selectedExpenseForTds ? Number(selectedExpenseForTds.tdsAmount || 0) : outstandingTdsPayable)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17211B] mb-1">
                    Deposit Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={tdsDepositDate}
                    onChange={(e) => setTdsDepositDate(e.target.value)}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs bg-white text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#17211B] mb-1">
                    7-Digit BSR Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={7}
                    value={tdsBsrCode}
                    onChange={(e) => setTdsBsrCode(e.target.value)}
                    placeholder="e.g. 0510001"
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs font-mono bg-white text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17211B] mb-1">
                    5-Digit Challan Serial No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={tdsChallanSerial}
                    onChange={(e) => setTdsChallanSerial(e.target.value)}
                    placeholder="e.g. 00124"
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs font-mono bg-white text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#17211B] mb-1">
                    Challan / CIN Reference
                  </label>
                  <input
                    type="text"
                    value={tdsChallanNumber}
                    onChange={(e) => setTdsChallanNumber(e.target.value)}
                    placeholder={`ITNS281/${tdsBsrCode}/${tdsChallanSerial}`}
                    className="w-full h-[38px] border border-[#D9E3DC] rounded-xl px-3 text-xs font-mono bg-white text-[#17211B] focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                  />
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span>ℹ️</span> Double-Entry Statutory Impact:
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                  <li>Statutory <strong>TDS Payable</strong> liability on the Balance Sheet will decrease to <strong>₹0.00</strong>.</li>
                  <li><strong>{formatCurrency(selectedExpenseForTds ? Number(selectedExpenseForTds.tdsAmount || 0) : outstandingTdsPayable)}</strong> will be deducted from Cash &amp; Bank balance as Challan ITNS 281 disbursement.</li>
                  <li>The Balance Sheet will remain 100% in equilibrium (₹0.00 variance).</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#D9E3DC]">
              <button
                type="button"
                onClick={() => {
                  setIsTdsModalOpen(false);
                  setSelectedExpenseForTds(null);
                }}
                disabled={isTdsPending}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[#D9E3DC] text-[#68756C] hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordTdsDeposit}
                disabled={isTdsPending}
                className="px-5 py-2 text-xs font-extrabold rounded-xl bg-[#177B55] text-white hover:bg-[#126344] transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isTdsPending ? "Recording Deposit..." : "✓ Confirm Deposit & Pay from Bank"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
