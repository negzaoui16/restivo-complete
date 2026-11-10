"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { StaffSectionId } from "../_lib/types";

export type Workplace = {
  name: string;
  city: string | null;
  coverUrl: string | null;
};

type StaffChrome = {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  section: StaffSectionId;
  setSection: (section: StaffSectionId) => void;
  search: string;
  setSearch: (value: string) => void;
  workplace: Workplace | null;
  workplaceReady: boolean;
  setWorkplace: (place: Workplace | null) => void;
};

const StaffChromeContext = createContext<StaffChrome | null>(null);

export function StaffChromeProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [section, setSection] = useState<StaffSectionId>("overview");
  const [search, setSearch] = useState("");
  const [workplace, setWorkplaceState] = useState<Workplace | null>(null);
  const [workplaceReady, setWorkplaceReady] = useState(false);
  const setWorkplace = useCallback((place: Workplace | null) => {
    setWorkplaceState(place);
    setWorkplaceReady(true);
  }, []);

  const value = useMemo(
    () => ({
      mobileOpen,
      setMobileOpen,
      section,
      setSection,
      search,
      setSearch,
      workplace,
      workplaceReady,
      setWorkplace,
    }),
    [mobileOpen, section, search, workplace, workplaceReady, setWorkplace]
  );

  return <StaffChromeContext.Provider value={value}>{children}</StaffChromeContext.Provider>;
}

export function useStaffChrome(): StaffChrome {
  const chrome = useContext(StaffChromeContext);
  if (!chrome) throw new Error("useStaffChrome must be used inside StaffChromeProvider.");
  return chrome;
}
