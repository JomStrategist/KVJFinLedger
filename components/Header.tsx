"use client";

import React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getCurrentFinancialYear } from "@/lib/utils/financial-year";

export function Header({ user }: { user?: any }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeFy = searchParams?.get("fy") || getCurrentFinancialYear();

  const getBreadcrumbs = () => {
    if (!pathname) return [{ label: "Dashboard", href: "/dashboard" }];
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return [{ label: "Dashboard", href: "/dashboard" }];

    return segments.map((seg, idx) => {
      const href = "/" + segments.slice(0, idx + 1).join("/");
      const formatted = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
      return { label: formatted, href };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 shadow-xs print:hidden">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/dashboard" className="hover:text-emerald-700 transition-colors flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Home</span>
        </Link>
        {breadcrumbs.map((b, idx) => (
          <React.Fragment key={b.href}>
            <span className="text-slate-300">/</span>
            <Link
              href={b.href}
              className={`capitalize hover:text-emerald-700 transition-colors ${
                idx === breadcrumbs.length - 1 ? "font-bold text-slate-900" : ""
              }`}
            >
              {b.label}
            </Link>
          </React.Fragment>
        ))}
      </div>

      {/* Right: Quick Tools & Status */}
      <div className="flex items-center gap-3">
        {/* Global Search Pill */}
        <div className="hidden md:flex items-center gap-2 bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-400 font-medium cursor-pointer transition-all shadow-xs">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Search vouchers, accounts, invoices...</span>
          <kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-mono text-slate-500 shadow-xs">⌘K</kbd>
        </div>

        {/* Financial Year Tag */}
        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 px-3 py-1 rounded-xl text-xs font-bold font-tabular">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{activeFy}</span>
        </div>

        {/* Database Status */}
        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span className="hidden sm:inline">MongoDB Atlas</span>
        </div>
      </div>
    </header>
  );
}
