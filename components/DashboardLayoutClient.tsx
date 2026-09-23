"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export function DashboardLayoutClient({
  children,
  user,
  userRole,
}: {
  children: React.ReactNode;
  user?: any;
  userRole?: string;
}) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen bg-theme-bg text-theme-text overflow-hidden relative">
      {/* Mobile Backdrop Overlay */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Responsive: Off-canvas on mobile, In-flow on desktop) */}
      <Sidebar
        userRole={userRole}
        user={user}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          user={user}
          onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)}
          isMobileNavOpen={isMobileNavOpen}
        />
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-3 sm:p-4 md:p-6 lg:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
