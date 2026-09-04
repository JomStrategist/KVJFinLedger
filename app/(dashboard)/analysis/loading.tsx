import React from "react";

export default function AnalysisLoading() {
  return (
    <div className="space-y-6 pb-16 animate-pulse">
      {/* Header Skeleton */}
      <div className="h-24 bg-white/80 rounded-2xl border border-slate-200/80 p-6 flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-6 w-80 bg-slate-200 rounded-lg"></div>
          <div className="h-4 w-96 bg-slate-100 rounded-lg"></div>
        </div>
        <div className="h-10 w-48 bg-slate-200 rounded-xl"></div>
      </div>

      {/* Slicers Skeleton */}
      <div className="h-32 bg-white/80 rounded-2xl border border-slate-200/80 p-5 space-y-4">
        <div className="h-5 w-40 bg-slate-200 rounded-md"></div>
        <div className="grid grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-xl"></div>
          ))}
        </div>
      </div>

      {/* Segmented Tabs Skeleton */}
      <div className="h-12 bg-slate-200/60 rounded-2xl p-1.5 flex gap-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-9 w-28 bg-slate-300/50 rounded-xl"></div>
        ))}
      </div>

      {/* KPI Grid Skeleton */}
      <div className="grid grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-28 bg-white/80 rounded-2xl border border-slate-200/80 p-5 space-y-3">
            <div className="h-3 w-24 bg-slate-200 rounded-md"></div>
            <div className="h-7 w-36 bg-slate-300 rounded-md"></div>
            <div className="h-4 w-full bg-slate-100 rounded-md"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
