"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiListRestaurants } from "@/lib/restaurants/client";
import type { PublicRestaurant } from "@/lib/restaurants/serialize";

export interface ManagedRestaurant {
  id: string;
  name: string;
  location: string;
  city: string;
  address?: string;
  country?: string;
  postalCode?: string;
  cuisine: string;
  role: string;
  status: "Open" | "Closed" | "Break";
  image: string;
  logoUrl?: string | null;
  /** The stored cover link; `image` falls back to a built-in photo when it is empty. */
  coverUrl?: string | null;
  priceLevel?: number | null;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  currency?: string;
  timezone?: string;
  tablesCount: number;
  capacity: number;
  floorsCount: number;
  rating: number;
  slug: string;
  dbStatus: PublicRestaurant["status"];
  createdAt?: string | null;
}

export function toManagedRestaurant(row: PublicRestaurant): ManagedRestaurant {
  const location =
    [row.address, row.city, row.country].filter(Boolean).join(", ") ||
    row.city ||
    "Tunis, Tunisia";

  return {
    id: row.id,
    name: row.name,
    location,
    city: row.city ?? "Tunis",
    address: row.address ?? "",
    country: row.country ?? "Tunisia",
    cuisine: row.cuisine ?? "",
    role: row.role === "OWNER" ? "Owner" : "Manager",
    status: row.status === "ACTIVE" ? "Open" : "Closed",
    image: row.coverUrl || "/images/restaurant-ambient.jpg",
    logoUrl: row.logoUrl || null,
    coverUrl: row.coverUrl || null,
    priceLevel: row.priceLevel ?? null,
    description: row.description ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    website: row.website ?? "",
    currency: row.currency || "TND",
    timezone: row.timezone || "Africa/Tunis",
    tablesCount: row.tablesCount || 20,
    capacity: row.capacity || 80,
    floorsCount: row.floorsCount || 1,
    rating: 4.8,
    slug: row.slug,
    dbStatus: row.status,
    createdAt: row.createdAt || "2024-01-01",
  };
}

interface RestaurantManagerContextType {
  restaurants: ManagedRestaurant[];
  currentRestaurant: ManagedRestaurant | null;
  setCurrentRestaurant: (rest: ManagedRestaurant) => void;
  upsertRestaurant: (rest: ManagedRestaurant) => void;
  updateRestaurantProfile: (id: string, updates: Partial<ManagedRestaurant>) => void;
  isLoadingRestaurants: boolean;
  /** Set when the restaurant list could not be loaded; `reloadRestaurants` tries again. */
  loadError: string | null;
  reloadRestaurants: () => void;
  isAddRestaurantOpen: boolean;
  setIsAddRestaurantOpen: (open: boolean) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  profileModalRestaurant: ManagedRestaurant | null;
  setProfileModalRestaurant: (rest: ManagedRestaurant | null) => void;
  openRestaurantProfile: (rest?: ManagedRestaurant | null) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  activeNavTab: string;
  setActiveNavTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  restaurantStatus: "Open" | "Closed" | "Break";
  setRestaurantStatus: (status: "Open" | "Closed" | "Break") => void;
}

const RestaurantManagerContext = createContext<RestaurantManagerContextType | null>(null);

const EMPTY: RestaurantManagerContextType = {
  restaurants: [],
  currentRestaurant: null,
  setCurrentRestaurant: () => {},
  upsertRestaurant: () => {},
  updateRestaurantProfile: () => {},
  isLoadingRestaurants: false,
  loadError: null,
  reloadRestaurants: () => {},
  isAddRestaurantOpen: false,
  setIsAddRestaurantOpen: () => {},
  isProfileModalOpen: false,
  setIsProfileModalOpen: () => {},
  profileModalRestaurant: null,
  setProfileModalRestaurant: () => {},
  openRestaurantProfile: () => {},
  mobileMenuOpen: false,
  setMobileMenuOpen: () => {},
  activeNavTab: "overview",
  setActiveNavTab: () => {},
  searchQuery: "",
  setSearchQuery: () => {},
  restaurantStatus: "Open",
  setRestaurantStatus: () => {},
};

export function RestaurantManagerProvider({ children }: { children: React.ReactNode }) {
  const { user, isReady, getAccessToken } = useAuth();
  const [restaurants, setRestaurants] = useState<ManagedRestaurant[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reloadRestaurants = useCallback(() => setReloadKey((key) => key + 1), []);
  const [isAddRestaurantOpen, setIsAddRestaurantOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalRestaurant, setProfileModalRestaurant] = useState<ManagedRestaurant | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [restaurantStatus, setRestaurantStatus] = useState<"Open" | "Closed" | "Break">("Open");

  const currentRestaurant = useMemo(
    () => restaurants.find((row) => row.id === currentId) ?? restaurants[0] ?? null,
    [restaurants, currentId]
  );

  useEffect(() => {
    if (!isReady) return;
    if (!user?.canManageRestaurants) {
      setRestaurants([]);
      setCurrentId(null);
      setIsLoadingRestaurants(false);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setRestaurants([]);
      setCurrentId(null);
      setLoadError("Your session expired. Sign in again.");
      setIsLoadingRestaurants(false);
      return;
    }

    let cancelled = false;
    setIsLoadingRestaurants(true);
    setLoadError(null);

    apiListRestaurants(token)
      .then((rows) => {
        if (cancelled) return;
        const finalList = rows.map(toManagedRestaurant);
        setRestaurants(finalList);
        setCurrentId((prev) => {
          if (prev && finalList.some((row) => row.id === prev)) return prev;
          return finalList[0]?.id ?? null;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setRestaurants([]);
          setCurrentId(null);
          setLoadError("Could not load your restaurants.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRestaurants(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isReady, user?.canManageRestaurants, user?.id, getAccessToken, reloadKey]);

  const setCurrentRestaurant = useCallback((rest: ManagedRestaurant) => {
    setCurrentId(rest.id);
  }, []);

  const upsertRestaurant = useCallback((rest: ManagedRestaurant) => {
    setRestaurants((prev) => [rest, ...prev.filter((row) => row.id !== rest.id)]);
    setCurrentId(rest.id);
  }, []);

  const updateRestaurantProfile = useCallback((id: string, updates: Partial<ManagedRestaurant>) => {
    setRestaurants((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...updates } : row))
    );
    setProfileModalRestaurant((prev) =>
      prev?.id === id ? { ...prev, ...updates } : prev
    );
  }, []);

  const openRestaurantProfile = useCallback(
    (rest?: ManagedRestaurant | null) => {
      const target = rest ?? currentRestaurant ?? restaurants[0] ?? null;
      setProfileModalRestaurant(target);
      setIsProfileModalOpen(true);
    },
    [currentRestaurant, restaurants]
  );

  return (
    <RestaurantManagerContext.Provider
      value={{
        restaurants,
        currentRestaurant,
        setCurrentRestaurant,
        upsertRestaurant,
        updateRestaurantProfile,
        isLoadingRestaurants,
        loadError,
        reloadRestaurants,
        isAddRestaurantOpen,
        setIsAddRestaurantOpen,
        isProfileModalOpen,
        setIsProfileModalOpen,
        profileModalRestaurant,
        setProfileModalRestaurant,
        openRestaurantProfile,
        mobileMenuOpen,
        setMobileMenuOpen,
        activeNavTab,
        setActiveNavTab,
        searchQuery,
        setSearchQuery,
        restaurantStatus,
        setRestaurantStatus,
      }}
    >
      {children}
    </RestaurantManagerContext.Provider>
  );
}

export function useRestaurantManager() {
  const ctx = useContext(RestaurantManagerContext);
  return ctx ?? EMPTY;
}
