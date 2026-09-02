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

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", String(newState));
  };

  const handleLinkClick = (href: string) => {
    setOptimisticHref(href);
  };

  const isItemActive = (href: string) => {
    const currentHref = isPending && optimisticHref ? optimisticHref : pathname;
    if (href === "/dashboard") return currentHref === "/dashboard";
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
      style={{ backgroundColor: "#0F766E" }}
      className={`text-white min-h-screen flex flex-col transition-all duration-300 ease-in-out relative z-20 shrink-0 print:hidden ${sidebarWidth}`}
    >
      {/* Brand & Collapse Header */}
      <div className={`flex items-center pt-5 pb-4 border-b border-white/10 ${isCollapsed ? "flex-col gap-3 px-2 justify-center" : "justify-between px-4"}`}>
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 transition-opacity duration-300">
            <div className="h-10 w-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm shrink-0 border border-white/20">
              <img src="/kvj-logo.png" alt="KVJ Analytics" className="h-full w-full object-contain" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-bold text-white tracking-tight">KVJ Analytics</div>
              <div className="text-[11px] text-white/70 font-medium">Financial Management</div>
            </div>
          </div>
        ) : (
          <div className="h-9 w-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm shrink-0 border border-white/20 mb-1">
            <img src="/kvj-logo.png" alt="KVJ Analytics" className="h-full w-full object-contain" />
          </div>
        )}

        <button 
          onClick={toggleSidebar} 
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white focus:outline-none transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      
      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1.5">
          {filteredNavItems.map((item) => {
            const active = isItemActive(item.href);
            return (
              <li key={item.name} className="relative group">
                <Link
                  href={item.href}
                  onClick={() => handleLinkClick(item.href)}
                  className={`flex items-center rounded-lg text-sm transition-all duration-150 ${
                    isCollapsed ? "justify-center p-3" : "px-3 py-2.5"
                  } ${
                    active
                      ? "bg-white/20 text-white font-semibold shadow-sm"
                      : "text-white/80 hover:bg-white/10 hover:text-white font-medium"
                  }`}
                >
                  <span className={`${active ? "text-white" : "text-white/80 group-hover:text-white"} flex-shrink-0 transition-colors`}>
                    {item.icon}
                  </span>
                  
                  {/* Expanded text */}
                  {!isCollapsed && (
                    <span className="ml-3 truncate">{item.name}</span>
                  )}
                </Link>

                {/* Tooltip for Collapsed Sidebar */}
                {isCollapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#17211B] text-white text-xs font-semibold rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap border border-white/10 pointer-events-none">
                    {item.name}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#17211B]"></div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Left Panel Bottom - User Profile & Logout */}
      <div className="border-t border-white/15 p-3 bg-black/15 shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-full bg-emerald-800 border border-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                {user?.name?.[0] || 'J'}
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'Jomon Joseph'}</p>
                <p className="text-[10px] font-semibold text-emerald-200/80 tracking-wider uppercase truncate">
                  {(user as any)?.role || userRole || 'ADMIN'}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-2 py-1 rounded-md text-xs font-semibold text-red-200 hover:text-white hover:bg-red-600/30 border border-red-400/20 transition-colors shrink-0 flex items-center gap-1"
              title="Logout"
            >
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1 relative group">
            <div className="h-9 w-9 rounded-full bg-emerald-800 border border-white/20 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {user?.name?.[0] || 'J'}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-1.5 rounded-md text-red-200 hover:text-white hover:bg-red-600/30 border border-red-400/20 transition-colors"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#17211B] text-white text-xs font-semibold rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap border border-white/10 pointer-events-none">
              {user?.name || 'Jomon Joseph'} ({(user as any)?.role || userRole || 'ADMIN'})
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
