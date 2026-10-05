"use client";

import React, { useState, useEffect, useTransition } from "react";
import { formatCurrency } from "@/lib/utils/currency";
import { recordAssetDepreciationAction, deleteAssetDepreciationAction } from "./depreciation-actions";

export interface AssetDepreciationModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    id: string;
    name: string;
    category: string;
    purchaseDate?: string | Date | null;
    grossCost: number;
    rateVal: number;
    method: "WDV" | "SLM";
    accDep: number;
    currentYearDep: number;
    closingWdv: number;
    isCustomRecorded?: boolean;
    recordedRecordId?: string;
    remarks?: string;
    effectiveDate?: string | Date | null;
  } | null;
  financialYear: string;
  onSaveSuccess: (savedRecord: any) => void;
  onDeleteSuccess: (deletedId: string) => void;
}

export function AssetDepreciationModal({
  isOpen,
  onClose,
  asset,
  financialYear,
  onSaveSuccess,
  onDeleteSuccess,
}: AssetDepreciationModalProps) {
  const [method, setMethod] = useState<"WDV" | "SLM">("WDV");
  const [rate, setRate] = useState<number>(15);
  const [amount, setAmount] = useState<number>(0);
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [remarks, setRemarks] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (asset) {
      setMethod(asset.method || "WDV");
      const defaultRate = asset.rateVal || (asset.method === "WDV" ? 15 : 10);
      setRate(defaultRate);
      setAmount(asset.currentYearDep || Math.round(asset.grossCost * (defaultRate / 100)));
      setEffectiveDate(
        asset.effectiveDate
          ? new Date(asset.effectiveDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
      );
      setRemarks(asset.remarks || "");
      setErrorMsg(null);
    }
  }, [asset]);

  if (!isOpen || !asset) return null;

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    // Auto-calculate suggested amount while preserving user's ability to adjust
    const suggested = Math.round(asset.grossCost * (newRate / 100));
    setAmount(suggested);
  };

  const handleSave = () => {
    if (amount < 0) {
      setErrorMsg("Depreciation amount cannot be negative.");
      return;
    }
    if (amount > asset.grossCost) {
      setErrorMsg("Depreciation cannot exceed the total capitalized gross cost of the asset.");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const res = await recordAssetDepreciationAction({
        expenseId: asset.id,
        financialYear,
        method,
        rate: Number(rate),
        depreciationAmount: Number(amount),
        effectiveDate,
        remarks,
      });

      if (res.success && res.data) {
        onSaveSuccess(res.data);
        onClose();
      } else {
        setErrorMsg(res.error || "Failed to record asset depreciation.");
      }
    });
  };

  const handleDelete = () => {
    if (!asset.recordedRecordId) return;
    if (!confirm("Are you sure you want to revert this asset to auto-computed depreciation?")) {
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const res = await deleteAssetDepreciationAction(asset.recordedRecordId!);
      if (res.success) {
        onDeleteSuccess(asset.recordedRecordId!);
        onClose();
      } else {
        setErrorMsg(res.error || "Failed to delete depreciation entry.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase tracking-wider">
                Schedule II &amp; IT Act
              </span>
              <span className="text-xs font-bold text-slate-500">{financialYear}</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 mt-1">
              Record / Adjust Asset Depreciation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Set statutory depreciation write-off for <strong>{asset.name}</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1 cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Asset Capitalization Profile */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Asset Category:</span>
            <span className="font-bold text-slate-800">{asset.category}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Capitalized Gross Cost (Block):</span>
            <span className="font-mono font-bold text-slate-900">
              {formatCurrency(asset.grossCost)}
            </span>
          </div>
          {asset.purchaseDate && (
            <div className="flex justify-between text-slate-600">
              <span>Acquisition / Put-to-Use Date:</span>
              <span className="font-mono text-slate-800">
                {new Date(asset.purchaseDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
          <div className="flex justify-between text-slate-600 pt-1.5 border-t border-slate-200/60">
            <span>Current Book Value (Pre-Adjustment):</span>
            <span className="font-mono font-extrabold text-emerald-800">
              {formatCurrency(asset.closingWdv)}
            </span>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-3.5 text-xs">
          {/* Method Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Depreciation Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod("WDV")}
                className={`py-2 px-3 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                  method === "WDV"
                    ? "bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>WDV (Written Down Value)</span>
                <span className="text-[10px] font-normal text-slate-500">
                  Income Tax Act Appendix I
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMethod("SLM")}
                className={`py-2 px-3 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                  method === "SLM"
                    ? "bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>SLM (Straight Line)</span>
                <span className="text-[10px] font-normal text-slate-500">
                  Companies Act Schedule II
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Rate % */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Depreciation Rate (% p.a.) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={rate}
                  onChange={(e) => handleRateChange(parseFloat(e.target.value) || 0)}
                  className="w-full h-[38px] border border-slate-300 rounded-xl px-3 pr-8 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
              </div>
            </div>

            {/* Current FY Amount */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Depreciation for {financialYear} (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full h-[38px] border border-slate-300 rounded-xl px-3 pl-7 text-xs font-mono font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-bold">₹</span>
              </div>
            </div>
          </div>

          {/* Date & Working Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Effective Entry Date
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full h-[38px] border border-slate-300 rounded-xl px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Statutory Working Remarks
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Full year depreciation under Sec 32"
                className="w-full h-[38px] border border-slate-300 rounded-xl px-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Statutory Double-Entry Audit Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-[11px] text-emerald-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <span>🏛️</span> Double-Entry Statutory Impact:
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-emerald-800">
              <li>
                <strong>P&amp;L Operating Expense:</strong> Depreciation expense will reflect as{" "}
                <strong>{formatCurrency(amount)}</strong> (EBITDA → EBIT deduction).
              </li>
              <li>
                <strong>Balance Sheet Fixed Assets:</strong> Net Block will be reduced by{" "}
                <strong>{formatCurrency(amount)}</strong>.
              </li>
              <li>
                Balance Sheet remains in 100% mathematical equilibrium (₹0.00 variance).
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <div>
            {asset.isCustomRecorded && asset.recordedRecordId && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="px-3.5 py-2 text-xs font-bold rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer transition-all disabled:opacity-50"
              >
                Revert to Auto-Compute
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="px-5 py-2 text-xs font-extrabold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isPending ? "Posting..." : "✓ Save & Post Depreciation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
