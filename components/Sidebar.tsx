"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect } from "react";
import { signOut } from "next-auth/react";

import {
  DashboardIcon,
  LedgersIcon,
  JournalIcon,
  InvoiceIcon,
  ExpenseIcon,
  EmployeesIcon,
  BankingIcon,
  MastersIcon,
  UsersIcon,
  ReportsIcon,
  OpeningClosingIcon,
  SettingsIcon,
  HomeIcon,
} from "./icons/SidebarIcons";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  subItems?: {
    name: string;
    href: string;
    icon: string;
  }[];
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: <DashboardIcon /> },
  { name: "Ledgers", href: "/ledgers", icon: <LedgersIcon /> },
  { name: "Journal", href: "/journals", icon: <JournalIcon /> },
  { name: "Invoice", href: "/invoices", icon: <InvoiceIcon /> },
  { name: "Expense", href: "/expenses", icon: <ExpenseIcon /> },
  { name: "Employees", href: "/expenses?tab=employees", icon: <EmployeesIcon /> },
  { name: "Banking & Cash", href: "/bank-transfers", icon: <BankingIcon /> },
  { name: "Masters", href: "/masters", icon: <MastersIcon /> },
  { name: "Users", href: "/users", icon: <UsersIcon /> },
  {
    name: "Reports",
    href: "/reports",
    icon: <ReportsIcon />,
    subItems: [
      { name: "Executive Reports", href: "/reports?category=overview", icon: "🏛️" },
      { name: "Financial Statements", href: "/reports?category=statements", icon: "⚖️" },
      { name: "Sales & Receivables", href: "/reports?category=sales", icon: "📈" },
      { name: "Expenses & Payables", href: "/reports?category=expenses", icon: "📉" },
      { name: "GST & Tax", href: "/reports?category=gst", icon: "📑" },
      { name: "TDS", href: "/reports?category=tds", icon: "🏷️" },
      { name: "Banking & Cash", href: "/reports?category=banking", icon: "🏦" },
      { name: "Fixed Assets", href: "/reports?category=assets", icon: "🏢" },
      { name: "Employees & Salary", href: "/reports?category=employees", icon: "👥" },
      { name: "Analysis", href: "/reports?category=analysis", icon: "💡" },
      { name: "Audit", href: "/reports?category=audit", icon: "🔍" },
    ]
  },
  { name: "Opening/Closing", href: "/opening-closing", icon: <OpeningClosingIcon /> },
  { name: "Settings", href: "/settings", icon: <SettingsIcon /> }
];

export function Sidebar({
  userRole,
  user,
  isMobileOpen = false,
  onCloseMobile,
}: {
  userRole?: string;
  user?: any;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [isPending, startTransition] = React.useTransition();
  const [optimisticHref, setOptimisticHref] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem("sidebarCollapsed");
    if (stored === "true") {
      setIsCollapsed(true);
    }
  }, []);

  useEffect(() => {
    setOptimisticHref(null);
  }, [pathname, searchParams]);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", String(newState));
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    onCloseMobile?.();
    setOptimisticHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  const [reportsExpanded, setReportsExpanded] = useState(true);

  useEffect(() => {
    if (pathname.startsWith("/reports")) {
      setReportsExpanded(true);
    }
  }, [pathname]);

  const isSubItemActive = (href: string) => {
    if (!pathname.startsWith("/reports")) return false;
    
    // Check optimistic destination during transition
    const currentCategory = searchParams?.get("category") || searchParams?.get("subtab") || "overview";
    
    let targetCategory: string | null = null;
    try {
      const url = new URL(href, "http://localhost");
      targetCategory = url.searchParams.get("category") || url.searchParams.get("subtab");
    } catch {
      targetCategory = href.split("category=")[1]?.split("&")[0] || href.split("subtab=")[1]?.split("&")[0] || null;
    }

    if (optimisticHref && optimisticHref === href) return true;

    if (targetCategory === currentCategory) return true;

    return false;
  };

  const isItemActive = (href: string) => {
    const currentHref = (isPending || optimisticHref) && optimisticHref ? optimisticHref : pathname;
    if (href === "/dashboard") return currentHref === "/dashboard";
    if (href === "/ledgers") return currentHref.startsWith("/ledgers");
    if (href === "/journals") return currentHref.startsWith("/journals");
    if (href === "/invoices") return currentHref.startsWith("/invoices") || currentHref.startsWith("/proforma-invoices");
    if (href === "/expenses?tab=employees") {
      return (currentHref.startsWith("/expenses") && searchParams?.get("tab") === "employees") || (currentHref.startsWith("/masters") && searchParams?.get("tab") === "employees");
    }
    if (href === "/expenses") {
      return (currentHref.startsWith("/expenses") && searchParams?.get("tab") !== "employees") || currentHref.startsWith("/expense-categories");
    }
    if (href === "/bank-transfers") return currentHref.startsWith("/bank-transfers");
    if (href === "/masters") return currentHref.startsWith("/masters") || currentHref.startsWith("/customers") || currentHref.startsWith("/vendors");
    if (href === "/users") return currentHref.startsWith("/users");
    if (href === "/reports") return currentHref.startsWith("/reports") || currentHref.startsWith("/financial-statements");
    if (href === "/opening-closing") return currentHref.startsWith("/opening-closing");
    if (href === "/settings") return currentHref.startsWith("/settings");
    return currentHref.startsWith(href);
  };

  const filteredNavItems = navItems.filter((item) => {
    if (item.name === "Settings" && userRole !== "ADMIN") return false;
    if (item.name === "Users" && userRole !== "ADMIN") return false;
    if (item.name === "Dashboard" && userRole !== "ADMIN") return false;
    return true;
  });

  if (userRole !== "ADMIN") {
    filteredNavItems.unshift({
      name: "Home",
      href: "/home",
      icon: <HomeIcon />
    });
  }

  // Width management
  const sidebarWidth = !isMounted ? "w-64" : (isCollapsed ? "w-20" : "w-64");

  return (
    <>
      {/* 1. Desktop In-Flow Sidebar */}
      <aside 
        className={`hidden md:flex bg-[#0A120E] border-r border-[#1B2B23] text-slate-100 min-h-screen flex-col transition-all duration-300 ease-in-out relative z-20 shrink-0 print:hidden shadow-2xl ${sidebarWidth}`}
      >
        {/* Brand & Collapse Header */}
        <div className={`flex items-center pt-5 pb-4 border-b border-[#16251E] ${isCollapsed ? "flex-col gap-3 px-2 justify-center" : "justify-between px-4"}`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3 px-1 transition-opacity duration-300">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-300 p-0.5 shadow-lg shadow-emerald-950/60 flex items-center justify-center shrink-0">
                <div className="h-full w-full bg-[#06100B] rounded-[14px] p-1.5 flex items-center justify-center">
                  <img src="/finledger-icon.png" alt="FinLedger" className="h-full w-full object-contain" />
                </div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-black tracking-tight text-white flex items-center gap-1.5 font-sans">
                  FinLedger
                  <span className="text-[9px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    ERP
                  </span>
                </span>
                <span className="text-[10px] font-medium text-[#8EA699] truncate">Financial Management</span>
              </div>
            </div>
          ) : (
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-300 p-0.5 shadow-lg shadow-emerald-950/60 flex items-center justify-center shrink-0 mb-1">
              <div className="h-full w-full bg-[#06100B] rounded-[14px] p-1.5 flex items-center justify-center">
                <img src="/finledger-icon.png" alt="FinLedger" className="h-full w-full object-contain" />
              </div>
            </div>
          )}

          <button 
            onClick={toggleSidebar} 
            className="p-1.5 rounded-xl hover:bg-white/[0.08] text-[#8EA699] hover:text-white focus:outline-none transition-colors border border-transparent hover:border-white/10 cursor-pointer"
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
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
          <ul className="space-y-1">
            {filteredNavItems.map((item) => {
              const active = isItemActive(item.href);
              const hasSubItems = Boolean((item as any).subItems && (item as any).subItems.length > 0);
              const isExpanded = hasSubItems && reportsExpanded;

              return (
                <li key={item.name} className="relative group">
                  {hasSubItems ? (
                    <div>
                      {/* Main Accordion Header */}
                      <div
                        onClick={() => {
                          if (isCollapsed) {
                            setIsCollapsed(false);
                            setReportsExpanded(true);
                          } else {
                            setReportsExpanded(!reportsExpanded);
                          }
                        }}
                        className={`flex items-center justify-between rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                          isCollapsed ? "justify-center p-2.5" : "px-3.5 py-2.5"
                        } ${
                          active
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/70 border border-emerald-400/40"
                            : "text-[#9EB5A9] hover:bg-white/[0.06] hover:text-white"
                        }`}
                      >
                        <div className="flex items-center min-w-0">
                          <span className="flex-shrink-0 transition-colors">
                            {item.icon}
                          </span>
                          {!isCollapsed && (
                            <span className="ml-3 truncate tracking-normal font-sans font-semibold text-[13px]">{item.name}</span>
                          )}
                        </div>
                        {!isCollapsed && (
                          <span className="ml-2 text-slate-400 text-[10px] select-none">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        )}
                      </div>

                      {/* Sub-Items Indented List */}
                      {!isCollapsed && isExpanded && (
                        <ul className="mt-1 space-y-0.5 pl-2 animate-in fade-in duration-150">
                          {((item as any).subItems as Array<{ name: string; href: string; icon: string }>).map((sub) => {
                            const isSubActive = isSubItemActive(sub.href);
                            return (
                              <li key={sub.name}>
                                <Link
                                  href={sub.href}
                                  prefetch={true}
                                  onClick={(e) => handleLinkClick(e, sub.href)}
                                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] transition-all duration-150 ${
                                    isSubActive
                                      ? "bg-emerald-500/30 text-white font-extrabold border-l-[3px] border-emerald-400 pl-2.5 shadow-xs"
                                      : "text-[#8EA699] hover:text-white hover:bg-white/[0.05] font-medium"
                                  }`}
                                >
                                  <span className="text-sm shrink-0">{sub.icon}</span>
                                  <span className="truncate">{sub.name}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      prefetch={true}
                      onClick={(e) => handleLinkClick(e, item.href)}
                      className={`flex items-center rounded-xl text-xs font-bold transition-all duration-200 ${
                        isCollapsed ? "justify-center p-2.5" : "px-3.5 py-2.5"
                      } ${
                        active
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/70 border border-emerald-400/40"
                          : "text-[#9EB5A9] hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <span className={`${active ? "text-white" : "text-[#80998C] group-hover:text-white"} flex-shrink-0 transition-colors`}>
                        {item.icon}
                      </span>
                      
                      {/* Expanded text */}
                      {!isCollapsed && (
                        <span className="ml-3 truncate tracking-normal font-sans font-semibold text-[13px]">{item.name}</span>
                      )}
                    </Link>
                  )}

                  {/* Tooltip for Collapsed Sidebar */}
                  {isCollapsed && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#06100B] text-white text-xs font-semibold rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap border border-[#1B2B23] pointer-events-none">
                      {item.name}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#06100B]"></div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Left Panel Bottom - User Profile & Logout */}
        <div className="border-t border-[#16251E] p-3.5 bg-[#070D0A] shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 border border-emerald-400/30 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                  {user?.name?.[0] || 'J'}
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="text-xs font-bold text-white truncate">{user?.name || 'Jomon Joseph'}</p>
                  <p className="text-[10px] font-bold text-emerald-400/90 tracking-wider uppercase truncate">
                    {(user as any)?.role || userRole || 'ADMIN'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-rose-600/30 border border-white/10 hover:border-rose-500/40 transition-all shrink-0 shadow-xs cursor-pointer"
                title="Logout"
              >
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1 relative group">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 border border-emerald-400/30 flex items-center justify-center text-white font-black text-sm shadow-md">
                {user?.name?.[0] || 'J'}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="p-2 rounded-xl text-slate-300 hover:text-white bg-white/[0.05] hover:bg-rose-600/30 border border-white/10 hover:border-rose-500/40 transition-all cursor-pointer"
                title="Logout"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#06100B] text-white text-xs font-semibold rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap border border-[#1B2B23] pointer-events-none">
                {user?.name || 'Jomon Joseph'} ({(user as any)?.role || userRole || 'ADMIN'})
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 2. Mobile Off-Canvas Drawer */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0A120E] border-r border-[#1B2B23] text-slate-100 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile Header with Close Button */}
        <div className="flex items-center justify-between pt-5 pb-4 px-4 border-b border-[#16251E]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-300 p-0.5 shadow-lg shadow-emerald-950/60 flex items-center justify-center shrink-0">
              <div className="h-full w-full bg-[#06100B] rounded-[14px] p-1.5 flex items-center justify-center">
                <img src="/finledger-icon.png" alt="FinLedger" className="h-full w-full object-contain" />
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-black tracking-tight text-white flex items-center gap-1.5 font-sans">
                FinLedger
                <span className="text-[9px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  ERP
                </span>
              </span>
              <span className="text-[10px] font-medium text-[#8EA699] truncate">Financial Management</span>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="p-2 rounded-xl text-[#8EA699] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1 custom-scrollbar">
          <ul className="space-y-1">
            {filteredNavItems.map((item) => {
              const active = isItemActive(item.href);
              const hasSubItems = Boolean((item as any).subItems && (item as any).subItems.length > 0);
              const isExpanded = hasSubItems && reportsExpanded;

              return (
                <li key={item.name}>
                  {hasSubItems ? (
                    <div>
                      <div
                        onClick={() => setReportsExpanded(!reportsExpanded)}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                          active
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/70 border border-emerald-400/40"
                            : "text-[#9EB5A9] hover:bg-white/[0.06] hover:text-white"
                        }`}
                      >
                        <div className="flex items-center min-w-0">
                          <span className="flex-shrink-0">
                            {item.icon}
                          </span>
                          <span className="ml-3 font-sans font-semibold text-[13px]">{item.name}</span>
                        </div>
                        <span className="text-slate-400 text-[10px]">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>

                      {/* Mobile Sub-Items */}
                      {isExpanded && (
                        <ul className="mt-1 space-y-0.5 pl-2">
                          {((item as any).subItems as Array<{ name: string; href: string; icon: string }>).map((sub) => {
                            const isSubActive = isSubItemActive(sub.href);
                            return (
                              <li key={sub.name}>
                                <Link
                                  href={sub.href}
                                  prefetch={true}
                                  onClick={(e) => handleLinkClick(e, sub.href)}
                                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] transition-all duration-150 ${
                                    isSubActive
                                      ? "bg-emerald-500/30 text-white font-extrabold border-l-[3px] border-emerald-400 pl-2.5 shadow-xs"
                                      : "text-[#8EA699] hover:text-white hover:bg-white/[0.05] font-medium"
                                  }`}
                                >
                                  <span className="text-sm shrink-0">{sub.icon}</span>
                                  <span className="truncate">{sub.name}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      prefetch={true}
                      onClick={(e) => handleLinkClick(e, item.href)}
                      className={`flex items-center px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                        active
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/70 border border-emerald-400/40"
                          : "text-[#9EB5A9] hover:bg-white/[0.06] hover:text-white"
                      }`}
                    >
                      <span className={`${active ? "text-white" : "text-[#80998C]"} flex-shrink-0`}>
                        {item.icon}
                      </span>
                      <span className="ml-3 font-sans font-semibold text-[13px]">{item.name}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Mobile Drawer Footer User Profile */}
        <div className="border-t border-[#16251E] p-4 bg-[#070D0A] shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 border border-emerald-400/30 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                {user?.name?.[0] || 'J'}
              </div>
              <div className="min-w-0 leading-tight">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'Jomon Joseph'}</p>
                <p className="text-[10px] font-bold text-emerald-400/90 tracking-wider uppercase truncate">
                  {(user as any)?.role || userRole || 'ADMIN'}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-rose-600/30 border border-white/10 hover:border-rose-500/40 transition-all shrink-0 shadow-xs cursor-pointer"
            >
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
