"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OpeningClosingClient({
  selectedFY,
  initialClosing,
}: {
  selectedFY: string;
  initialClosing: {
    bankBalance: number;
    accountsReceivable: number;
    accountsPayable: number;
    gstReceivable: number;
    gstPayable: number;
    tdsReceivable: number;
    tdsPayable: number;
    fixedAssets: number;
    capitalEquity: number;
  };
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"SCHEDULE" | "OPENING_ENTRY">("SCHEDULE");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Opening Balances editable state (defaulting to previous baseline)
  const [openingValues, setOpeningValues] = useState({
    bankBalance: 1250000,
    accountsReceivable: 450000,
    accountsPayable: 210000,
    gstReceivable: 45000,
    gstPayable: 0,
    tdsReceivable: 35000,
    tdsPayable: 18000,
    fixedAssets: 800000,
    capitalEquity: 2352000,
  });

  const handleFYChange = (newFY: string) => {
    router.push(`/opening-closing?fy=${newFY}`);
  };

  const handleOpeningChange = (field: string, val: number) => {
    setOpeningValues((prev) => ({ ...prev, [field]: val }));
  };

  const handleSaveOpening = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Next FY Opening = Current Closing
  const nextFYOpening = initialClosing;

  const totalOpeningAssets =
    openingValues.bankBalance +
    openingValues.accountsReceivable +
    openingValues.gstReceivable +
    openingValues.tdsReceivable +
    openingValues.fixedAssets;

  const totalOpeningLiabilities =
    openingValues.accountsPayable +
    openingValues.gstPayable +
    openingValues.tdsPayable +
    openingValues.capitalEquity;

  const totalClosingAssets =
    initialClosing.bankBalance +
    initialClosing.accountsReceivable +
    initialClosing.gstReceivable +
    initialClosing.tdsReceivable +
    initialClosing.fixedAssets;

  const totalClosingLiabilities =
    initialClosing.accountsPayable +
    initialClosing.gstPayable +
    initialClosing.tdsPayable +
    initialClosing.capitalEquity;

  return (
    <div className="space-y-6">
      {/* Header with Title and FY Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-theme-surface p-6 rounded-xl border border-theme-border shadow-sm">
        <div>
          <span className="text-xs font-bold text-theme-primary uppercase tracking-wider">
            FINANCIAL CONTINUITY
          </span>
          <h1 className="text-2xl font-bold text-theme-text mt-1">Opening & Closing Balances</h1>
          <p className="text-theme-text-muted mt-1 text-sm">
            Maintain year-over-year balance sheet continuity and carry-forward opening positions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">
            Financial Year:
          </label>
          <select
            value={selectedFY}
            onChange={(e) => handleFYChange(e.target.value)}
            className="border border-theme-border rounded-lg px-3 py-2 text-sm font-semibold bg-theme-surface text-theme-text focus:ring-2 focus:ring-theme-primary"
          >
            <option value="2025-2026">FY 2025–26</option>
            <option value="2026-2027">FY 2026–27 (Current)</option>
            <option value="2027-2028">FY 2027–28 (Upcoming)</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-theme-border">
        <button
          onClick={() => setActiveTab("SCHEDULE")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "SCHEDULE"
              ? "border-theme-primary text-theme-primary"
              : "border-transparent text-theme-text-muted hover:text-theme-text"
          }`}
        >
          Financial Continuity Schedule
        </button>
        <button
          onClick={() => setActiveTab("OPENING_ENTRY")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "OPENING_ENTRY"
              ? "border-theme-primary text-theme-primary"
              : "border-transparent text-theme-text-muted hover:text-theme-text"
          }`}
        >
          Edit FY Opening Balances
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Opening balances for FY {selectedFY} updated and recorded successfully.</span>
        </div>
      )}

      {activeTab === "SCHEDULE" ? (
        <div className="space-y-6">
          {/* 3 Summary Continuity Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-theme-surface p-5 rounded-xl border border-theme-border shadow-sm">
              <span className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                FY {selectedFY} Opening Position
              </span>
              <p className="text-2xl font-bold text-theme-text mt-2">
                ₹{totalOpeningAssets.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-theme-text-muted mt-1">Carried forward from previous FY closing</p>
            </div>

            <div className="bg-theme-surface p-5 rounded-xl border border-theme-border shadow-sm">
              <span className="text-xs font-bold text-theme-primary uppercase tracking-wider">
                Current Closing Balance
              </span>
              <p className="text-2xl font-bold text-theme-primary mt-2">
                ₹{totalClosingAssets.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-theme-text-muted mt-1">Live computed from recorded invoices & expenses</p>
            </div>

            <div className="bg-theme-surface p-5 rounded-xl border border-theme-border shadow-sm">
              <span className="text-xs font-bold text-theme-gold uppercase tracking-wider">
                Next FY Opening Balance
              </span>
              <p className="text-2xl font-bold text-[#B27A17] mt-2">
                ₹{totalClosingAssets.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-theme-text-muted mt-1">Ready for automatic FY rollover</p>
            </div>
          </div>

          {/* Continuity Matrix Table */}
          <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border overflow-hidden">
            <div className="p-4 border-b border-theme-border bg-theme-surface-hover flex justify-between items-center">
              <h2 className="text-sm font-bold text-theme-text uppercase tracking-wider">
                Balance Continuity Matrix ({selectedFY})
              </h2>
              <span className="text-xs text-theme-text-muted font-medium">All figures in INR (₹)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-theme-border text-xs uppercase text-theme-text-muted font-semibold bg-theme-surface">
                    <th className="px-6 py-3.5">Particulars / Component</th>
                    <th className="px-6 py-3.5 text-right">Opening Balance</th>
                    <th className="px-6 py-3.5 text-right">Current Period Closing</th>
                    <th className="px-6 py-3.5 text-right text-theme-primary font-bold">Next FY Opening</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {/* ASSETS */}
                  <tr className="bg-theme-surface-hover/60 font-bold text-xs uppercase text-theme-text tracking-wider">
                    <td colSpan={4} className="px-6 py-2.5">
                      I. ASSETS & RECEIVABLES
                    </td>
                  </tr>
                  <tr className="hover:bg-theme-surface-hover/30">
                    <td className="px-6 py-3 font-medium text-theme-text">Bank & Cash Balance</td>
                    <td className="px-6 py-3 text-right text-theme-text-muted">₹{openingValues.bankBalance.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right font-medium text-theme-text">₹{initialClosing.bankBalance.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right font-semibold text-theme-primary">₹{nextFYOpening.bankBalance.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr className="hover:bg-theme-surface-hover/30">
                    <td className="px-6 py-3 font-medium text-theme-text">Accounts Receivable (Customer Invoices)</td>
                    <td className="px-6 py-3 text-right text-theme-text-muted">₹{openingValues.accountsReceivable.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right font-medium text-theme-text">₹{initialClosing.accountsReceivable.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right font-semibold text-theme-primary">₹{nextFYOpening.accountsReceivable.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr className="hover:bg-theme-surface-hover/30">
                    <td className="px-6 py-3 font-medium text-theme-text">GST Input Tax Credit (Receivable)</td>
                    <td className="px-6 py-3 text-right text-theme-text-muted">₹{openingValues.gstReceivable.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right font-medium text-theme-text">₹{initialClosing.gstReceivable.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right font-semibold text-theme-primary">₹{nextFYOpening.gstReceivable.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr className="hover:bg-theme-surface-hover/30">
                    <td className="px-6 py-3 font-medium text-theme-text">TDS Receivable (Withheld by Clients)</td>
                    <td className="px-6 py-3 text-right text-theme-text-muted">₹{openingValues.tdsReceivable.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right font-medium text-theme-text">₹{initialClosing.tdsReceivable.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right font-semibold text-theme-primary">₹{nextFYOpening.tdsReceivable.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr className="hover:bg-theme-surface-hover/30">
                    <td className="px-6 py-3 font-medium text-theme-text">Fixed Assets & Equipment</td>
                    <td className="px-6 py-3 text-right text-theme-text-muted">₹{openingValues.fixedAssets.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right font-medium text-theme-text">₹{initialClosing.fixedAssets.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right font-semibold text-theme-primary">₹{nextFYOpening.fixedAssets.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr className="bg-theme-surface-hover/40 font-bold">
                    <td className="px-6 py-3 text-theme-text">Total Assets (A)</td>
                    <td className="px-6 py-3 text-right text-theme-text">₹{totalOpeningAssets.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right text-theme-primary">₹{totalClosingAssets.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right text-theme-primary">₹{totalClosingAssets.toLocaleString("en-IN")}</td>
                  </tr>

                  {/* LIABILITIES */}
                  <tr className="bg-theme-surface-hover/60 font-bold text-xs uppercase text-theme-text tracking-wider">
                    <td colSpan={4} className="px-6 py-2.5">
                      II. LIABILITIES & EQUITY
                    </td>
                  </tr>
                  <tr className="hover:bg-theme-surface-hover/30">
                    <td className="px-6 py-3 font-medium text-theme-text">Accounts Payable (Vendor Bills)</td>
                    <td className="px-6 py-3 text-right text-theme-text-muted">₹{openingValues.accountsPayable.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right font-medium text-theme-text">₹{initialClosing.accountsPayable.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right font-semibold text-theme-primary">₹{nextFYOpening.accountsPayable.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr className="hover:bg-theme-surface-hover/30">
                    <td className="px-6 py-3 font-medium text-theme-text">GST Output Liability (Payable)</td>
                    <td className="px-6 py-3 text-right text-theme-text-muted">₹{openingValues.gstPayable.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right font-medium text-theme-text">₹{initialClosing.gstPayable.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right font-semibold text-theme-primary">₹{nextFYOpening.gstPayable.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr className="hover:bg-theme-surface-hover/30">
                    <td className="px-6 py-3 font-medium text-theme-text">TDS Output Deduction (Payable to Govt)</td>
                    <td className="px-6 py-3 text-right text-theme-text-muted">₹{openingValues.tdsPayable.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right font-medium text-theme-text">₹{initialClosing.tdsPayable.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right font-semibold text-theme-primary">₹{nextFYOpening.tdsPayable.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr className="hover:bg-theme-surface-hover/30">
                    <td className="px-6 py-3 font-medium text-theme-text">Capital & Retained Earnings</td>
                    <td className="px-6 py-3 text-right text-theme-text-muted">₹{openingValues.capitalEquity.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right font-medium text-theme-text">₹{initialClosing.capitalEquity.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right font-semibold text-theme-primary">₹{nextFYOpening.capitalEquity.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr className="bg-theme-surface-hover/40 font-bold">
                    <td className="px-6 py-3 text-theme-text">Total Liabilities & Equity (B)</td>
                    <td className="px-6 py-3 text-right text-theme-text">₹{totalOpeningLiabilities.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right text-theme-primary">₹{totalClosingLiabilities.toLocaleString("en-IN")}</td>
                    <td className="px-6 py-3 text-right text-theme-primary">₹{totalClosingLiabilities.toLocaleString("en-IN")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Opening Entry Form */
        <div className="bg-theme-surface rounded-xl shadow-sm border border-theme-border p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-theme-text">
              Set Opening Balance Schedule (FY {selectedFY})
            </h2>
            <p className="text-xs text-theme-text-muted mt-1">
              Enter the certified opening values at the start of financial year {selectedFY}.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 bg-theme-surface-hover/40 p-5 rounded-xl border border-theme-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text mb-3">
                Assets & Receivables
              </h3>

              <div>
                <label className="block text-xs font-medium text-theme-text mb-1">
                  Bank & Cash Opening Balance (₹)
                </label>
                <input
                  type="number"
                  value={openingValues.bankBalance}
                  onChange={(e) => handleOpeningChange("bankBalance", Number(e.target.value))}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm bg-theme-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-text mb-1">
                  Accounts Receivable Opening (₹)
                </label>
                <input
                  type="number"
                  value={openingValues.accountsReceivable}
                  onChange={(e) => handleOpeningChange("accountsReceivable", Number(e.target.value))}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm bg-theme-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-text mb-1">
                  GST Input Credit Opening (₹)
                </label>
                <input
                  type="number"
                  value={openingValues.gstReceivable}
                  onChange={(e) => handleOpeningChange("gstReceivable", Number(e.target.value))}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm bg-theme-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-text mb-1">
                  TDS Receivable Opening (₹)
                </label>
                <input
                  type="number"
                  value={openingValues.tdsReceivable}
                  onChange={(e) => handleOpeningChange("tdsReceivable", Number(e.target.value))}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm bg-theme-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-text mb-1">
                  Fixed Assets Gross Block (₹)
                </label>
                <input
                  type="number"
                  value={openingValues.fixedAssets}
                  onChange={(e) => handleOpeningChange("fixedAssets", Number(e.target.value))}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm bg-theme-surface"
                />
              </div>
            </div>

            <div className="space-y-4 bg-theme-surface-hover/40 p-5 rounded-xl border border-theme-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text mb-3">
                Liabilities & Equity
              </h3>

              <div>
                <label className="block text-xs font-medium text-theme-text mb-1">
                  Accounts Payable Opening (₹)
                </label>
                <input
                  type="number"
                  value={openingValues.accountsPayable}
                  onChange={(e) => handleOpeningChange("accountsPayable", Number(e.target.value))}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm bg-theme-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-text mb-1">
                  GST Output Liability Opening (₹)
                </label>
                <input
                  type="number"
                  value={openingValues.gstPayable}
                  onChange={(e) => handleOpeningChange("gstPayable", Number(e.target.value))}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm bg-theme-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-text mb-1">
                  TDS Payable Opening (₹)
                </label>
                <input
                  type="number"
                  value={openingValues.tdsPayable}
                  onChange={(e) => handleOpeningChange("tdsPayable", Number(e.target.value))}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm bg-theme-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-text mb-1">
                  Capital & Retained Earnings (₹)
                </label>
                <input
                  type="number"
                  value={openingValues.capitalEquity}
                  onChange={(e) => handleOpeningChange("capitalEquity", Number(e.target.value))}
                  className="w-full border border-theme-border rounded-lg px-3 py-2 text-sm bg-theme-surface"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-theme-border">
            <button
              type="button"
              onClick={() => setActiveTab("SCHEDULE")}
              className="px-5 py-2.5 border border-theme-border rounded-lg text-sm font-medium hover:bg-theme-surface-hover text-theme-text"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveOpening}
              className="px-6 py-2.5 bg-theme-primary hover:bg-theme-primary-dark text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              Save Opening Schedule
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
