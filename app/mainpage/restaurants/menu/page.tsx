"use client";

import { RestaurantLoadError } from "../_components/RestaurantLoadError";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { ApiError, useAuth } from "@/contexts/AuthContext";
import { useRestaurantManager } from "../_context/RestaurantManagerContext";
import type { PublicMenu, PublicMenuItem } from "@/lib/menu/types";
import { priceMinor } from "@/lib/orders/pricing";
import {
  apiCreateCategory,
  apiCreateItem,
  apiCreateMenu,
  apiCreatePromotion,
  apiDeleteCategory,
  apiDeleteItem,
  apiDeletePromotion,
  apiGetMenu,
  apiMoveCategory,
  apiMoveItem,
  apiUpdateCategory,
  apiUpdateItem,
  apiUpdateMenu,
  apiUpdatePromotion,
} from "@/lib/menu/client";
import type { FilterKey, MenuTab, SortKey } from "./_lib/menu-ui";
import { MenuHeader } from "./_components/MenuHeader";
import { MenuTabs } from "./_components/MenuTabs";
import { MenuFilterBar } from "./_components/MenuFilterBar";
import { CategoriesSidebar } from "./_components/CategoriesSidebar";
import { MenuTable } from "./_components/MenuTable";
import { AddMenuItemPanel } from "./_components/AddMenuItemPanel";
import { CategoriesManager } from "./_components/CategoriesManager";
import { PromotionsPanel } from "./_components/PromotionsPanel";
import { MenuSettingsPanel } from "./_components/MenuSettingsPanel";
import { MenuPreview } from "./_components/MenuPreview";
import { MenuBookDialog } from "@/app/mainpage/_components/book/MenuBookDialog";
import { previewBookMenu } from "@/lib/menu/preview-view";
import {
  saveMenuToLocalCache,
  getCachedMenu,
  precacheAllMenu3DModels,
  useNetworkStatus,
} from "@/lib/offline/offline-manager";

export default function MenuPage() {
  const router = useRouter();
  const { user, isReady, getAccessToken } = useAuth();
  const { isOnline } = useNetworkStatus();
  const { currentRestaurant, isLoadingRestaurants, setIsAddRestaurantOpen, loadError, reloadRestaurants } =
    useRestaurantManager();

  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [usingOfflineCache, setUsingOfflineCache] = useState(false);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Request field the server blames for `error`, so forms can show it under that field.
  const [errorField, setErrorField] = useState<string | null>(null);
  const [emptyPublishAsk, setEmptyPublishAsk] = useState(false);
  const [activeTab, setActiveTab] = useState<MenuTab>("Items");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PublicMenuItem | null>(null);
  const [openDropdown, setOpenDropdown] = useState<FilterKey | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("featured");
  const [filterAvailability, setFilterAvailability] = useState("all");
  const [filterPromotion, setFilterPromotion] = useState("all");
  const [filterPrice, setFilterPrice] = useState("all");
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAROpen, setPreviewAROpen] = useState(false);

  const restaurantId = currentRestaurant?.id;
  const currency = currentRestaurant?.currency ?? "TND";

  useEffect(() => {
    if (!isReady) return;
    if (!user?.canManageRestaurants) router.replace("/mainpage");
  }, [isReady, user?.canManageRestaurants, router]);

  const run = useCallback(
    async (operation: (token: string) => Promise<PublicMenu | null>) => {
      const token = getAccessToken();
      if (!token) {
        setError("Your session expired. Sign in again.");
        return;
      }
      setSaving(true);
      setError(null);
      setErrorField(null);
      try {
        const next = await operation(token);
        setMenu(next);
        if (restaurantId && next) {
          saveMenuToLocalCache(restaurantId, next);
          precacheAllMenu3DModels(next);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
        setErrorField(err instanceof ApiError ? (err.field ?? null) : null);
      } finally {
        setSaving(false);
      }
    },
    [getAccessToken, restaurantId]
  );

  useEffect(() => {
    if (!restaurantId) {
      setLoadingMenu(false);
      setMenu(null);
      return;
    }

    // 1. Si hors-ligne d'emblée, charger immédiatement depuis le cache local
    if (!isOnline) {
      const cached = getCachedMenu(restaurantId);
      if (cached) {
        setMenu(cached);
        setUsingOfflineCache(true);
        setLoadingMenu(false);
        return;
      }
    }

    let cancelled = false;
    setLoadingMenu(true);
    const token = getAccessToken();
    if (!token) {
      const cached = getCachedMenu(restaurantId);
      if (cached) {
        setMenu(cached);
        setUsingOfflineCache(true);
      }
      setLoadingMenu(false);
      return;
    }

    apiGetMenu(token, restaurantId)
      .then((tree) => {
        if (!cancelled) {
          setMenu(tree);
          setUsingOfflineCache(false);
          setError(null);
          if (tree) {
            saveMenuToLocalCache(restaurantId, tree);
            precacheAllMenu3DModels(tree);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          // Fallback sur le cache local
          const cached = getCachedMenu(restaurantId);
          if (cached) {
            setMenu(cached);
            setUsingOfflineCache(true);
            setError(null);
          } else {
            setMenu(null);
            setError(err instanceof ApiError ? err.message : "Could not load the menu.");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMenu(false);
      });

    return () => {
      cancelled = true;
    };
  }, [restaurantId, getAccessToken, isOnline]);

  const allItems = useMemo(
    () => menu?.categories.flatMap((category) => category.items) ?? [],
    [menu]
  );

  const hasAvailableDish = useMemo(
    () => (menu?.categories ?? []).some((category) => category.isActive && category.items.some((item) => item.isAvailable)),
    [menu]
  );

  const filteredItems = useMemo(() => {
    let result = [...allItems];

    if (selectedCategory !== "all") {
      result = result.filter((item) => item.categoryId === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.description ?? "").toLowerCase().includes(query) ||
          item.categoryName.toLowerCase().includes(query)
      );
    }

    if (filterAvailability === "available") {
      result = result.filter((item) => item.isAvailable);
    } else if (filterAvailability === "unavailable") {
      result = result.filter((item) => !item.isAvailable);
    }

    if (filterPromotion === "with") {
      result = result.filter((item) => item.promotionLabel);
    } else if (filterPromotion === "without") {
      result = result.filter((item) => !item.promotionLabel);
    }

    // Prices are exact decimal strings; compare them as integer minor units.
    const minor = (price: string) => priceMinor(price, currency);
    const [t15, t30, t50] = [minor("15"), minor("30"), minor("50")];
    if (filterPrice === "under-15") result = result.filter((item) => minor(item.price) < t15);
    else if (filterPrice === "15-30") {
      result = result.filter((item) => minor(item.price) >= t15 && minor(item.price) <= t30);
    } else if (filterPrice === "30-50") {
      result = result.filter((item) => minor(item.price) > t30 && minor(item.price) <= t50);
    } else if (filterPrice === "over-50") result = result.filter((item) => minor(item.price) > t50);

    if (sortBy === "featured") {
      result.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || a.sortOrder - b.sortOrder);
    } else if (sortBy === "price") {
      result.sort((a, b) => {
        const [left, right] = [minor(a.price), minor(b.price)];
        return left < right ? -1 : left > right ? 1 : 0;
      });
    } else if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
    // "order": keep the menu order (categories, then dishes) given by the server.

    return result;
  }, [
    allItems,
    selectedCategory,
    searchQuery,
    filterAvailability,
    filterPromotion,
    filterPrice,
    sortBy,
    currency,
  ]);

  if (!isReady || isLoadingRestaurants || loadingMenu) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-[#7A746B]">
        Loading menu…

    </div>
    );
  }

  if (loadError) return <RestaurantLoadError message={loadError} onRetry={reloadRestaurants} />;

  if (!currentRestaurant || !restaurantId) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-4">
        <div className="w-14 h-14 rounded-2xl bg-[#FAF0EA] text-[#B55234] flex items-center justify-center mb-4">
          <Store className="w-7 h-7" />
  
    </div>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Create a restaurant first</h1>
        <p className="text-sm text-[#736D65] mt-2 max-w-md">
          A menu belongs to a venue. Add a restaurant, then come back to build the menu.
        </p>
        <button
          type="button"
          onClick={() => setIsAddRestaurantOpen(true)}
          className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#B55234] hover:bg-[#9E4328] text-white text-sm font-bold"
        >
          Add a restaurant
        </button>

    </div>
    );
  }

  const serverError = error ? { field: errorField, message: error } : null;

  if (!menu) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-4">
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Create a menu</h1>
        <p className="text-sm text-[#736D65] mt-2 max-w-md">
          Start with a draft menu for {currentRestaurant.name}. You can add categories, dishes, and
          promotions next.
        </p>
        {error && <p className="text-xs text-[#B55234] mt-3">{error}</p>}
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            run((token) =>
              apiCreateMenu(token, restaurantId, { name: `${currentRestaurant.name} menu` })
            )
          }
          className="mt-5 px-4 py-2.5 rounded-xl bg-[#B55234] hover:bg-[#9E4328] text-white text-sm font-bold disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create menu"}
        </button>

    </div>
    );
  }

  const preview = previewOpen ? previewBookMenu(menu) : null;

  return (
    <div className="flex flex-col gap-0 select-none animate-in fade-in duration-300">
      {usingOfflineCache && (
        <div className="mb-3 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-semibold">Mode Hors-Ligne actif</span>
            <span className="text-amber-700/80 hidden sm:inline">— Le menu complet et les modèles 3D sont chargés depuis le cache local.</span>
          </div>
          <span className="font-mono text-[10px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md font-bold">100% Hors-Ligne</span>
        </div>
      )}
      <MenuHeader
        title={menu.name}
        isPublished={menu.isPublished}
        isSaving={saving}
        canAddItem={menu.categories.length > 0}
        onAddItem={() => {
          setEditingItem(null);
          setAddPanelOpen(true);
        }}
        onPreview={() => setPreviewOpen(true)}
        onPreviewAR={() => setPreviewAROpen(true)}
        onTogglePublish={() => {
          if (menu.isPublished) {
            setEmptyPublishAsk(false);
            void run((token) => apiUpdateMenu(token, restaurantId, { isPublished: false }));
          } else if (!hasAvailableDish) {
            setEmptyPublishAsk(true);
          } else {
            void run((token) => apiUpdateMenu(token, restaurantId, { isPublished: true }));
          }
        }}
      />
      {emptyPublishAsk && !menu.isPublished && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">This menu has no available dish.</p>
          <p className="text-xs text-amber-800 mt-0.5">
            Customers will see an empty menu and cannot pre-order. You can publish it anyway and add dishes later.
          </p>
          <div className="flex gap-2 mt-2.5">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setEmptyPublishAsk(false);
                void run((token) => apiUpdateMenu(token, restaurantId, { isPublished: true }));
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[#B55234] text-white text-xs font-bold disabled:opacity-50"
            >
              Publish anyway
            </button>
            <button
              type="button"
              onClick={() => setEmptyPublishAsk(false)}
              className="px-3.5 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-amber-900"
            >
              Keep as draft
            </button>
    
    </div>
  
    </div>
      )}
      <MenuTabs activeTab={activeTab} onChange={setActiveTab} />
      {error && !errorField && (
        <p className="mb-3 text-xs font-semibold text-[#B55234] bg-[#FAF0EA] border border-[#F3DFD4] rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {activeTab === "Items" && (
        <div className="flex flex-col lg:flex-row gap-0 mt-1">
          <div className="flex-1 min-w-0 flex flex-col gap-0">
            <MenuFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
              filterAvailability={filterAvailability}
              setFilterAvailability={setFilterAvailability}
              filterPromotion={filterPromotion}
              setFilterPromotion={setFilterPromotion}
              filterPrice={filterPrice}
              setFilterPrice={setFilterPrice}
              sortBy={sortBy}
              setSortBy={setSortBy}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              categories={menu.categories}
            />

            <div className="flex gap-0 mt-2">
              <div className="hidden lg:block w-[200px] xl:w-[220px] shrink-0 pr-3">
                <CategoriesSidebar
                  categories={menu.categories}
                  selected={selectedCategory}
                  onSelect={setSelectedCategory}
                  disabled={saving}
                  onAdd={(name) => run((token) => apiCreateCategory(token, restaurantId, { name }))}
                />
        
    </div>
              <div className="flex-1 min-w-0">
                <MenuTable
                  items={filteredItems}
                  currency={currency}
                  onEdit={(item) => {
                    setEditingItem(item);
                    setAddPanelOpen(true);
                    setActionMenuId(null);
                  }}
                  onDelete={(id) => run((token) => apiDeleteItem(token, restaurantId, id))}
                  onDuplicate={(item) =>
                    run((token) =>
                      apiCreateItem(token, restaurantId, {
                        categoryId: item.categoryId,
                        name: `${item.name} (copy)`,
                        description: item.description ?? undefined,
                        imageUrl: item.imageUrl ?? undefined,
                        price: item.price,
                        isAvailable: item.isAvailable,
                        isFeatured: false,
                      })
                    )
                  }
                  onToggleAvailability={(id) => {
                    const item = allItems.find((row) => row.id === id);
                    if (!item) return;
                    void run((token) =>
                      apiUpdateItem(token, restaurantId, id, { isAvailable: !item.isAvailable })
                    );
                  }}
                  actionMenuId={actionMenuId}
                  setActionMenuId={setActionMenuId}
                  onMove={
                    sortBy === "order" && selectedCategory !== "all"
                      ? (id, direction) => void run((token) => apiMoveItem(token, restaurantId, id, direction))
                      : undefined
                  }
                />
                {sortBy === "order" && selectedCategory === "all" && (
                  <p className="mt-2 text-xs text-[#736D65]">Choose a category to reorder its dishes.</p>
                )}
        
    </div>
      
    </div>
    
    </div>

          {addPanelOpen && (
            <AddMenuItemPanel
              key={editingItem?.id ?? "new"}
              editingItem={editingItem}
              categories={menu.categories}
              currency={currency}
              restaurantId={restaurantId}
              saving={saving}
              serverError={serverError}
              onSave={(input) => {
                void run(async (token) => {
                  const next = editingItem
                    ? await apiUpdateItem(token, restaurantId, editingItem.id, input)
                    : await apiCreateItem(token, restaurantId, input);
                  setAddPanelOpen(false);
                  setEditingItem(null);
                  return next;
                });
              }}
              onClose={() => {
                setAddPanelOpen(false);
                setEditingItem(null);
              }}
            />
          )}
  
    </div>
      )}

      {activeTab === "Categories" && (
        <CategoriesManager
          categories={menu.categories}
          disabled={saving}
          serverError={serverError}
          onAdd={(name) => run((token) => apiCreateCategory(token, restaurantId, { name }))}
          onMove={(id, direction) => run((token) => apiMoveCategory(token, restaurantId, id, direction))}
          onRename={(id, name) => run((token) => apiUpdateCategory(token, restaurantId, id, { name }))}
          onDelete={(id) =>
            run(async (token) => {
              const next = await apiDeleteCategory(token, restaurantId, id);
              if (selectedCategory === id) setSelectedCategory("all");
              return next;
            })
          }
        />
      )}

      {activeTab === "Promotions" && (
        <PromotionsPanel
          menu={menu}
          currency={currency}
          disabled={saving}
          serverError={serverError}
          onCreate={(input) => run((token) => apiCreatePromotion(token, restaurantId, input))}
          onUpdate={(id, input) => run((token) => apiUpdatePromotion(token, restaurantId, id, input))}
          onDelete={(id) => run((token) => apiDeletePromotion(token, restaurantId, id))}
        />
      )}

      {activeTab === "Menu settings" && (
        <MenuSettingsPanel
          key={`${menu.id}-${menu.name}-${menu.isPublished}`}
          menu={menu}
          disabled={saving}
          onSave={(input) => run((token) => apiUpdateMenu(token, restaurantId, input))}
        />
      )}

      {(openDropdown || actionMenuId) && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => {
            setOpenDropdown(null);
            setActionMenuId(null);
          }}
        />
      )}

      {previewOpen && preview && preview.book.categories.length > 0 && (
        <MenuBookDialog
          menu={preview.book}
          currency={currency}
          decimals={preview.decimals}
          restaurantName={currentRestaurant.name}
          mode="manager-preview"
          orderHint="Preview: customers order here after choosing a table."
          notice={menu.isPublished ? null : "Draft preview: customers cannot see this menu until you publish it."}
          onClose={() => setPreviewOpen(false)}
        />
      )}
      {previewOpen && preview && preview.book.categories.length === 0 && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-sm rounded-2xl bg-white p-5 text-center">
            <p className="text-sm font-bold text-[#1A1A1A]">Nothing to preview yet</p>
            <p className="mt-1 text-xs text-[#736D65]">
              Customers only see active categories that contain at least one dish.
            </p>
            <button
              type="button"
              autoFocus
              onClick={() => setPreviewOpen(false)}
              className="mt-4 rounded-xl bg-[#B55234] px-4 py-2 text-sm font-bold text-white"
            >
              Close
            </button>
    
    </div>
  
    </div>
      )}
      {previewAROpen && currentRestaurant && menu && (
        <MenuPreview
          restaurant={currentRestaurant}
          menu={menu}
          currency={currency}
          onClose={() => setPreviewAROpen(false)}
        />
      )}
    </div>
  );
}
