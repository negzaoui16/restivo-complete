"use client";

import { useMemo, useState } from "react";
import { Building2, Check, DoorOpen, Maximize2, Sparkles, X } from "lucide-react";
import {
  generatePerimeterWalls,
  type PerimeterConfig,
  type WallSide,
} from "./perimeter-generator";
import type { FloorObject } from "./floor-object";

interface PerimeterWallsModalProps {
  floorWidth: number;
  floorHeight: number;
  onApply: (objects: FloorObject[], replaceExisting: boolean) => void;
  onClose: () => void;
}

export function PerimeterWallsModal({
  floorWidth,
  floorHeight,
  onApply,
  onClose,
}: PerimeterWallsModalProps) {
  // Door configuration
  const [doorWall, setDoorWall] = useState<WallSide>("bottom");
  const [doorPosition, setDoorPosition] = useState<number>(0.5);
  const [doorWidth, setDoorWidth] = useState<number>(0.9);

  // Window configuration
  const [windowConfig, setWindowConfig] = useState<{
    top: number;
    bottom: number;
    left: number;
    right: number;
  }>({
    top: 2,
    bottom: 2,
    left: 2,
    right: 2,
  });

  // Settings
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [lockedWalls, setLockedWalls] = useState(false);

  // Compute live generated objects for real-time blueprint preview
  const previewConfig: PerimeterConfig = useMemo(
    () => ({
      floorWidth,
      floorHeight,
      wallThickness: 0.2,
      doorWall,
      doorPosition,
      doorWidth,
      windows: windowConfig,
      lockedWalls,
    }),
    [doorPosition, doorWall, doorWidth, floorHeight, floorWidth, lockedWalls, windowConfig],
  );

  const previewObjects = useMemo(() => generatePerimeterWalls(previewConfig), [previewConfig]);

  const stats = useMemo(() => {
    const walls = previewObjects.filter((o) => o.type === "WALL").length;
    const doors = previewObjects.filter((o) => o.type === "DOOR").length;
    const windows = previewObjects.filter((o) => o.type === "WINDOW").length;
    return { walls, doors, windows };
  }, [previewObjects]);

  const handleApply = () => {
    onApply(previewObjects, replaceExisting);
  };

  const applyPreset = (preset: "none" | "front_sides" | "panoramic") => {
    switch (preset) {
      case "none":
        setWindowConfig({ top: 0, bottom: 0, left: 0, right: 0 });
        break;
      case "front_sides":
        setWindowConfig({
          top: 0,
          bottom: 2,
          left: Math.max(1, Math.floor(floorHeight / 4)),
          right: Math.max(1, Math.floor(floorHeight / 4)),
        });
        break;
      case "panoramic":
        setWindowConfig({
          top: Math.max(1, Math.floor(floorWidth / 4)),
          bottom: Math.max(1, Math.floor(floorWidth / 5)),
          left: Math.max(1, Math.floor(floorHeight / 4)),
          right: Math.max(1, Math.floor(floorHeight / 4)),
        });
        break;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="perimeter-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl border border-[#E5DFD3] bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5DFD3] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FAF0EA] text-[#B55234]">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h2 id="perimeter-modal-title" className="text-lg font-bold text-[#1A1A1A]">
                Room Perimeter & Walls
              </h2>
              <p className="text-xs text-[#6B665E]">
                Enclose your entire floor ({floorWidth}m &times; {floorHeight}m) with perimeter walls, entrance door, and windows.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-[#6B665E] hover:bg-[#F5F2EC] hover:text-[#1A1A1A]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Blueprint Live Preview */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C877D]">
                Interactive Blueprint Preview
              </span>
              <span className="text-xs font-medium text-[#6B665E]">
                Click any wall to place the entrance door
              </span>
            </div>

            <div className="relative rounded-2xl border border-[#E5DFD3] bg-[#F7F4EE] p-3 shadow-inner">
              {/* Floor Dimensions Header */}
              <div className="text-center text-[11px] font-semibold text-[#8C877D] mb-1">
                {floorWidth} m
              </div>

              <div className="flex items-center">
                <span className="text-[11px] font-semibold text-[#8C877D] -rotate-90 w-4 text-center">
                  {floorHeight}m
                </span>

                {/* SVG Blueprint Board */}
                <div className="relative flex-1 aspect-[16/10] max-h-56 rounded-xl border border-dashed border-[#D6CFBF] bg-[#FAF7F2] overflow-hidden">
                  <svg
                    viewBox={`-0.5 -0.5 ${floorWidth + 1} ${floorHeight + 1}`}
                    className="h-full w-full"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {/* Grid Pattern */}
                    <defs>
                      <pattern id="modalGrid" width="1" height="1" patternUnits="userSpaceOnUse">
                        <path d="M 1 0 L 0 0 0 1" fill="none" stroke="rgba(58, 53, 48, 0.08)" strokeWidth="0.04" />
                      </pattern>
                    </defs>
                    <rect x="0" y="0" width={floorWidth} height={floorHeight} fill="url(#modalGrid)" />
                    <rect x="0" y="0" width={floorWidth} height={floorHeight} fill="none" stroke="#D6CFBF" strokeWidth="0.08" />

                    {/* Generated Objects */}
                    {previewObjects.map((obj) => {
                      if (obj.type === "WALL") {
                        return (
                          <rect
                            key={obj.id}
                            x={obj.x}
                            y={obj.y}
                            width={obj.width}
                            height={obj.height}
                            fill="#3A3530"
                            rx="0.04"
                          />
                        );
                      }
                      if (obj.type === "DOOR") {
                        const isBottom = obj.y > floorHeight / 2;
                        const isTop = obj.y < 0.5;
                        const isLeft = obj.x < 0.5;
                        return (
                          <g key={obj.id} transform={`translate(${obj.x}, ${obj.y})`}>
                            {/* Door Opening Frame */}
                            <rect
                              x="0"
                              y="0"
                              width={obj.width}
                              height={obj.height}
                              fill="rgba(181, 82, 52, 0.12)"
                              stroke="#B55234"
                              strokeWidth="0.06"
                              strokeDasharray="0.1 0.1"
                              rx="0.04"
                            />
                            {/* Swing arc indicator */}
                            <circle
                              cx={isLeft ? 0 : isBottom ? 0 : obj.width}
                              cy={isBottom ? obj.height : isTop ? 0 : 0}
                              r={obj.width * 0.9}
                              fill="none"
                              stroke="#B55234"
                              strokeWidth="0.04"
                              strokeDasharray="0.08 0.06"
                            />
                            {/* Door Leaf */}
                            <line
                              x1={isBottom ? 0 : isTop ? 0 : 0}
                              y1={isBottom ? obj.height : isTop ? 0 : obj.height}
                              x2={isBottom ? obj.width * 0.7 : obj.width * 0.7}
                              y2={isBottom ? obj.height * 0.3 : obj.height * 0.7}
                              stroke="#B55234"
                              strokeWidth="0.08"
                            />
                          </g>
                        );
                      }
                      if (obj.type === "WINDOW") {
                        return (
                          <g key={obj.id}>
                            <rect
                              x={obj.x}
                              y={obj.y}
                              width={obj.width}
                              height={obj.height}
                              fill="#E0F2FE"
                              stroke="#0284C7"
                              strokeWidth="0.04"
                              rx="0.02"
                            />
                            {/* Center glass line */}
                            {obj.width > obj.height ? (
                              <line
                                x1={obj.x}
                                y1={obj.y + obj.height / 2}
                                x2={obj.x + obj.width}
                                y2={obj.y + obj.height / 2}
                                stroke="#0284C7"
                                strokeWidth="0.04"
                              />
                            ) : (
                              <line
                                x1={obj.x + obj.width / 2}
                                y1={obj.y}
                                x2={obj.x + obj.width / 2}
                                y2={obj.y + obj.height}
                                stroke="#0284C7"
                                strokeWidth="0.04"
                              />
                            )}
                          </g>
                        );
                      }
                      return null;
                    })}

                    {/* Interactive Click Zones for the 4 walls */}
                    <rect
                      x="0"
                      y="0"
                      width={floorWidth}
                      height="0.6"
                      fill="transparent"
                      className="cursor-pointer hover:fill-[#B55234]/15 transition"
                      onClick={() => setDoorWall("top")}
                    />
                    <rect
                      x="0"
                      y={floorHeight - 0.6}
                      width={floorWidth}
                      height="0.6"
                      fill="transparent"
                      className="cursor-pointer hover:fill-[#B55234]/15 transition"
                      onClick={() => setDoorWall("bottom")}
                    />
                    <rect
                      x="0"
                      y="0"
                      width="0.6"
                      height={floorHeight}
                      fill="transparent"
                      className="cursor-pointer hover:fill-[#B55234]/15 transition"
                      onClick={() => setDoorWall("left")}
                    />
                    <rect
                      x={floorWidth - 0.6}
                      y="0"
                      width="0.6"
                      height={floorHeight}
                      fill="transparent"
                      className="cursor-pointer hover:fill-[#B55234]/15 transition"
                      onClick={() => setDoorWall("right")}
                    />
                  </svg>
                </div>

                <span className="text-[11px] font-semibold text-[#8C877D] rotate-90 w-4 text-center">
                  {floorHeight}m
                </span>
              </div>

              {/* Legend */}
              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-4 text-[11px] text-[#6B665E]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-5 rounded-xs bg-[#3A3530]" /> Wall ({stats.walls})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-5 rounded-xs bg-[#B55234]" /> Entrance Door ({stats.doors})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-5 rounded-xs border border-[#0284C7] bg-[#E0F2FE]" /> Window ({stats.windows})
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Entrance Door */}
          <div className="space-y-3 rounded-2xl border border-[#E5DFD3] bg-[#FAF7F2] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DoorOpen className="h-4 w-4 text-[#B55234]" />
                <h3 className="text-sm font-bold text-[#1A1A1A]">1. Main Entrance Door</h3>
              </div>
              <span className="rounded-md bg-[#FAF0EA] px-2 py-0.5 text-[11px] font-bold text-[#B55234]">
                {doorWall.toUpperCase()} WALL
              </span>
            </div>

            {/* Wall Selector */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#6B665E]">
                Which wall has the entrance door?
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { id: "bottom" as WallSide, label: "Front (Bottom)", desc: "Main Entrance" },
                  { id: "top" as WallSide, label: "Back (Top)", desc: "Rear Entrance" },
                  { id: "left" as WallSide, label: "Left Wall", desc: "Side Entrance" },
                  { id: "right" as WallSide, label: "Right Wall", desc: "Side Entrance" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDoorWall(item.id)}
                    className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition ${
                      doorWall === item.id
                        ? "border-[#B55234] bg-white shadow-xs"
                        : "border-[#E5DFD3] bg-[#F7F4EE] hover:bg-white"
                    }`}
                  >
                    <span className={`text-xs font-bold ${doorWall === item.id ? "text-[#B55234]" : "text-[#1A1A1A]"}`}>
                      {item.label}
                    </span>
                    <span className="text-[10px] text-[#8C877D]">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Door Position along wall */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-semibold text-[#6B665E]">
                  Door Position along {doorWall} wall:
                </label>
                <span className="text-xs font-bold text-[#B55234]">
                  {doorPosition === 0.5 ? "Center (50%)" : `${Math.round(doorPosition * 100)}%`}
                </span>
              </div>

              {/* Quick Presets */}
              <div className="mb-2 flex items-center gap-2">
                {[
                  { pos: 0.25, label: "Near Left / Corner (25%)" },
                  { pos: 0.5, label: "Center (50%)" },
                  { pos: 0.75, label: "Near Right / Corner (75%)" },
                ].map((p) => (
                  <button
                    key={p.pos}
                    type="button"
                    onClick={() => setDoorPosition(p.pos)}
                    className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                      Math.abs(doorPosition - p.pos) < 0.04
                        ? "bg-[#B55234] text-white"
                        : "border border-[#E5DFD3] bg-white text-[#6B665E] hover:border-[#B55234]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <input
                type="range"
                min="0.15"
                max="0.85"
                step="0.05"
                value={doorPosition}
                onChange={(e) => setDoorPosition(Number.parseFloat(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#E5DFD3] accent-[#B55234]"
              />
            </div>

            {/* Door Width */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs font-semibold text-[#6B665E]">Door Size:</span>
              <button
                type="button"
                onClick={() => setDoorWidth(0.9)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  doorWidth === 0.9
                    ? "bg-white text-[#B55234] border border-[#B55234] shadow-xs"
                    : "border border-[#E5DFD3] bg-white text-[#6B665E]"
                }`}
              >
                Standard (0.9 m)
              </button>
              <button
                type="button"
                onClick={() => setDoorWidth(1.6)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  doorWidth === 1.6
                    ? "bg-white text-[#B55234] border border-[#B55234] shadow-xs"
                    : "border border-[#E5DFD3] bg-white text-[#6B665E]"
                }`}
              >
                Double Door (1.6 m)
              </button>
            </div>
          </div>

          {/* Section 2: Windows */}
          <div className="space-y-3 rounded-2xl border border-[#E5DFD3] bg-[#FAF7F2] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Maximize2 className="h-4 w-4 text-[#0284C7]" />
                <h3 className="text-sm font-bold text-[#1A1A1A]">2. Exterior Windows</h3>
              </div>

              {/* Preset buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset("none")}
                  className="rounded-lg border border-[#E5DFD3] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#6B665E] hover:text-[#1A1A1A]"
                >
                  None
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("front_sides")}
                  className="flex items-center gap-1 rounded-lg border border-[#E5DFD3] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#0284C7] hover:border-[#0284C7]"
                >
                  <Sparkles className="h-3 w-3" />
                  Street & Sides
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("panoramic")}
                  className="rounded-lg border border-[#E5DFD3] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#0284C7] hover:border-[#0284C7]"
                >
                  All Walls
                </button>
              </div>
            </div>

            <p className="text-xs text-[#6B665E]">
              Windows are automatically centered along available wall spans without colliding with doors or corners.
            </p>

            {/* Individual Wall Windows Count */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { key: "bottom" as const, label: "Front (Bottom)" },
                { key: "top" as const, label: "Back (Top)" },
                { key: "left" as const, label: "Left Wall" },
                { key: "right" as const, label: "Right Wall" },
              ].map(({ key, label }) => (
                <div key={key} className="rounded-xl border border-[#E5DFD3] bg-white p-2.5">
                  <span className="block text-[11px] font-bold text-[#1A1A1A]">{label}</span>
                  <div className="mt-1.5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setWindowConfig((prev) => ({
                          ...prev,
                          [key]: Math.max(0, prev[key] - 1),
                        }))
                      }
                      className="grid h-6 w-6 place-items-center rounded bg-[#F7F4EE] text-xs font-bold text-[#3A3530] hover:bg-[#E5DFD3]"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold text-[#0284C7]">
                      {windowConfig[key]} {windowConfig[key] === 1 ? "win" : "wins"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setWindowConfig((prev) => ({
                          ...prev,
                          [key]: Math.min(6, prev[key] + 1),
                        }))
                      }
                      className="grid h-6 w-6 place-items-center rounded bg-[#F7F4EE] text-xs font-bold text-[#3A3530] hover:bg-[#E5DFD3]"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2 rounded-2xl border border-[#E5DFD3] bg-white p-3 text-xs text-[#6B665E]">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="h-4 w-4 rounded border-[#D6CFBF] accent-[#B55234]"
              />
              <span>
                <strong className="text-[#1A1A1A]">Replace existing perimeter walls & doors</strong>{" "}
                (Safely leaves all interior tables, kitchen, bar, and furniture intact).
              </span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={lockedWalls}
                onChange={(e) => setLockedWalls(e.target.checked)}
                className="h-4 w-4 rounded border-[#D6CFBF] accent-[#B55234]"
              />
              <span>
                <strong className="text-[#1A1A1A]">Lock perimeter walls</strong> (Prevents accidentally moving walls when moving tables).
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E5DFD3] bg-[#FAF7F2] px-6 py-3.5">
          <div className="text-xs text-[#6B665E]">
            Will generate: <strong className="text-[#1A1A1A]">{stats.walls}</strong> walls,{" "}
            <strong className="text-[#B55234]">1</strong> entrance door,{" "}
            <strong className="text-[#0284C7]">{stats.windows}</strong> windows.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#E5DFD3] bg-white px-4 py-2 text-xs font-semibold text-[#6B665E] hover:bg-[#F5F2EC] hover:text-[#1A1A1A]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-2 rounded-xl bg-[#B55234] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#9E4328] transition"
            >
              <Check className="h-4 w-4" />
              Apply Room Walls
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
