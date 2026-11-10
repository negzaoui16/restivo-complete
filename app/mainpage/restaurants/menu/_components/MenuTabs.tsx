"use client";

import { MENU_TABS, type MenuTab } from "../_lib/menu-ui";

export function MenuTabs({
  activeTab,
  onChange,
}: {
  activeTab: MenuTab;
  onChange: (tab: MenuTab) => void;
}) {
  return (
    <div className="flex gap-0 border-b border-[#E8E2D7] mb-3 overflow-x-auto scrollbar-hide">
      {MENU_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`relative px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
            activeTab === tab ? "text-[#B55234]" : "text-[#736D65] hover:text-[#1A1A1A]"
          }`}
        >
          {tab}
          {activeTab === tab && (
            <span className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-[#B55234] rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
