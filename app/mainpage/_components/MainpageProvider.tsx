"use client";

/**
 * Shared chrome state for all /mainpage/* routes.
 *
 * Lives in the layout so the sidebar, top nav, search query and mobile
 * drawer survive navigations — only the page body remounts.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

interface MainpageContextValue {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  mobileMenuOpen: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
}

const MainpageContext = createContext<MainpageContextValue | null>(null);

export function MainpageProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const openMobileMenu = useCallback(() => setMobileMenuOpen(true), []);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const value = useMemo(
    () => ({
      searchQuery,
      setSearchQuery,
      mobileMenuOpen,
      openMobileMenu,
      closeMobileMenu,
    }),
    [searchQuery, mobileMenuOpen, openMobileMenu, closeMobileMenu]
  );

  return (
    <MainpageContext.Provider value={value}>{children}</MainpageContext.Provider>
  );
}

export function useMainpage(): MainpageContextValue {
  const ctx = useContext(MainpageContext);
  if (!ctx) {
    throw new Error("useMainpage must be used inside <MainpageProvider>.");
  }
  return ctx;
}
