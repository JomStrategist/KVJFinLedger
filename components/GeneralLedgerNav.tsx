"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface GeneralLedgerTab {
  href: string;
  label: string;
}

const GL_TABS: GeneralLedgerTab[] = [
  { href: "/ledgers", label: "Account Ledgers" },
  { href: "/journals", label: "Journal Vouchers" },
  { href: "/opening-closing", label: "Fiscal Opening & Closing" },
];

export function GeneralLedgerNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-[#D9E3DC] flex overflow-x-auto custom-scrollbar">
      <nav className="-mb-px flex space-x-8 min-w-max" aria-label="General Ledger Subnavigation">
        {GL_TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                whitespace-nowrap py-3 px-1 border-b-2 font-bold text-sm transition-all duration-150 flex items-center gap-2 cursor-pointer
                ${isActive
                  ? "border-[#177B55] text-[#177B55]"
                  : "border-transparent text-[#738078] hover:text-[#17211B] hover:border-[#D9E3DC]"
                }
              `}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
