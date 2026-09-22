"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAvailableFinancialYears } from "@/lib/utils/financial-year";

interface Props {
  currentFy: string;
}

export function DashboardFYSelect({ currentFy }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const fyOptions = getAvailableFinancialYears();

  const handleFyChange = (newFy: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (newFy === "ALL") {
        params.set("fy", "ALL");
        params.delete("from");
        params.delete("to");
      } else {
        params.set("fy", newFy);
        params.delete("from");
        params.delete("to");
      }
      router.push(`/dashboard?${params.toString()}`);
    });
  };

  return (
    <div className="relative inline-flex items-center">
      <select
        value={currentFy}
        disabled={isPending}
        onChange={(e) => handleFyChange(e.target.value)}
        className={`appearance-none bg-white text-slate-800 text-xs font-bold font-tabular border border-emerald-300/80 rounded-xl pl-8 pr-8 py-2 shadow-xs hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-pointer ${
          isPending ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        {fyOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Calendar Icon */}
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-emerald-600">
        {isPending ? (
          <svg className="w-3.5 h-3.5 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>

      {/* Chevron */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-500">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
