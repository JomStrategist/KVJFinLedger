"use client";

import { useState, useMemo } from "react";
import { useSettings, AppSettings } from "@/hooks/useSettings";
import { BankAccountsMasterTab } from "./BankAccountsMasterTab";
import { FixedAssetsSettingsTab } from "./FixedAssetsSettingsTab";

interface SettingsClientProps {
  initialFixedAssets?: any[];
  categories?: any[];
  assetDepreciations?: any[];
}

function parseFyStartYear(fyString: string): number {
  const match = fyString.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : 2026;
}

function getAssessmentYear(fyString: string): string {
  const start = parseFyStartYear(fyString);
  const ayStart = start + 1;
  const ayEndShort = String(ayStart + 1).slice(-2);
  return `AY ${ayStart}–${ayEndShort}`;
}

function getFyPeriod(fyString: string): string {
  const start = parseFyStartYear(fyString);
  return `01 Apr ${start} – 31 Mar ${start + 1}`;
}

export function SettingsClient({
  initialFixedAssets = [],
  categories = [],
  assetDepreciations = [],
}: SettingsClientProps) {
  const { settings, saveSettings, resetSettings, isLoaded } = useSettings();
  const [activeTab, setActiveTab] = useState<
    "business" | "tax" | "assets" | "bank" | "invoice" | "display"
  >("business");

  const [formValues, setFormValues] = useState<Partial<AppSettings>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Custom FY Adder state
  const [isCustomFyOpen, setIsCustomFyOpen] = useState(false);
  const [customFyInput, setCustomFyInput] = useState("");
  const [customRateInput, setCustomRateInput] = useState("25");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormValues((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      saveSettings(formValues);
      setMessage({ type: "success", text: "Settings saved successfully across application!" });
    } catch {
      setMessage({ type: "error", text: "Failed to save settings. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm("Reset all settings to default values? This will restore standard GST, Income Tax and corporate settings.")) {
      resetSettings();
      setFormValues({});
      setMessage({ type: "success", text: "Settings reset to statutory defaults." });
    }
  };

  if (!isLoaded) {
    return (
      <div className="bg-white rounded-2xl border border-[#D9E3DC] p-12 text-center text-[#68756C] shadow-xs">
        Loading settings...
      </div>
    );
  }

  const currentValues: AppSettings = { ...settings, ...formValues };

  // Financial Year Tax Rates list and Next FY computation
  const taxRatesRecord = currentValues.incomeTaxRates || {
    "FY 2026–27": 25,
    "FY 2025–26": 25,
    "FY 2024–25": 25,
  };

  const sortedFys = Object.keys(taxRatesRecord).sort((a, b) => {
    return parseFyStartYear(b) - parseFyStartYear(a);
  });

  const highestYear = sortedFys.length > 0 ? Math.max(...sortedFys.map(parseFyStartYear)) : 2026;
  const nextStart = highestYear + 1;
  const nextEndShort = String(nextStart + 1).slice(-2);
  const nextSuggestedFy = `FY ${nextStart}–${nextEndShort}`;

  const handleAddNextFy = () => {
    const updated = {
      ...taxRatesRecord,
      [nextSuggestedFy]: 25,
    };
    setFormValues((prev) => ({
      ...prev,
      incomeTaxRates: updated,
    }));
    setMessage({
      type: "success",
      text: `Added ${nextSuggestedFy} with 25% tax rate. Click 'Save Changes' to apply across financial statements.`,
    });
  };

  const handleAddCustomFy = () => {
    if (!customFyInput.trim()) return;
    const formatted = customFyInput.trim().toUpperCase().startsWith("FY")
      ? customFyInput.trim()
      : `FY ${customFyInput.trim()}`;
    const rate = parseFloat(customRateInput) || 25;
    const updated = {
      ...taxRatesRecord,
      [formatted]: rate,
    };
    setFormValues((prev) => ({
      ...prev,
      incomeTaxRates: updated,
    }));
    setCustomFyInput("");
    setIsCustomFyOpen(false);
    setMessage({
      type: "success",
      text: `Added ${formatted} with ${rate}% tax rate. Click 'Save Changes' to apply.`,
    });
  };

  const handleDeleteFy = (fyToDelete: string) => {
    if (fyToDelete === "FY 2026–27") {
      alert("Cannot delete the current active financial year (FY 2026–27).");
      return;
    }
    const updated = { ...taxRatesRecord };
    delete updated[fyToDelete];
    setFormValues((prev) => ({
      ...prev,
      incomeTaxRates: updated,
    }));
    setMessage({
      type: "success",
      text: `Removed ${fyToDelete} from corporate tax master. Click 'Save Changes' to commit.`,
    });
  };

  const tabs = [
    { id: "business", label: "Company Profile" },
    { id: "tax", label: "GST & Tax" },
    { id: "assets", label: "Fixed Assets" },
    { id: "bank", label: "Bank Accounts" },
    { id: "invoice", label: "Invoice Preferences" },
    { id: "display", label: "System Display" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#177B55] tracking-widest uppercase block">
            FINANCIAL MANAGEMENT • INDIA
          </span>
          <h1 className="text-3xl font-extrabold text-[#17211B] mt-0.5 tracking-tight">
            Settings
          </h1>
          <p className="text-[#68756C] text-sm mt-0.5 font-normal">
            Manage company profile, GST configuration, financial year settings and preferences.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-[#177B55] hover:bg-[#136f4e] shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Main Card Container */}
      <div className="bg-white rounded-2xl border border-[#D9E3DC] shadow-xs p-6 md:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#D9E3DC] pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-[#E5F3EC] text-[#0B5F46] shadow-2xs"
                  : "bg-white text-[#68756C] hover:bg-[#F4F7F3] hover:text-[#17211B] border border-[#D9E3DC]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status Message Alert */}
        {message && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold ${
              message.type === "success"
                ? "bg-[#E5F3EC] text-[#0B5F46] border border-[#C2E3D2]"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 1. COMPANY PROFILE */}
        {activeTab === "business" && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#17211B]">Company Profile</h3>
              <p className="text-xs text-[#68756C] mt-0.5">
                Legal and organizational information displayed on Tax Invoices and Statements.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1.5">
                  Business / Brand Name *
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={currentValues.businessName || "KVJ Analytics"}
                  onChange={handleChange}
                  className="w-full h-[40px] border border-[#D9E3DC] rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1.5">
                  Legal Registered Name
                </label>
                <input
                  type="text"
                  name="legalName"
                  value={currentValues.legalName || "KVJ Analytics Private Limited"}
                  onChange={handleChange}
                  className="w-full h-[40px] border border-[#D9E3DC] rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1.5">
                  Official Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={currentValues.email || "finance@kvjanalytics.com"}
                  onChange={handleChange}
                  className="w-full h-[40px] border border-[#D9E3DC] rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1.5">
                  Phone / Contact Number
                </label>
                <input
                  type="text"
                  name="phone"
                  value={currentValues.phone || "+91 98765 43210"}
                  onChange={handleChange}
                  className="w-full h-[40px] border border-[#D9E3DC] rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#68756C] mb-1.5">
                Registered Business Address
              </label>
              <textarea
                rows={2}
                name="businessAddress"
                value={currentValues.businessAddress || "Kochi, Kerala, India - 682001"}
                onChange={handleChange}
                className="w-full border border-[#D9E3DC] rounded-xl p-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
              />
            </div>
          </div>
        )}

        {/* 2. GST & TAX */}
        {activeTab === "tax" && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#17211B]">GST & Tax Configuration</h3>
              <p className="text-xs text-[#68756C] mt-0.5">
                Goods and Services Tax (GSTIN) and Permanent Account Number (PAN).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1.5">
                  GSTIN (15-digit GST Number) *
                </label>
                <input
                  type="text"
                  name="gstin"
                  value={currentValues.gstin || "32ABCDE1234F1Z5"}
                  onChange={handleChange}
                  className="w-full h-[40px] border border-[#D9E3DC] rounded-xl px-3.5 text-xs bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1.5">
                  PAN (10-digit Permanent Account Number)
                </label>
                <input
                  type="text"
                  name="pan"
                  value={currentValues.pan || ""}
                  onChange={handleChange}
                  className="w-full h-[40px] border border-[#D9E3DC] rounded-xl px-3.5 text-xs bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1.5">
                  State of Registration
                </label>
                <select
                  name="state"
                  value={currentValues.state || "Kerala"}
                  onChange={handleChange}
                  className="w-full h-[40px] border border-[#D9E3DC] rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                >
                  <option value="Kerala">Kerala (32)</option>
                  <option value="Karnataka">Karnataka (29)</option>
                  <option value="Tamil Nadu">Tamil Nadu (33)</option>
                  <option value="Maharashtra">Maharashtra (27)</option>
                  <option value="Delhi">Delhi (07)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1.5">
                  State Code
                </label>
                <input
                  type="text"
                  name="stateCode"
                  value={currentValues.stateCode || "32"}
                  onChange={handleChange}
                  className="w-full h-[40px] border border-[#D9E3DC] rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>
            </div>

            {/* Income Tax Rate % Master per Financial Year (Tabular Format with Option to Add Next Year) */}
            <div className="pt-6 border-t border-[#D9E3DC] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-extrabold text-[#17211B]">
                    Financial Year Income Tax Rates (Corporate Tax Master)
                  </h4>
                  <p className="text-xs text-[#68756C] mt-0.5">
                    Set the applicable Income Tax rate (%) for each financial year. These rates automatically compute corporate tax provisions and Net Profit (PAT) across Financial Statements.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleAddNextFy}
                    className="h-[36px] px-3.5 text-xs font-black rounded-xl border border-emerald-600 bg-emerald-700 text-white hover:bg-emerald-800 shadow-2xs cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <span>+ Add Next Year ({nextSuggestedFy})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomFyOpen((prev) => !prev)}
                    className="h-[36px] px-3 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer transition-all"
                  >
                    Custom FY...
                  </button>
                </div>
              </div>

              {/* Custom Financial Year Adder Row */}
              {isCustomFyOpen && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-600">Financial Year:</label>
                    <input
                      type="text"
                      placeholder="e.g. FY 2028–29"
                      value={customFyInput}
                      onChange={(e) => setCustomFyInput(e.target.value)}
                      className="h-[32px] px-2.5 text-xs font-bold border border-slate-300 rounded-lg bg-white outline-none focus:ring-1 focus:ring-emerald-600 w-36"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-600">Tax Rate (%):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={customRateInput}
                      onChange={(e) => setCustomRateInput(e.target.value)}
                      className="w-20 h-[32px] px-2 text-xs font-mono font-bold border border-slate-300 rounded-lg bg-white outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomFy}
                    className="h-[32px] px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-lg cursor-pointer"
                  >
                    Add Financial Year
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomFyOpen(false)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Tabular Format */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left border-collapse min-w-[650px] text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Financial Year</th>
                      <th className="py-3 px-4">Assessment Year (AY)</th>
                      <th className="py-3 px-4">Effective Tax Period</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Tax Rate (%)</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedFys.map((fyKey) => {
                      const rateVal = taxRatesRecord[fyKey] ?? 25;
                      const isCurrent = fyKey === "FY 2026–27";
                      const startYr = parseFyStartYear(fyKey);
                      const isUpcoming = startYr > 2026;

                      return (
                        <tr key={fyKey} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {fyKey}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-600">
                            {getAssessmentYear(fyKey)}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                            {getFyPeriod(fyKey)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                isCurrent
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isUpcoming
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {isCurrent ? "Current FY" : isUpcoming ? "Upcoming FY" : "Closed FY"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={rateVal}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  const updatedRates = { ...taxRatesRecord, [fyKey]: val };
                                  setFormValues((prev) => ({
                                    ...prev,
                                    incomeTaxRates: updatedRates,
                                  }));
                                  setMessage(null);
                                }}
                                className="w-20 h-[32px] border border-slate-200 rounded-lg text-right font-mono font-bold text-xs px-2.5 text-emerald-800 focus:bg-white focus:ring-1 focus:ring-emerald-600 outline-none"
                              />
                              <span className="font-bold text-slate-400">%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isCurrent ? (
                              <span className="text-[11px] font-semibold text-slate-400 italic">Locked</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteFy(fyKey)}
                                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                              >
                                Delete
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
          </div>
        )}

        {/* 3. FIXED ASSETS & DEPRECIATION MASTER */}
        {activeTab === "assets" && (
          <FixedAssetsSettingsTab
            currentValues={currentValues}
            onChange={(updates) => {
              setFormValues((prev) => ({ ...prev, ...updates }));
              setMessage(null);
            }}
            initialFixedAssets={initialFixedAssets}
            categories={categories}
            assetDepreciations={assetDepreciations}
            onNotify={(msg) => setMessage(msg)}
          />
        )}

        {/* 3. BANK ACCOUNTS MASTER */}
        {activeTab === "bank" && (
          <BankAccountsMasterTab />
        )}

        {/* 4. INVOICE PREFERENCES */}
        {activeTab === "invoice" && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#17211B]">Invoice Preferences</h3>
              <p className="text-xs text-[#68756C] mt-0.5">
                Prefixes, sequence formatting, terms and signature configuration.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1.5">
                  Invoice Number Prefix
                </label>
                <input
                  type="text"
                  name="invoicePrefix"
                  value={currentValues.invoicePrefix || "KVJ/B2B/26-27/"}
                  onChange={handleChange}
                  className="w-full h-[40px] border border-[#D9E3DC] rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1.5">
                  Proforma Number Prefix
                </label>
                <input
                  type="text"
                  name="proformaPrefix"
                  value={currentValues.proformaPrefix || "KVJ/PI/26-27/"}
                  onChange={handleChange}
                  className="w-full h-[40px] border border-[#D9E3DC] rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1.5">
                  Standard Payment Terms (Days)
                </label>
                <input
                  type="text"
                  name="defaultPaymentTerms"
                  value={currentValues.defaultPaymentTerms || "30"}
                  onChange={handleChange}
                  className="w-full h-[40px] border border-[#D9E3DC] rounded-xl px-3.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#68756C] mb-1.5">
                Terms & Conditions (Shown on PDF)
              </label>
              <textarea
                rows={3}
                name="termsAndConditions"
                value={
                  currentValues.termsAndConditions ||
                  "1. Payment is due within standard credit period.\n2. Please mention invoice number in all remittances."
                }
                onChange={handleChange}
                className="w-full border border-[#D9E3DC] rounded-xl p-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#177B55]"
              />
            </div>
          </div>
        )}

        {/* 5. SYSTEM DISPLAY */}
        {activeTab === "display" && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#17211B]">System Display & Formatting</h3>
              <p className="text-xs text-[#68756C] mt-0.5">
                Currency symbols, Indian numeral grouping, and table pagination settings.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1.5">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  name="defaultCurrency"
                  value="INR (₹)"
                  disabled
                  className="w-full h-[40px] border border-[#D9E3DC] rounded-xl px-3.5 text-xs bg-gray-50 text-[#17211B] font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#68756C] mb-1.5">
                  Numeral Grouping
                </label>
                <input
                  type="text"
                  name="numberFormat"
                  value="Indian Lakhs / Crores (en-IN)"
                  disabled
                  className="w-full h-[40px] border border-[#D9E3DC] rounded-xl px-3.5 text-xs bg-gray-50 text-[#17211B] font-medium"
                />
              </div>
            </div>
          </div>
        )}

        {/* Bottom Form Actions */}
        <div className="pt-4 border-t border-[#D9E3DC] flex justify-between items-center">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 border border-[#D9E3DC] rounded-xl text-xs font-bold hover:bg-[#F4F7F3] text-[#17211B] transition-colors"
          >
            Reset to Defaults
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-[#1b5e4b] hover:bg-[#136f58] text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
          >
            {isSaving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
