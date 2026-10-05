"use client";

import { useState, useTransition, useMemo } from "react";
import { AppSettings } from "@/hooks/useSettings";
import {
  updateAssetAction,
  createAssetAction,
  deleteAssetAction,
  recordAssetDepreciationSettingsAction,
} from "./actions";

interface FixedAssetsSettingsTabProps {
  currentValues: AppSettings;
  onChange: (updates: Partial<AppSettings>) => void;
  initialFixedAssets?: any[];
  categories?: any[];
  assetDepreciations?: any[];
  onNotify?: (msg: { type: "success" | "error"; text: string }) => void;
}

const DEFAULT_CATEGORY_RATES = {
  "Computers & IT Equipment": { wdvRate: 40, slmRate: 33.33, usefulLifeYears: 3 },
  "Vehicles & Automobiles": { wdvRate: 15, slmRate: 10, usefulLifeYears: 10 },
  "Furniture & Fixtures": { wdvRate: 10, slmRate: 10, usefulLifeYears: 10 },
  "Plant & Machinery": { wdvRate: 15, slmRate: 6.67, usefulLifeYears: 15 },
  "Buildings & Premises": { wdvRate: 10, slmRate: 1.67, usefulLifeYears: 60 },
  "Electrical & Office Equipment": { wdvRate: 15, slmRate: 10, usefulLifeYears: 10 },
  "General Fixed Assets": { wdvRate: 15, slmRate: 10, usefulLifeYears: 10 },
};

function formatINR(val: number): string {
  return Number(val || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

export function FixedAssetsSettingsTab({
  currentValues,
  onChange,
  initialFixedAssets = [],
  categories = [],
  assetDepreciations = [],
  onNotify,
}: FixedAssetsSettingsTabProps) {
  const [isPending, startTransition] = useTransition();
  const [fixedAssets, setFixedAssets] = useState<any[]>(initialFixedAssets);
  const [localDepreciations, setLocalDepreciations] = useState<any[]>(assetDepreciations);

  // Modal State for adding new asset
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: "",
    categoryName: "Computers & IT Equipment",
    purchaseDate: new Date().toISOString().split("T")[0],
    cost: "",
    depreciationRate: "40",
    method: "WDV" as "WDV" | "SLM",
  });

  // Modal State for recording depreciation adjustment
  const [isDepModalOpen, setIsDepModalOpen] = useState(false);
  const [selectedAssetForDep, setSelectedAssetForDep] = useState<any | null>(null);
  const [depAdjustment, setDepAdjustment] = useState({
    financialYear: "FY 2026–27",
    method: "WDV" as "WDV" | "SLM",
    rate: "",
    amount: "",
    remarks: "",
  });

  // Active Category rates from settings or defaults
  const categoryRates = useMemo(() => {
    return {
      ...DEFAULT_CATEGORY_RATES,
      ...(currentValues.assetCategoryRates || {}),
    };
  }, [currentValues.assetCategoryRates]);

  const defaultMethod = currentValues.defaultDepreciationMethod || "WDV";

  // Summary Metrics
  const totalGrossCost = useMemo(() => {
    return fixedAssets.reduce((s, a) => s + Number(a.netAmount || a.taxableAmount || 0), 0);
  }, [fixedAssets]);

  const handleMethodChange = (method: "WDV" | "SLM") => {
    onChange({ defaultDepreciationMethod: method });
    if (onNotify) {
      onNotify({
        type: "success",
        text: `Default depreciation policy updated to ${method === "WDV" ? "Written Down Value (WDV)" : "Straight Line Method (SLM)"}.`,
      });
    }
  };

  const handleCategoryRateChange = (catKey: string, field: "wdvRate" | "slmRate", value: number) => {
    const existing = categoryRates[catKey as keyof typeof categoryRates] || DEFAULT_CATEGORY_RATES[catKey as keyof typeof DEFAULT_CATEGORY_RATES] || { wdvRate: 15, slmRate: 10 };
    const updated = {
      ...categoryRates,
      [catKey]: {
        ...existing,
        [field]: value,
      },
    };
    onChange({ assetCategoryRates: updated });
  };

  const handleResetCategoryRates = () => {
    onChange({ assetCategoryRates: DEFAULT_CATEGORY_RATES });
    if (onNotify) {
      onNotify({
        type: "success",
        text: "Asset category depreciation rates reset to statutory standards (Companies Act Schedule II & IT Act).",
      });
    }
  };

  // Inline update of asset rate
  const handleSaveAssetRate = async (assetId: string, newRate: number, newMethod?: "WDV" | "SLM") => {
    startTransition(async () => {
      const res = await updateAssetAction(assetId, {
        depreciationRate: newRate,
        depreciationMethod: newMethod,
      });
      if (res.success) {
        setFixedAssets((prev) =>
          prev.map((a) => (a.id === assetId ? { ...a, depreciationRate: newRate, ...(newMethod ? { depreciationMethod: newMethod } : {}) } : a))
        );
        if (onNotify) onNotify({ type: "success", text: "Asset depreciation rate updated successfully!" });
      } else {
        if (onNotify) onNotify({ type: "error", text: res.error || "Failed to update asset rate." });
      }
    });
  };

  // Delete an asset
  const handleDeleteAsset = async (assetId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the fixed asset "${name}"? This will remove it from the register and reports.`)) return;

    startTransition(async () => {
      const res = await deleteAssetAction(assetId);
      if (res.success) {
        setFixedAssets((prev) => prev.filter((a) => a.id !== assetId));
        if (onNotify) onNotify({ type: "success", text: `Fixed asset "${name}" deleted.` });
      } else {
        if (onNotify) onNotify({ type: "error", text: res.error || "Failed to delete asset." });
      }
    });
  };

  // Submit New Asset
  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.name || !newAsset.cost) {
      alert("Please provide asset name and purchase cost.");
      return;
    }

    startTransition(async () => {
      const res = await createAssetAction({
        name: newAsset.name,
        categoryName: newAsset.categoryName,
        purchaseDate: newAsset.purchaseDate,
        cost: parseFloat(newAsset.cost) || 0,
        depreciationRate: parseFloat(newAsset.depreciationRate) || 0,
        method: newAsset.method,
      });

      if (res.success && res.data) {
        setFixedAssets((prev) => [res.data, ...prev]);
        setIsAddModalOpen(false);
        setNewAsset({
          name: "",
          categoryName: "Computers & IT Equipment",
          purchaseDate: new Date().toISOString().split("T")[0],
          cost: "",
          depreciationRate: "40",
          method: "WDV",
        });
        if (onNotify) {
          onNotify({
            type: "success",
            text: `Fixed Asset "${res.data.notes || "Asset"}" added to register and financial statements!`,
          });
        }
      } else {
        if (onNotify) onNotify({ type: "error", text: res.error || "Failed to create asset." });
      }
    });
  };

  // Submit Depreciation Adjustment
  const handleRecordDepAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForDep || !depAdjustment.amount) {
      alert("Please enter a valid depreciation amount.");
      return;
    }

    startTransition(async () => {
      const res = await recordAssetDepreciationSettingsAction({
        expenseId: selectedAssetForDep.id,
        financialYear: depAdjustment.financialYear,
        method: depAdjustment.method,
        rate: parseFloat(depAdjustment.rate) || 0,
        depreciationAmount: parseFloat(depAdjustment.amount) || 0,
        remarks: depAdjustment.remarks || undefined,
      });

      if (res.success && res.data) {
        const recorded = res.data;
        setLocalDepreciations((prev) => {
          const idx = prev.findIndex((d) => d.id === recorded.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = recorded;
            return next;
          }
          return [recorded, ...prev];
        });
        setIsDepModalOpen(false);
        if (onNotify) {
          onNotify({
            type: "success",
            text: `Depreciation adjustment of ₹${formatINR(Number(depAdjustment.amount))} saved for ${depAdjustment.financialYear}.`,
          });
        }
      } else {
        if (onNotify) onNotify({ type: "error", text: res.error || "Failed to record depreciation." });
      }
    });
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header section */}
      <div>
        <h3 className="text-base font-bold text-[#17211B]">Fixed Assets &amp; Depreciation Master</h3>
        <p className="text-xs text-[#68756C] mt-0.5">
          Configure default depreciation methods, asset category rates, and individual fixed asset records. Changes reflect dynamically across the Statement of Profit &amp; Loss, Balance Sheet, and Asset Schedules.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50/80 p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Total Recorded Assets</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{fixedAssets.length}</span>
            <span className="text-xs font-semibold text-slate-500">items in register</span>
          </div>
        </div>

        <div className="bg-slate-50/80 p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Gross Asset Block (Cost)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-800">₹{formatINR(totalGrossCost)}</span>
            <span className="text-xs font-semibold text-slate-500">acquisition basis</span>
          </div>
        </div>

        <div className="bg-slate-50/80 p-4.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Default Depreciation Method</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-700">{defaultMethod}</span>
            <span className="text-xs font-semibold text-slate-500">
              {defaultMethod === "WDV" ? "Written Down Value" : "Straight Line"}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: GLOBAL DEPRECIATION POLICY */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              1. System Default Depreciation Mode
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Select the primary method used to compute depreciation for corporate financial reporting.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleMethodChange("WDV")}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              defaultMethod === "WDV"
                ? "bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20"
                : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900">Written Down Value (WDV)</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Income Tax Act Standard
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Depreciation is calculated as a fixed percentage on the diminishing book value at the beginning of each financial year. Front-loads tax depreciation deductions.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleMethodChange("SLM")}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              defaultMethod === "SLM"
                ? "bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20"
                : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900">Straight Line Method (SLM)</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                Companies Act 2013
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Depreciation is evenly apportioned over the estimated useful life of the asset based on original gross acquisition cost. Provides constant annual expense.
            </p>
          </button>
        </div>
      </div>

      {/* SECTION 2: ASSET CATEGORY DEPRECIATION MASTER TABLE */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              2. Asset Class Depreciation Rates (%) Master
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Statutory and customized depreciation percentage rates applied to each asset category across financial statements.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetCategoryRates}
            className="text-xs font-bold text-slate-600 hover:text-emerald-800 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition-all cursor-pointer"
          >
            ↺ Reset Statutory Rates
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse min-w-[650px] text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Asset Class / Category</th>
                <th className="py-3 px-4 text-center">Useful Life (Years)</th>
                <th className="py-3 px-4 text-right">WDV Rate (%)</th>
                <th className="py-3 px-4 text-right">SLM Rate (%)</th>
                <th className="py-3 px-4 text-center">Standard Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(categoryRates).map(([catKey, rateInfo]) => {
                return (
                  <tr key={catKey} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{catKey}</td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-600">
                      {rateInfo.usefulLifeYears || "—"} Yrs
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={rateInfo.wdvRate}
                          onChange={(e) =>
                            handleCategoryRateChange(catKey, "wdvRate", parseFloat(e.target.value) || 0)
                          }
                          className="w-18 h-[32px] bg-slate-50 border border-slate-200 rounded-lg text-right font-mono font-bold text-xs px-2 text-emerald-800 focus:bg-white focus:ring-1 focus:ring-emerald-600 outline-none"
                        />
                        <span className="font-bold text-slate-400">%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={rateInfo.slmRate}
                          onChange={(e) =>
                            handleCategoryRateChange(catKey, "slmRate", parseFloat(e.target.value) || 0)
                          }
                          className="w-18 h-[32px] bg-slate-50 border border-slate-200 rounded-lg text-right font-mono font-bold text-xs px-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-600 outline-none"
                        />
                        <span className="font-bold text-slate-400">%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200">
                        IT Act / Cos Act
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: COMPANY FIXED ASSET REGISTER & INDIVIDUAL OVERRIDES */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              3. Recorded Company Fixed Assets &amp; Rates
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Individual asset acquisition costs, assigned depreciation rates (%), and live overrides.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="h-[36px] px-3.5 text-xs font-black rounded-xl border border-emerald-600 bg-emerald-700 text-white hover:bg-emerald-800 shadow-2xs cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <span>+ Add Fixed Asset</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse min-w-[850px] text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Asset Name / Tag</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Acquisition Date</th>
                <th className="py-3 px-4 text-right">Cost (Gross Block)</th>
                <th className="py-3 px-4 text-center">Method</th>
                <th className="py-3 px-4 text-right">Depreciation Rate (%)</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fixedAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <p className="font-semibold text-xs">No capital fixed assets recorded yet.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Click &quot;+ Add Fixed Asset&quot; to register computers, vehicles, machinery, or office equipment.
                    </p>
                  </td>
                </tr>
              ) : (
                fixedAssets.map((asset) => {
                  const catName = asset.assetType ?? asset.category?.name ?? "Fixed Asset";
                  const cost = Number(asset.netAmount || asset.taxableAmount || 0);
                  const effectiveMethod = asset.depreciationMethod || defaultMethod;
                  const defaultCatRate = categoryRates[catName as keyof typeof categoryRates]?.[effectiveMethod === "WDV" ? "wdvRate" : "slmRate"] ?? 15;
                  const currentRate = Number(asset.depreciationRate || 0) > 0 ? Number(asset.depreciationRate) : defaultCatRate;

                  return (
                    <tr key={asset.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{asset.notes || asset.description || "Capital Asset"}</span>
                        {asset.vendor?.name && (
                          <span className="text-[10px] text-slate-400">Vendor: {asset.vendor.name}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {catName}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {asset.expenseDate ? new Date(asset.expenseDate).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{formatINR(cost)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${effectiveMethod === "WDV" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                          {effectiveMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            defaultValue={currentRate}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val !== currentRate) {
                                handleSaveAssetRate(asset.id, val);
                              }
                            }}
                            className="w-16 h-[30px] bg-slate-50 border border-slate-200 rounded-lg text-right font-mono font-bold text-xs px-2 text-emerald-800 focus:bg-white focus:ring-1 focus:ring-emerald-600 outline-none"
                          />
                          <span className="font-bold text-slate-400">%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAssetForDep(asset);
                              setDepAdjustment({
                                financialYear: "FY 2026–27",
                                method: effectiveMethod,
                                rate: String(currentRate),
                                amount: String(Math.round(cost * (currentRate / 100))),
                                remarks: "",
                              });
                              setIsDepModalOpen(true);
                            }}
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                          >
                            Adjust FY
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteAsset(asset.id, asset.notes || "Capital Asset")}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD FIXED ASSET */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Register New Fixed Asset
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Asset Name / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MacBook Pro M3 / Dell PowerEdge Server"
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  className="w-full h-[38px] border border-slate-200 rounded-xl px-3 font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Asset Category</label>
                  <select
                    value={newAsset.categoryName}
                    onChange={(e) => {
                      const cat = e.target.value;
                      const rate = categoryRates[cat as keyof typeof categoryRates]?.wdvRate ?? 15;
                      setNewAsset({
                        ...newAsset,
                        categoryName: cat,
                        depreciationRate: String(rate),
                      });
                    }}
                    className="w-full h-[38px] border border-slate-200 rounded-xl px-2.5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {Object.keys(categoryRates).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Acquisition Date</label>
                  <input
                    type="date"
                    required
                    value={newAsset.purchaseDate}
                    onChange={(e) => setNewAsset({ ...newAsset, purchaseDate: e.target.value })}
                    className="w-full h-[38px] border border-slate-200 rounded-xl px-2.5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Purchase Cost (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="125000"
                    value={newAsset.cost}
                    onChange={(e) => setNewAsset({ ...newAsset, cost: e.target.value })}
                    className="w-full h-[38px] border border-slate-200 rounded-xl px-3 font-mono font-bold text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Method</label>
                  <select
                    value={newAsset.method}
                    onChange={(e) => {
                      const m = e.target.value as "WDV" | "SLM";
                      const rate = categoryRates[newAsset.categoryName as keyof typeof categoryRates]?.[m === "WDV" ? "wdvRate" : "slmRate"] ?? 15;
                      setNewAsset({
                        ...newAsset,
                        method: m,
                        depreciationRate: String(rate),
                      });
                    }}
                    className="w-full h-[38px] border border-slate-200 rounded-xl px-2.5 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="WDV">WDV (IT Act)</option>
                    <option value="SLM">SLM (Cos Act)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Dep. Rate (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      value={newAsset.depreciationRate}
                      onChange={(e) => setNewAsset({ ...newAsset, depreciationRate: e.target.value })}
                      className="w-full h-[38px] border border-slate-200 rounded-xl pl-3 pr-6 font-mono font-bold text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <span className="absolute right-2.5 top-2.5 font-bold text-slate-400">%</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "Adding..." : "Register Fixed Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD FY DEPRECIATION ADJUSTMENT */}
      {isDepModalOpen && selectedAssetForDep && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  FY Depreciation Entry
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{selectedAssetForDep.notes || selectedAssetForDep.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDepModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordDepAdjustment} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Financial Year</label>
                  <select
                    value={depAdjustment.financialYear}
                    onChange={(e) => setDepAdjustment({ ...depAdjustment, financialYear: e.target.value })}
                    className="w-full h-[38px] border border-slate-200 rounded-xl px-2.5 font-bold text-slate-800 outline-none"
                  >
                    <option value="FY 2027–28">FY 2027–28</option>
                    <option value="FY 2026–27">FY 2026–27</option>
                    <option value="FY 2025–26">FY 2025–26</option>
                    <option value="FY 2024–25">FY 2024–25</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Method</label>
                  <select
                    value={depAdjustment.method}
                    onChange={(e) => setDepAdjustment({ ...depAdjustment, method: e.target.value as "WDV" | "SLM" })}
                    className="w-full h-[38px] border border-slate-200 rounded-xl px-2.5 font-bold text-slate-800 outline-none"
                  >
                    <option value="WDV">WDV (Written Down Value)</option>
                    <option value="SLM">SLM (Straight Line)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Applied Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={depAdjustment.rate}
                    onChange={(e) => {
                      const r = parseFloat(e.target.value) || 0;
                      const cost = Number(selectedAssetForDep.netAmount || selectedAssetForDep.taxableAmount || 0);
                      setDepAdjustment({
                        ...depAdjustment,
                        rate: e.target.value,
                        amount: String(Math.round(cost * (r / 100))),
                      });
                    }}
                    className="w-full h-[38px] border border-slate-200 rounded-xl px-3 font-mono font-bold text-emerald-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Depreciation Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={depAdjustment.amount}
                    onChange={(e) => setDepAdjustment({ ...depAdjustment, amount: e.target.value })}
                    className="w-full h-[38px] border border-slate-200 rounded-xl px-3 font-mono font-bold text-emerald-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Audit / Board Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. As per Board approval dated 31/03/2027"
                  value={depAdjustment.remarks}
                  onChange={(e) => setDepAdjustment({ ...depAdjustment, remarks: e.target.value })}
                  className="w-full h-[38px] border border-slate-200 rounded-xl px-3 text-slate-800 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDepModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "Recording..." : "Save Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
