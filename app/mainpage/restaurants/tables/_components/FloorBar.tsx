"use client";

import { useState } from "react";
import { Copy, Edit2, Eye, EyeOff, LayoutGrid, Plus, Trash2, Users } from "lucide-react";

const ACTION_CLASS =
  "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#E5DFD3] hover:bg-[#F5F2EC] text-[13px] font-semibold text-[#1A1A1A] transition-colors disabled:opacity-40";

export function FloorBar({
  floors,
  activeId,
  tableCount,
  seatCount,
  onSelect,
  onAdd,
  onEdit,
  onDuplicate,
  onDelete,
  onReorder,
  onToggleActive,
}: {
  floors: { id: string; name: string; isActive: boolean }[];
  activeId: string | null;
  tableCount: number;
  seatCount: number;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReorder: () => void;
  /** Switches the selected floor on (true) or off (false). */
  onToggleActive: (isActive: boolean) => void;
}) {
  const hasFloor = Boolean(activeId);
  const selected = floors.find((floor) => floor.id === activeId) ?? null;
  // What the manager is about to confirm, asked in the page instead of a browser dialog.
  const [asking, setAsking] = useState<"deactivate" | "delete" | null>(null);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-[15px] font-semibold">Floors</span>
          {floors.map((floor) => (
            <button
              key={floor.id}
              type="button"
              onClick={() => onSelect(floor.id)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                activeId === floor.id
                  ? "bg-[#B8573A] text-white shadow-sm"
                  : "border border-[#E5DFD3] bg-white text-[#6B665E] hover:bg-[#F5F2EC]"
              }`}
            >
              {floor.name}
              {!floor.isActive ? (
                <span className="ml-1.5 rounded-md bg-black/10 px-1.5 py-0.5 text-[10px] font-bold uppercase">Off</span>
              ) : null}
            </button>
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="ml-1 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-[#6B665E] hover:bg-[#F5F2EC]"
          >
            <Plus className="h-4 w-4" />
            Add floor
          </button>
        </div>
        <div className="flex items-center gap-6 text-[13px] font-medium text-[#6B665E]">
          <span className="flex items-center gap-1.5">
            <LayoutGrid className="h-4 w-4" />
            {tableCount} tables
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {seatCount} seats
          </span>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button type="button" className={ACTION_CLASS} disabled={!hasFloor} onClick={onEdit}>
          <Edit2 className="h-3.5 w-3.5 text-[#6B665E]" />
          Edit floor
        </button>
        <button type="button" className={ACTION_CLASS} disabled={!hasFloor} onClick={onDuplicate}>
          <Copy className="h-3.5 w-3.5 text-[#6B665E]" />
          Duplicate
        </button>
        {selected?.isActive === false ? (
          <button type="button" className={ACTION_CLASS} onClick={() => onToggleActive(true)}>
            <Eye className="h-3.5 w-3.5 text-[#6B665E]" />
            Activate
          </button>
        ) : (
          <button type="button" className={ACTION_CLASS} disabled={!hasFloor} onClick={() => setAsking("deactivate")}>
            <EyeOff className="h-3.5 w-3.5 text-[#6B665E]" />
            Deactivate
          </button>
        )}
        <button type="button" className={ACTION_CLASS} disabled={!hasFloor} onClick={() => setAsking("delete")}>
          <Trash2 className="h-3.5 w-3.5 text-[#6B665E]" />
          Delete
        </button>
        <button type="button" className={`${ACTION_CLASS} ml-2`} disabled={floors.length < 2} onClick={onReorder}>
          Reorder
        </button>
      </div>

      {asking && selected ? (
        <div role="alert" className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-700">
            {asking === "deactivate"
              ? `Deactivate ${selected.name}? Customers will no longer see it or book its tables. Existing bookings block this, and so does the last floor of a published restaurant.`
              : `Delete ${selected.name}? Tables on this floor are removed with it.`}
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const choice = asking;
                setAsking(null);
                if (choice === "deactivate") onToggleActive(false);
                else onDelete();
              }}
              className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-700"
            >
              {asking === "deactivate" ? "Deactivate" : "Delete"}
            </button>
            <button
              type="button"
              onClick={() => setAsking(null)}
              className="rounded-lg border border-[#E5DFD3] bg-white px-3.5 py-1.5 text-xs font-semibold"
            >
              Keep
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
