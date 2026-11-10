"use client";

import { RestaurantLoadError } from "../_components/RestaurantLoadError";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurantManager } from "../_context/RestaurantManagerContext";
import { rowsForFloor } from "./_lib/floor-rows";
import { useRestaurantFloors } from "./_lib/use-floors";
import { TablesHeader } from "./_components/TablesHeader";
import { FloorBar } from "./_components/FloorBar";
import { FloorDialog } from "./_components/FloorDialog";
import { FloorEditor } from "./_components/floor-plan/FloorEditor";
import { TablesList } from "./_components/TablesList";

export default function TablesAndFloorsPage() {
  const router = useRouter();
  const { user, isReady } = useAuth();
  const { currentRestaurant, isLoadingRestaurants, setIsAddRestaurantOpen, loadError, reloadRestaurants } = useRestaurantManager();
  const floorsApi = useRestaurantFloors(currentRestaurant?.id);
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!user?.canManageRestaurants) router.replace("/mainpage");
  }, [isReady, user?.canManageRestaurants, router]);

  if (!isReady || isLoadingRestaurants) {
    return <Status>Loading tables…</Status>;
  }

  if (loadError) return <RestaurantLoadError message={loadError} onRetry={reloadRestaurants} />;

  if (!currentRestaurant) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAF0EA] text-[#B55234]">
          <Store className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">Create a restaurant first</h1>
        <p className="mt-2 max-w-md text-sm text-[#736D65]">
          Tables belong to a venue. Add a restaurant, then come back to design the floor plan.
        </p>
        <button
          type="button"
          onClick={() => setIsAddRestaurantOpen(true)}
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#B55234] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#9E4328]"
        >
          Add a restaurant
        </button>
      </div>
    );
  }

  const floor = floorsApi.activeFloor;

  return (
    <div className="flex select-none flex-col gap-0 pb-6 animate-in fade-in duration-300">
      <TablesHeader />
      <FloorBar
        floors={floorsApi.floors}
        activeId={floor?.id ?? null}
        tableCount={floor?.tableCount ?? 0}
        seatCount={floor?.seatCount ?? 0}
        onSelect={floorsApi.select}
        onAdd={() => setDialog("create")}
        onEdit={() => setDialog("edit")}
        onDuplicate={() => floor && void floorsApi.duplicate(floor.id)}
        onDelete={() => floor && void floorsApi.remove(floor.id)}
        onReorder={() => floor && void floorsApi.reorder(floor.id)}
        onToggleActive={(isActive) => floor && void floorsApi.setActive(floor.id, isActive).catch(() => undefined)}
      />
      {floorsApi.error ? <p className="mb-3 text-sm font-medium text-[#B55234]">{floorsApi.error}</p> : null}
      {floorsApi.loading ? <Status>Loading floors…</Status> : null}
      {!floorsApi.loading && !floor ? (
        <EmptyFloor onAdd={() => setDialog("create")} />
      ) : null}
      {floor ? (
        <div className="h-[760px]">
          <FloorEditor
            key={floor.id}
            width={floor.width}
            height={floor.height}
            objects={floor.objects}
            onSave={(objects) => floorsApi.saveLayout(objects, false)}
            onPublish={(objects) => floorsApi.saveLayout(objects, true)}
          />
        </div>
      ) : null}
      <TablesList floorName={floor?.name ?? null} rows={rowsForFloor(floor)} />
      {dialog ? (
        <FloorDialog
          title={dialog === "create" ? "Add a floor" : "Edit floor"}
          initial={
            dialog === "edit" && floor
              ? { name: floor.name, width: floor.width, height: floor.height }
              : { name: "", width: 18, height: 12 }
          }
          onClose={() => setDialog(null)}
          onSubmit={(value) =>
            dialog === "edit" && floor ? floorsApi.update(floor.id, value) : floorsApi.create(value)
          }
        />
      ) : null}
    </div>
  );
}

function Status({ children }: { children: string }) {
  return <div className="flex items-center justify-center py-24 text-sm text-[#7A746B]">{children}</div>;
}

function EmptyFloor({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mb-6 rounded-2xl border border-dashed border-[#E5DFD3] bg-white px-6 py-16 text-center">
      <h2 className="text-lg font-semibold">No floors yet</h2>
      <p className="mt-1 text-sm text-[#736D65]">Name a floor, set its size in meters, then place tables on it.</p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 rounded-xl bg-[#B55234] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#9E4328]"
      >
        Add floor
      </button>
    </div>
  );
}
