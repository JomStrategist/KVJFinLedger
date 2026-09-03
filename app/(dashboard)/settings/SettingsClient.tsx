"use client";

import { useState } from "react";
import { useSettings, AppSettings } from "@/hooks/useSettings";
import { BankAccountsMasterTab } from "./BankAccountsMasterTab";

export function SettingsClient() {
  const { settings, saveSettings, resetSettings, isLoaded } = useSettings();
  const [activeTab, setActiveTab] = useState<
    "business" | "tax" | "bank" | "invoice" | "display"
  >("business");

  const [formValues, setFormValues] = useState<Partial<AppSettings>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isLoaded) {
    return (
      <div className="bg-white rounded-2xl border border-[#D9E3DC] p-12 text-center text-[#68756C] shadow-xs">
        Loading settings...
      </div>
    );
  }

  const currentValues: AppSettings = { ...settings, ...formValues };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setMessage(null);
  };

  const handleSave = () => {
    setIsSaving(true);
    const success = saveSettings(formValues);
    setIsSaving(false);
    if (success) {
      setMessage({ type: "success", text: "Settings saved successfully!" });
      setFormValues({});
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: "error", text: "Failed to save settings." });
    }
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to defaults?")) {
      const success = resetSettings();
      if (success) {
        setFormValues({});
        setMessage({ type: "success", text: "Settings reset to defaults." });
        setTimeout(() => setMessage(null), 3000);
      }
    }
  };

  const tabs = [
    { id: "business", label: "Company Profile" },
    { id: "tax", label: "GST & Tax" },
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
          className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent rounded-xl text-xs font-bold text-white bg-[#1b5e4b] hover:bg-[#136f58] shadow-xs transition-colors disabled:opacity-50"
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

            {/* Income Tax Rate % Master per Financial Year */}
            <div className="pt-4 border-t border-[#D9E3DC] space-y-3">
              <div>
                <h4 className="text-sm font-extrabold text-[#17211B]">Financial Year Income Tax Rates (Corporate Tax Master)</h4>
                <p className="text-xs text-[#68756C] mt-0.5">
                  Set the applicable Income Tax rate (%) for each financial year to compute P&amp;L Tax Expense &amp; Net Profit After Tax (PAT).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F8FAF8] p-4 rounded-xl border border-[#E2E8E4]">
                {["FY 2026–27", "FY 2025–26", "FY 2024–25"].map((fyKey) => {
                  const currentRates = currentValues.incomeTaxRates || {
                    "FY 2026–27": 25,
                    "FY 2025–26": 25,
                    "FY 2024–25": 25,
                  };
                  const rateVal = currentRates[fyKey] ?? 25;
                  return (
                    <div key={fyKey}>
                      <label className="block text-xs font-bold text-[#374151] mb-1.5">
                        {fyKey} Tax Rate (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={rateVal}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const updatedRates = { ...currentRates, [fyKey]: val };
                            setFormValues((prev) => ({
                              ...prev,
                              incomeTaxRates: updatedRates,
                            }));
                            setMessage(null);
                          }}
                          className="w-full h-[40px] border border-[#D9E3DC] rounded-xl pl-3.5 pr-8 text-xs bg-white font-mono font-bold text-[#166534] focus:outline-none focus:ring-2 focus:ring-[#177B55]"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-black text-slate-400">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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
