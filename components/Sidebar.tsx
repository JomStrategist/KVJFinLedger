"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { signOut } from "next-auth/react";

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )
  },
  {
    name: "Analysis",
    href: "/analysis",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    )
  },
  {
    name: "Ledgers",
    href: "/ledgers",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    )
  },
  {
    name: "Journals",
    href: "/journals",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    )
  },
  {
    name: "Invoices",
    href: "/invoices",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    name: "Expenses",
    href: "/expenses",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    name: "Bank Transfers",
    href: "/bank-transfers",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    )
  },
  {
    name: "Masters",
    href: "/masters",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  },
  {
    name: "Users & Roles",
    href: "/users",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  {
    name: "Reports",
    href: "/reports",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    name: "Opening / Closing",
    href: "/opening-closing",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    )
  },
  {
    name: "Settings",
    href: "/settings",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
];

export function Sidebar({ userRole, user }: { userRole?: string; user?: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem("sidebarCollapsed");
    if (stored === "true") {
      setIsCollapsed(true);
    }
  }, []);

  const [isPending, startTransition] = React.useTransition();
  const [optimisticHref, setOptimisticHref] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticHref(null);
  }, [pathname]);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", String(newState));
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (pathname === href) return;
    setOptimisticHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  const isItemActive = (href: string) => {
    const currentHref = (isPending || optimisticHref) && optimisticHref ? optimisticHref : pathname;
    if (href === "/dashboard") return currentHref === "/dashboard";
    if (href === "/journals") return currentHref.startsWith("/journals");
    if (href === "/invoices") return currentHref.startsWith("/invoices") || currentHref.startsWith("/proforma-invoices");
    if (href === "/finance") return currentHref.startsWith("/finance") || currentHref.startsWith("/revenue") || currentHref.startsWith("/ledger");
    if (href === "/expenses") return currentHref.startsWith("/expenses") || currentHref.startsWith("/expense-categories");
    if (href === "/opening-closing") return currentHref.startsWith("/opening-closing");
    if (href === "/users") return currentHref.startsWith("/users");
    return currentHref.startsWith(href);
  };

  const filteredNavItems = navItems.filter((item) => {
    if (item.name === "Settings" && userRole !== "ADMIN") return false;
    if (item.name === "Users & Roles" && userRole !== "ADMIN") return false;
    if (item.name === "Dashboard" && userRole !== "ADMIN") return false;
    return true;
  });

  if (userRole !== "ADMIN") {
    filteredNavItems.unshift({
      name: "Home",
      href: "/home",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    });
  }

  // Width management
  const sidebarWidth = !isMounted ? "w-64" : (isCollapsed ? "w-20" : "w-64");

  return (
    <aside 
      className={`bg-slate-900/90 backdrop-blur-2xl border-r border-slate-700/40 text-slate-100 min-h-screen flex flex-col transition-all duration-300 ease-in-out relative z-20 shrink-0 print:hidden shadow-2xl ${sidebarWidth}`}
    >
      {/* Brand & Collapse Header */}
      <div className={`flex items-center pt-5 pb-4 border-b border-slate-800/80 ${isCollapsed ? "flex-col gap-3 px-2 justify-center" : "justify-between px-4"}`}>
        {!isCollapsed ? (
          <div className="flex items-center gap-3 px-1 transition-opacity duration-300">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center shrink-0">
              <div className="h-full w-full bg-slate-950 rounded-[14px] p-1.5 flex items-center justify-center backdrop-blur-md">
                <img src="/finledger-icon.png" alt="FinLedger" className="h-full w-full object-contain" />
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-black tracking-tight text-white flex items-center gap-1.5 font-sans">
                FinLedger
                <span className="text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">ERP</span>
              </span>
              <span className="text-[10px] font-medium text-slate-400 truncate">Financial Management</span>
            </div>
          </div>
        ) : (
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center shrink-0 mb-1">
            <div className="h-full w-full bg-slate-950 rounded-[14px] p-1.5 flex items-center justify-center">
              <img src="/finledger-icon.png" alt="FinLedger" className="h-full w-full object-contain" />
            </div>
          </div>
        )}

        <button 
          onClick={toggleSidebar} 
          className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white focus:outline-none transition-colors border border-transparent hover:border-white/10"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      
      {/* Navigation List */}
      <nav className="flex-1 px-2.5 py-4 overflow-y-auto space-y-1">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const active = isItemActive(item.href);
            return (
              <li key={item.name} className="relative group">
                <Link
                  href={item.href}
                  prefetch={true}
                  onClick={(e) => handleLinkClick(e, item.href)}
                  className={`flex items-center rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isCollapsed ? "justify-center p-2.5" : "px-3 py-2.5"
                  } ${
                    active
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-950/50 backdrop-blur-md"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-100 hover:border hover:border-white/5"
                  }`}
                >
                  <span className={`${active ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"} flex-shrink-0 transition-colors`}>
                    {item.icon}
                  </span>
                  
                  {/* Expanded text */}
                  {!isCollapsed && (
                    <span className="ml-3 truncate tracking-normal font-sans">{item.name}</span>
                  )}
                </Link>

                {/* Tooltip for Collapsed Sidebar */}
                {isCollapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-medium rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap border border-slate-700/60 backdrop-blur-xl pointer-events-none">
                    {item.name}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900"></div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Left Panel Bottom - User Profile & Logout */}
      <div className="border-t border-white/10 p-3 bg-black/20 backdrop-blur-md shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 border border-emerald-300/30 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
                {user?.name?.[0] || 'J'}
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'Jomon Joseph'}</p>
                <p className="text-[10px] font-semibold text-emerald-300/80 tracking-wider uppercase truncate">
                  {(user as any)?.role || userRole || 'ADMIN'}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 border border-rose-500/20 transition-all shrink-0 flex items-center gap-1 shadow-sm"
              title="Logout"
            >
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1 relative group">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 border border-emerald-300/30 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {user?.name?.[0] || 'J'}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-1.5 rounded-lg text-rose-300 hover:text-white hover:bg-rose-500/20 border border-rose-500/20 transition-all"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#090D16] text-white text-xs font-semibold rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap border border-emerald-500/20 pointer-events-none">
              {user?.name || 'Jomon Joseph'} ({(user as any)?.role || userRole || 'ADMIN'})
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
