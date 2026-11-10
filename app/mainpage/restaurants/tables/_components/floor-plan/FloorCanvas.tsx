"use client";

import { useEffect, useRef, type CSSProperties, type DragEvent } from "react";
import { useFloorEditorContext } from "./editor/context";
import { BASE_METER_PX, FLOOR_MIME } from "./editor/constants";
import { clientToFloor } from "./editor/geometry";
import { FLOOR_OBJECT_CATALOG, isFloorObjectType } from "./floor-object";
import { FloorSymbol } from "./FloorSymbol";
import { SelectionFrame } from "./SelectionFrame";

const GRID_IMAGE = [
  "linear-gradient(to right, rgba(58, 53, 48, 0.16) 1px, transparent 1px)",
  "linear-gradient(to bottom, rgba(58, 53, 48, 0.16) 1px, transparent 1px)",
  "linear-gradient(to right, rgba(58, 53, 48, 0.07) 1px, transparent 1px)",
  "linear-gradient(to bottom, rgba(58, 53, 48, 0.07) 1px, transparent 1px)",
].join(", ");

export function FloorCanvas() {
  const editor = useFloorEditorContext();
  const boardRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ apply: editor.applyPointer, end: editor.endPointer });

  useEffect(() => {
    pointerRef.current = { apply: editor.applyPointer, end: editor.endPointer };
  });

  useEffect(() => {
    const board = boardRef.current;
    if (!board || !editor.dragging) return undefined;

    const onMove = (event: PointerEvent) => {
      const point = clientToFloor(board, event.clientX, event.clientY);
      pointerRef.current.apply(point);
    };
    const onUp = () => pointerRef.current.end();

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [editor.dragging]);

  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-[#E5DFD3] bg-[#F5F2EB]">
      <p className="py-2 text-center text-[12px] font-semibold tracking-wide text-[#6B665E]">{editor.width} m</p>
      <div
        className="min-h-0 flex-1 overflow-auto px-4"
        onDragOver={(event) => {
          if (!editor.preview) event.preventDefault();
        }}
      >
        <div
          ref={boardRef}
          data-floor-board
          role="application"
          aria-label="Floor plan"
          className="relative"
          style={boardStyle(editor)}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) editor.select(null);
          }}
          onDragOver={(event) => {
            if (!editor.preview) event.preventDefault();
          }}
          onDrop={(event) => dropOnFloor(event, editor)}
        >
          {editor.guides.map((guide) => (
            <GuideLine key={`${guide.axis}-${guide.at}`} axis={guide.axis} at={guide.at} />
          ))}
          {[...editor.objects]
            .sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id))
            .map((object) => (
              <div
                key={object.id}
                data-floor-id={object.id}
                aria-label={FLOOR_OBJECT_CATALOG[object.type].label}
                className="absolute"
                style={{
                  left: `calc(${object.x} * var(--floor-meter))`,
                  top: `calc(${object.y} * var(--floor-meter))`,
                  zIndex: object.id === editor.selectedId ? 30 : object.zIndex,
                  transform: `rotate(${object.rotation}deg)`,
                  transformOrigin: "center center",
                  cursor: editor.preview || object.locked ? "default" : "move",
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  const floor = event.currentTarget.closest("[data-floor-board]");
                  if (!(floor instanceof HTMLElement)) return;
                  const point = clientToFloor(floor, event.clientX, event.clientY);
                  editor.startMove(object.id, point);
                }}
              >
                <FloorSymbol object={object} selected={object.id === editor.selectedId} />
                {object.id === editor.selectedId && !editor.preview && !object.locked ? <SelectionFrame /> : null}
              </div>
            ))}
        </div>
      </div>
      <p className="py-2 text-center text-[12px] font-semibold tracking-wide text-[#6B665E]">{editor.height} m</p>
    </div>
  );
}

function boardStyle(editor: ReturnType<typeof useFloorEditorContext>): CSSProperties {
  return {
    width: `calc(${editor.width} * var(--floor-meter))`,
    height: `calc(${editor.height} * var(--floor-meter))`,
    ["--floor-meter" as string]: `${BASE_METER_PX * editor.zoom}px`,
    ["--floor-grid" as string]: String(editor.gridSize),
    backgroundColor: "#F7F4EE",
    backgroundImage: editor.showGrid ? GRID_IMAGE : undefined,
    backgroundSize: editor.showGrid
      ? "var(--floor-meter) var(--floor-meter), var(--floor-meter) var(--floor-meter), calc(var(--floor-grid) * var(--floor-meter)) calc(var(--floor-grid) * var(--floor-meter)), calc(var(--floor-grid) * var(--floor-meter)) calc(var(--floor-grid) * var(--floor-meter))"
      : undefined,
    boxShadow: "inset 0 0 0 1px rgba(58, 53, 48, 0.2)",
  };
}

function GuideLine({ axis, at }: { axis: "x" | "y"; at: number }) {
  const vertical = axis === "x";
  return (
    <div
      className="pointer-events-none absolute z-20 bg-[#B55234]/80"
      style={
        vertical
          ? { left: `calc(${at} * var(--floor-meter))`, top: 0, bottom: 0, width: 1 }
          : { top: `calc(${at} * var(--floor-meter))`, left: 0, right: 0, height: 1 }
      }
    />
  );
}

function dropOnFloor(event: DragEvent<HTMLDivElement>, editor: ReturnType<typeof useFloorEditorContext>) {
  event.preventDefault();
  const floor = event.currentTarget;
  if (editor.preview) return;
  const raw = event.dataTransfer.getData(FLOOR_MIME) || event.dataTransfer.getData("text/plain");
  if (!isFloorObjectType(raw)) return;
  editor.addAt(raw, clientToFloor(floor, event.clientX, event.clientY));
}
