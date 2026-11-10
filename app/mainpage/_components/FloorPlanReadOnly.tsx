"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BASE_METER_PX } from "../restaurants/tables/_components/floor-plan/editor/constants";
import {
  FLOOR_OBJECT_CATALOG,
  type FloorObject,
} from "../restaurants/tables/_components/floor-plan/floor-object";
import { FloorSymbol } from "../restaurants/tables/_components/floor-plan/FloorSymbol";

const TABLE_TYPES = new Set(["ROUND_TABLE", "SQUARE_TABLE", "RECTANGLE_TABLE", "BAR_TABLE", "BOOTH"]);
const MIN_METER_PX = 14;
const EDGE_PADDING_PX = 24;

export type TableState = "free" | "taken" | "too_small";

/** A live colour for one table: the plan tints it and the table becomes a button. */
export type LiveTone = { color: string; label: string };

type FloorPlanReadOnlyProps = {
  width: number;
  height: number;
  objects: FloorObject[];
  /** When given, tables become pickable: free ones are buttons, the rest are dimmed. */
  tableStates?: Record<string, TableState>;
  selectedTableId?: string | null;
  onSelectTable?: (tableId: string) => void;
  /** Live mode: every listed table is tinted with its colour and can be picked whatever its state. */
  liveTables?: Record<string, LiveTone>;
};

const STATE_LABEL: Record<TableState, string> = {
  free: "available",
  taken: "already booked",
  too_small: "too small for your party",
};

/**
 * The manager's floor plan, drawn as saved but not editable.
 * The scale fits the available width and never exceeds the editor's 100% zoom.
 */
export function FloorPlanReadOnly({
  width,
  height,
  objects,
  tableStates,
  selectedTableId = null,
  onSelectTable,
  liveTables,
}: FloorPlanReadOnlyProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return undefined;
    const update = () => setAvailable(element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fitted = available > 0 ? (available - EDGE_PADDING_PX * 2) / Math.max(width, 1) : BASE_METER_PX;
  const meter = Math.max(MIN_METER_PX, Math.min(BASE_METER_PX, fitted));

  const boardStyle: CSSProperties = {
    width: `calc(${width} * var(--floor-meter))`,
    height: `calc(${height} * var(--floor-meter))`,
    ["--floor-meter" as string]: `${meter}px`,
    backgroundColor: "#F7F4EE",
    boxShadow: "inset 0 0 0 1px rgba(58, 53, 48, 0.2)",
  };

  const ordered = [...objects].sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id));

  return (
    <div ref={wrapperRef} className="w-full overflow-auto rounded-2xl border border-[#E5DFD3] bg-[#F5F2EB] p-6">
      <div className="relative mx-auto" style={boardStyle} role="img" aria-label="Restaurant floor plan">
        {ordered.map((object) => (
          <div
            key={object.id}
            aria-label={FLOOR_OBJECT_CATALOG[object.type].label}
            className="pointer-events-none absolute"
            style={{
              left: `calc(${object.x} * var(--floor-meter))`,
              top: `calc(${object.y} * var(--floor-meter))`,
              zIndex: object.zIndex,
              transform: `rotate(${object.rotation}deg)`,
              transformOrigin: "center center",
              opacity: dimmed(object, tableStates) ? 0.35 : 1,
            }}
          >
            <FloorSymbol object={object} selected={object.id === selectedTableId} />
          </div>
        ))}
        {tableStates
          ? ordered.filter((object) => tableStates[object.id] !== undefined).map((object) => {
              const state = tableStates[object.id];
              const name = String(object.metadata?.label ?? "Table");
              const seats = object.metadata?.capacity;
              const selected = object.id === selectedTableId;
              return (
                <button
                  key={`${object.id}-pick`}
                  type="button"
                  disabled={state !== "free"}
                  aria-pressed={selected}
                  aria-label={`${name}${typeof seats === "number" ? `, ${seats} seats` : ""}, ${STATE_LABEL[state]}`}
                  onClick={() => onSelectTable?.(object.id)}
                  className={`absolute z-50 rounded-md border-2 border-dashed transition-colors focus-visible:outline-2 focus-visible:outline-[#B55234] ${
                    state === "free"
                      ? selected
                        ? "cursor-pointer border-[#B55234] bg-[#B55234]/10"
                        : "cursor-pointer border-[#2E7D32]/60 hover:bg-[#2E7D32]/10"
                      : "cursor-not-allowed border-transparent"
                  }`}
                  style={{
                    left: `calc(${object.x} * var(--floor-meter))`,
                    top: `calc(${object.y} * var(--floor-meter))`,
                    width: `calc(${object.width} * var(--floor-meter))`,
                    height: `calc(${object.height} * var(--floor-meter))`,
                    transform: `rotate(${object.rotation}deg)`,
                    transformOrigin: "center center",
                  }}
                />
              );
            })
          : null}
        {liveTables
          ? ordered.filter((object) => liveTables[object.id] !== undefined).map((object) => {
              const tone = liveTables[object.id];
              const name = String(object.metadata?.label ?? "Table");
              const selected = object.id === selectedTableId;
              return (
                <button
                  key={`${object.id}-live`}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${name}, ${tone.label}`}
                  onClick={() => onSelectTable?.(object.id)}
                  className="absolute z-50 cursor-pointer rounded-md border-2 transition-colors focus-visible:outline-2 focus-visible:outline-[#1A1A1A]"
                  style={{
                    left: `calc(${object.x} * var(--floor-meter))`,
                    top: `calc(${object.y} * var(--floor-meter))`,
                    width: `calc(${object.width} * var(--floor-meter))`,
                    height: `calc(${object.height} * var(--floor-meter))`,
                    transform: `rotate(${object.rotation}deg)`,
                    transformOrigin: "center center",
                    backgroundColor: `${tone.color}${selected ? "66" : "40"}`,
                    borderColor: tone.color,
                    borderStyle: selected ? "solid" : "dashed",
                  }}
                />
              );
            })
          : null}
        {ordered.filter(hasLabel).map((object) => (
          <span
            key={`${object.id}-label`}
            className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#3A3530]"
            style={{
              left: `calc(${object.x + object.width / 2} * var(--floor-meter))`,
              top: `calc(${object.y + object.height / 2} * var(--floor-meter))`,
            }}
          >
            {String(object.metadata?.label)}
          </span>
        ))}
      </div>
    </div>
  );
}

function dimmed(object: FloorObject, states?: Record<string, TableState>) {
  const state = states?.[object.id];
  return state !== undefined && state !== "free";
}

function hasLabel(object: FloorObject) {
  const label = object.metadata?.label;
  return TABLE_TYPES.has(object.type) && typeof label === "string" && label.trim() !== "";
}
