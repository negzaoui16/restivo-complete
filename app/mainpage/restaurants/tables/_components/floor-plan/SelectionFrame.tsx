"use client";

import type { PointerEvent } from "react";
import { useFloorEditorContext } from "./editor/context";
import { clientToFloor, type Corner } from "./editor/geometry";

const CORNERS: { corner: Corner; className: string }[] = [
  { corner: "nw", className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" },
  { corner: "ne", className: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" },
  { corner: "sw", className: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" },
  { corner: "se", className: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" },
];

export function SelectionFrame() {
  const editor = useFloorEditorContext();

  return (
    <div className="pointer-events-none absolute inset-0 border border-[#B55234]">
      {CORNERS.map(({ corner, className }) => (
        <button
          key={corner}
          type="button"
          aria-label={`Resize from ${corner}`}
          className={`pointer-events-auto absolute h-2.5 w-2.5 rounded-full border-2 border-white bg-[#B55234] ${className}`}
          onPointerDown={(event) => start(event, (point) => editor.startResize(editor.selectedId ?? "", corner, point))}
        />
      ))}
      <span className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 -translate-y-full bg-[#B55234]" />
      <button
        type="button"
        aria-label="Rotate"
        className="pointer-events-auto absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-7 cursor-grab rounded-full border-2 border-[#B55234] bg-white"
        onPointerDown={(event) => start(event, (point) => editor.startRotate(editor.selectedId ?? "", point))}
      />
    </div>
  );
}

function start(event: PointerEvent<HTMLButtonElement>, run: (point: { x: number; y: number }) => void) {
  event.stopPropagation();
  event.preventDefault();
  const floor = event.currentTarget.closest("[data-floor-board]");
  if (!(floor instanceof HTMLElement)) return;
  run(clientToFloor(floor, event.clientX, event.clientY));
}
