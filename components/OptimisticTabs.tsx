"use client";

import { useTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export interface TabOption {
  id: string;
  label: string;
}

export interface OptimisticTabsProps {
  basePath: string;
  searchParamName?: string;
  defaultTab: string;
  tabs: TabOption[];
}

export function OptimisticTabs({ basePath, searchParamName = "tab", defaultTab, tabs }: OptimisticTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serverTab = searchParams.get(searchParamName) || defaultTab;
  
  const [isPending, startTransition] = useTransition();
  const [optimisticTab, setOptimisticTab] = useState<string | null>(null);

  const activeTab = isPending && optimisticTab ? optimisticTab : serverTab;

  const handleTabChange = (tabId: string) => {
    setOptimisticTab(tabId);
    startTransition(() => {
      router.push(`${basePath}?${searchParamName}=${tabId}`);
    });
  };

  return (
    <div className="border-b border-[#D9E3DC] flex overflow-x-auto custom-scrollbar">
      <nav className="-mb-px flex space-x-8 min-w-max" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`
              whitespace-nowrap py-3 px-1 border-b-2 font-bold text-sm transition-all duration-150 flex items-center gap-2 cursor-pointer
              ${activeTab === tab.id
                ? 'border-[#177B55] text-[#177B55]'
                : 'border-transparent text-[#738078] hover:text-[#17211B] hover:border-[#D9E3DC]'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
