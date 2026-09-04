import React from "react";

export default function LedgersLoading() {
  return (
    <div className="space-y-6 pb-16 animate-pulse">
      {/* Header Skeleton */}
      <div className="h-24 bg-white/80 rounded-2xl border border-slate-200/80 p-6 flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-6 w-80 bg-slate-200 rounded-lg"></div>
          <div className="h-4 w-96 bg-slate-100 rounded-lg"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-28 bg-slate-200 rounded-xl"></div>
          <div className="h-10 w-28 bg-slate-200 rounded-xl"></div>
        </div>
      </div>

      {/* Account Selector Skeleton */}
      <div className="h-24 bg-white/80 rounded-2xl border border-slate-200/80 p-5 grid grid-cols-4 gap-4">
        <div className="col-span-2 h-10 bg-slate-100 rounded-xl"></div>
        <div className="h-10 bg-slate-100 rounded-xl"></div>
        <div className="h-10 bg-slate-100 rounded-xl"></div>
      </div>

      {/* Summary KPI Skeleton */}
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-white/80 rounded-2xl border border-slate-200/80 p-5 space-y-2">
            <div className="h-3 w-24 bg-slate-200 rounded-md"></div>
            <div className="h-7 w-32 bg-slate-300 rounded-md"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
