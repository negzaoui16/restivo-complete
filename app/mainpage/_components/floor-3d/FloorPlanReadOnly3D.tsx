"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RotateCcw, Users, Sparkles } from "lucide-react";
import type { FloorObject } from "@/app/mainpage/restaurants/tables/_components/floor-plan/floor-object";
import type { TableState, LiveTone } from "../FloorPlanReadOnly";
import { MaterialPalette } from "./materials";
import { setup3DScene, type SceneContext } from "./scene-builder";
import { createFloorObjectMesh, isTableType } from "./mesh-factory";
import { floorToWorld } from "./coordinates";

export interface FloorPlanReadOnly3DProps {
  width: number;
  height: number;
  objects: FloorObject[];
  tableStates?: Record<string, TableState>;
  selectedTableId?: string | null;
  onSelectTable?: (tableId: string) => void;
  liveTables?: Record<string, LiveTone>;
}

export function FloorPlanReadOnly3D({
  width,
  height,
  objects,
  tableStates,
  selectedTableId = null,
  onSelectTable,
  liveTables,
}: FloorPlanReadOnly3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneCtxRef = useRef<SceneContext | null>(null);
  const paletteRef = useRef<MaterialPalette | null>(null);

  const [hoveredTable, setHoveredTable] = useState<{
    id: string;
    name: string;
    capacity: number;
    state: TableState | "selected";
    screenX: number;
    screenY: number;
  } | null>(null);

  // 1. Setup 3D Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const palette = new MaterialPalette();
    paletteRef.current = palette;

    const sceneCtx = setup3DScene(container, { width, height }, palette, false);
    sceneCtxRef.current = sceneCtx;

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      sceneCtx.controls.update();
      sceneCtx.renderer.render(sceneCtx.scene, sceneCtx.camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      sceneCtx.dispose();
      palette.dispose();
      sceneCtxRef.current = null;
      paletteRef.current = null;
    };
  }, [width, height]);

  // 2. Render Objects with Table Availability
  useEffect(() => {
    const sceneCtx = sceneCtxRef.current;
    const palette = paletteRef.current;
    if (!sceneCtx || !palette) return;

    while (sceneCtx.objectsRoot.children.length > 0) {
      sceneCtx.objectsRoot.remove(sceneCtx.objectsRoot.children[0]);
    }

    objects.forEach((obj) => {
      const isTable = isTableType(obj.type);
      let visualState: "default" | "selected" | "free" | "taken" | "too_small" | "hovered" = "default";

      if (isTable) {
        if (selectedTableId === obj.id) {
          visualState = "selected";
        } else if (hoveredTable?.id === obj.id) {
          visualState = "hovered";
        } else if (tableStates && tableStates[obj.id]) {
          visualState = tableStates[obj.id];
        } else if (liveTables && liveTables[obj.id]) {
          visualState = liveTables[obj.id].label === "Free" ? "free" : "taken";
        } else {
          visualState = "free";
        }
      }

      const mesh = createFloorObjectMesh(obj, { palette, state: visualState });
      const pos = floorToWorld(obj, { width, height });

      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.rotation.y = pos.rotationY;

      sceneCtx.objectsRoot.add(mesh);
    });
  }, [objects, selectedTableId, tableStates, liveTables, hoveredTable?.id, width, height]);

  // 3. Pointer Hover & Click Selection
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const sceneCtx = sceneCtxRef.current;
    if (!sceneCtx) return;

    const rect = sceneCtx.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, sceneCtx.camera);

    const intersects = raycaster.intersectObjects(sceneCtx.objectsRoot.children, true);
    if (intersects.length > 0) {
      let current: THREE.Object3D | null = intersects[0].object;
      let targetObj: FloorObject | null = null;

      while (current && current !== sceneCtx.objectsRoot) {
        if (current.userData?.id) {
          const found = objects.find((o) => o.id === current?.userData.id);
          if (found && isTableType(found.type)) {
            targetObj = found;
            break;
          }
        }
        current = current.parent;
      }

      if (targetObj) {
        const capacity = (targetObj.metadata?.capacity as number) ?? 4;
        const name = (targetObj.metadata?.name as string) ?? `Table ${targetObj.id.slice(0, 4)}`;
        let state: TableState | "selected" = "free";
        if (selectedTableId === targetObj.id) {
          state = "selected";
        } else if (tableStates && tableStates[targetObj.id]) {
          state = tableStates[targetObj.id];
        }

        setHoveredTable({
          id: targetObj.id,
          name,
          capacity,
          state,
          screenX: event.clientX - rect.left,
          screenY: event.clientY - rect.top,
        });
        return;
      }
    }

    setHoveredTable(null);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // Only primary click
    if (event.button !== 0 || !onSelectTable) return;

    const sceneCtx = sceneCtxRef.current;
    if (!sceneCtx) return;

    const rect = sceneCtx.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, sceneCtx.camera);

    const intersects = raycaster.intersectObjects(sceneCtx.objectsRoot.children, true);
    if (intersects.length > 0) {
      let current: THREE.Object3D | null = intersects[0].object;
      let targetId: string | null = null;

      while (current && current !== sceneCtx.objectsRoot) {
        if (current.userData?.id) {
          const found = objects.find((o) => o.id === current?.userData.id);
          if (found && isTableType(found.type)) {
            targetId = found.id;
            break;
          }
        }
        current = current.parent;
      }

      if (targetId) {
        const state = tableStates ? tableStates[targetId] : "free";
        // Free tables or already selected tables can be chosen
        if (state === "free" || targetId === selectedTableId || !tableStates) {
          onSelectTable(targetId);
        }
      }
    }
  };

  const resetCamera = () => {
    const sceneCtx = sceneCtxRef.current;
    if (!sceneCtx) return;
    const maxDim = Math.max(width, height, 8);
    sceneCtx.camera.position.set(maxDim * 0.75, maxDim * 1.1, maxDim * 1.2);
    sceneCtx.controls.target.set(0, 0.3, 0);
    sceneCtx.controls.update();
  };

  return (
    <div className="relative flex h-full w-full min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[#E5DFD3] bg-[#F5F2EB]">
      {/* 3D Canvas */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        className="h-full w-full flex-1 cursor-grab active:cursor-grabbing"
      />

      {/* Floating Header */}
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5DFD3] bg-white/95 px-3 py-1 text-xs font-semibold text-[#423E3A] shadow-xs backdrop-blur-xs">
          <Sparkles className="h-3.5 w-3.5 text-[#B55234]" />
          3D Interactive Restaurant View
        </span>
      </div>

      <div className="absolute right-4 top-4 flex items-center gap-2">
        <button
          type="button"
          onClick={resetCamera}
          title="Reset Camera View"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5DFD3] bg-white/95 text-[#423E3A] shadow-xs backdrop-blur-xs transition hover:bg-white"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Hover Tooltip Overlay */}
      {hoveredTable && (
        <div
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full transform rounded-xl border border-[#E5DFD3] bg-white/95 p-2.5 text-xs shadow-lg backdrop-blur-xs transition-transform"
          style={{
            left: hoveredTable.screenX,
            top: Math.max(30, hoveredTable.screenY - 14),
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-[#2C2723]">{hoveredTable.name}</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-[#6B6358]">
              <Users className="h-3 w-3" />
              {hoveredTable.capacity} guests
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px]">
            {hoveredTable.state === "selected" ? (
              <span className="font-semibold text-[#B55234]">Selected table</span>
            ) : hoveredTable.state === "free" ? (
              <span className="font-semibold text-[#2E7D32]">Click to select table</span>
            ) : hoveredTable.state === "taken" ? (
              <span className="text-[#78716C]">Already booked</span>
            ) : (
              <span className="text-[#C05621]">Too small for party</span>
            )}
          </div>
        </div>
      )}

      {/* Legend at bottom */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-4 rounded-full border border-[#E5DFD3] bg-white/90 px-4 py-1.5 text-[11px] font-medium text-[#423E3A] shadow-xs backdrop-blur-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#2E7D32]" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#B55234]" />
          Selected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#78716C]" />
          Booked / Unavailable
        </span>
      </div>
    </div>
  );
}
