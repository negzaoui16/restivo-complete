"use client";

import { Building2 } from "lucide-react";
import { FLOOR_MIME } from "./editor/constants";
import { useFloorEditorContext } from "./editor/context";
import { FLOOR_OBJECT_CATALOG, FLOOR_OBJECT_TYPES, type FloorObject, type FloorObjectGroup } from "./floor-object";
import { FloorSymbol } from "./FloorSymbol";

const GROUPS: FloorObjectGroup[] = ["Tables", "Seating", "Areas", "Structure"];

export function ObjectLibrary() {
  const editor = useFloorEditorContext();

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col overflow-hidden rounded-2xl border border-[#E5DFD3] bg-white">
      <div className="border-b border-[#E5DFD3] px-4 py-3">
        <h3 className="text-[15px] font-semibold">Objects</h3>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto p-3">
        {GROUPS.map((group) => (
          <section key={group}>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8C877D]">{group}</h4>
            {group === "Structure" ? (
              <button
                type="button"
                disabled={editor.preview}
                onClick={() => editor.setPerimeterModalOpen(true)}
                className="mb-2 flex w-full items-center justify-between gap-1.5 rounded-xl border border-dashed border-[#B55234]/50 bg-[#FAF0EA]/60 p-2 text-left text-xs font-semibold text-[#B55234] hover:border-[#B55234] hover:bg-[#FAF0EA] transition disabled:opacity-40"
              >
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 shrink-0 text-[#B55234]" />
                  <div>
                    <p className="font-bold text-[#1A1A1A] leading-tight">Enclose Room</p>
                    <p className="text-[10px] font-normal text-[#8C877D]">Auto walls & door</p>
                  </div>
                </div>
                <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#B55234] shadow-xs">
                  Setup
                </span>
              </button>
            ) : null}
            <div className="flex flex-col gap-1.5">
              {FLOOR_OBJECT_TYPES.filter((type) => FLOOR_OBJECT_CATALOG[type].group === group).map((type) => (
                <LibraryItem key={type} type={type} disabled={editor.preview} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

function LibraryItem({ type, disabled }: { type: FloorObject["type"]; disabled: boolean }) {
  const definition = FLOOR_OBJECT_CATALOG[type];
  const preview = previewObject(definition);

  return (
    <div
      draggable={!disabled}
      role="button"
      tabIndex={0}
      aria-label={definition.label}
      onDragStart={(event) => {
        event.dataTransfer.setData(FLOOR_MIME, type);
        event.dataTransfer.setData("text/plain", type);
        event.dataTransfer.effectAllowed = "copy";
      }}
      className="flex cursor-grab items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 hover:border-[#E5DFD3] hover:bg-[#FAF7F2] active:cursor-grabbing"
    >
      <span
        className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#F7F4EE]"
        style={{ ["--floor-meter" as string]: `${32 / Math.max(definition.width, definition.height)}px` }}
      >
        <FloorSymbol object={preview} />
      </span>
      <span className="text-[13px] font-medium text-[#1A1A1A]">{definition.label}</span>
    </div>
  );
}

function previewObject(definition: (typeof FLOOR_OBJECT_CATALOG)[FloorObject["type"]]): FloorObject {
  return {
    id: definition.type,
    type: definition.type,
    x: 0,
    y: 0,
    width: definition.width,
    height: definition.height,
    rotation: 0,
    zIndex: 1,
    locked: false,
    metadata: definition.metadata,
  };
}
