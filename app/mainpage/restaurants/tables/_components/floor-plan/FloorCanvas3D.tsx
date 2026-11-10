"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import * as THREE from "three";
import { RotateCcw, Box, Info } from "lucide-react";
import { useFloorEditorContext } from "./editor/context";
import { FLOOR_MIME } from "./editor/constants";
import { isFloorObjectType, type FloorObject } from "./floor-object";
import { MaterialPalette } from "@/app/mainpage/_components/floor-3d/materials";
import { setup3DScene, type SceneContext } from "@/app/mainpage/_components/floor-3d/scene-builder";
import { createFloorObjectMesh } from "@/app/mainpage/_components/floor-3d/mesh-factory";
import { floorToWorld, worldToFloor } from "@/app/mainpage/_components/floor-3d/coordinates";

export function FloorCanvas3D() {
  const editor = useFloorEditorContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneCtxRef = useRef<SceneContext | null>(null);
  const paletteRef = useRef<MaterialPalette | null>(null);

  // Drag-and-move state in 3D
  const dragActiveRef = useRef(false);
  const pointerStateRef = useRef<{ apply: typeof editor.applyPointer; end: typeof editor.endPointer }>({
    apply: editor.applyPointer,
    end: editor.endPointer,
  });

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Keep ref updated
  useEffect(() => {
    pointerStateRef.current = {
      apply: editor.applyPointer,
      end: editor.endPointer,
    };
  });

  // 1. Initialize Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const palette = new MaterialPalette();
    paletteRef.current = palette;

    const sceneCtx = setup3DScene(
      container,
      { width: editor.width, height: editor.height },
      palette,
      editor.showGrid,
    );
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
  }, [editor.width, editor.height, editor.showGrid]);

  // 2. Synchronize Objects in 3D Scene
  useEffect(() => {
    const sceneCtx = sceneCtxRef.current;
    const palette = paletteRef.current;
    if (!sceneCtx || !palette) return;

    // Clear previous meshes
    while (sceneCtx.objectsRoot.children.length > 0) {
      const child = sceneCtx.objectsRoot.children[0];
      sceneCtx.objectsRoot.remove(child);
    }

    // Build new meshes
    editor.objects.forEach((obj: FloorObject) => {
      const isSelected = obj.id === editor.selectedId;
      const isHovered = obj.id === hoveredId;

      let state: "default" | "selected" | "hovered" = "default";
      if (isSelected) state = "selected";
      else if (isHovered) state = "hovered";

      const mesh = createFloorObjectMesh(obj, { palette, state });
      const pos = floorToWorld(obj, { width: editor.width, height: editor.height });

      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.rotation.y = pos.rotationY;

      sceneCtx.objectsRoot.add(mesh);
    });
  }, [editor.objects, editor.selectedId, hoveredId, editor.width, editor.height]);

  // 3. Pointer Interactions (Click to select & Drag to move)
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const sceneCtx = sceneCtxRef.current;
    if (!sceneCtx) return;

    // Only process primary click
    if (event.button !== 0) return;

    const rect = sceneCtx.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, sceneCtx.camera);

    // Check hit on objects
    const intersects = raycaster.intersectObjects(sceneCtx.objectsRoot.children, true);
    if (intersects.length > 0) {
      let current: THREE.Object3D | null = intersects[0].object;
      let targetId: string | null = null;

      while (current && current !== sceneCtx.objectsRoot) {
        if (current.userData && current.userData.id) {
          targetId = current.userData.id;
          break;
        }
        current = current.parent;
      }

      if (targetId) {
        editor.select(targetId);

        // Initiate 3D move gesture if not in preview mode
        if (!editor.preview) {
          const groundHits = raycaster.intersectObject(sceneCtx.groundRaycastPlane, false);
          if (groundHits.length > 0) {
            const hitPoint = worldToFloor(groundHits[0].point, { width: editor.width, height: editor.height });
            editor.startMove(targetId, hitPoint);
            dragActiveRef.current = true;
            sceneCtx.controls.enabled = false; // Disable orbit controls while moving an object
          }
        }
        return;
      }
    }

    // Hit empty floor: deselect
    const floorHits = raycaster.intersectObject(sceneCtx.floorMesh, false);
    if (floorHits.length > 0) {
      editor.select(null);
    }
  };

  // Window pointer listeners for smooth 3D dragging
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const sceneCtx = sceneCtxRef.current;
      if (!sceneCtx) return;

      const rect = sceneCtx.renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, sceneCtx.camera);

      if (dragActiveRef.current) {
        const groundHits = raycaster.intersectObject(sceneCtx.groundRaycastPlane, false);
        if (groundHits.length > 0) {
          const point = worldToFloor(groundHits[0].point, { width: editor.width, height: editor.height });
          pointerStateRef.current.apply(point);
        }
      } else {
        // Hover state detection
        const intersects = raycaster.intersectObjects(sceneCtx.objectsRoot.children, true);
        if (intersects.length > 0) {
          let current: THREE.Object3D | null = intersects[0].object;
          let targetId: string | null = null;
          while (current && current !== sceneCtx.objectsRoot) {
            if (current.userData?.id) {
              targetId = current.userData.id;
              break;
            }
            current = current.parent;
          }
          setHoveredId(targetId);
        } else {
          setHoveredId(null);
        }
      }
    };

    const onPointerUp = () => {
      if (dragActiveRef.current) {
        dragActiveRef.current = false;
        pointerStateRef.current.end();
        if (sceneCtxRef.current) {
          sceneCtxRef.current.controls.enabled = true;
        }
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [editor.width, editor.height]);

  // 4. Drag & Drop from Catalog into 3D
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (editor.preview) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (editor.preview) return;
    e.preventDefault();

    const raw = e.dataTransfer.getData(FLOOR_MIME);
    if (!isFloorObjectType(raw)) return;

    const sceneCtx = sceneCtxRef.current;
    if (!sceneCtx) return;

    const rect = sceneCtx.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, sceneCtx.camera);

    const hits = raycaster.intersectObject(sceneCtx.groundRaycastPlane, false);
    if (hits.length > 0) {
      const dropPoint = worldToFloor(hits[0].point, { width: editor.width, height: editor.height });
      editor.addAt(raw, dropPoint);
    }
  };

  // Reset Camera View
  const resetCamera = () => {
    const sceneCtx = sceneCtxRef.current;
    if (!sceneCtx) return;
    const maxDim = Math.max(editor.width, editor.height, 8);
    sceneCtx.camera.position.set(maxDim * 0.75, maxDim * 1.1, maxDim * 1.2);
    sceneCtx.controls.target.set(0, 0.3, 0);
    sceneCtx.controls.update();
  };

  return (
    <div
      className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#E5DFD3] bg-[#F5F2EB]"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 3D Canvas Mount Point */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        className="h-full w-full cursor-grab active:cursor-grabbing"
      />

      {/* Floating 3D Toolbar & Controls */}
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5DFD3] bg-white/90 px-3 py-1 text-xs font-semibold text-[#423E3A] shadow-xs backdrop-blur-xs">
          <Box className="h-3.5 w-3.5 text-[#B55234]" />
          3D Studio
        </span>
        <span className="text-[11px] font-medium text-[#7D766C]">
          {editor.width}m × {editor.height}m
        </span>
      </div>

      <div className="absolute right-4 top-4 flex items-center gap-2">
        <button
          type="button"
          onClick={resetCamera}
          title="Reset Camera View"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5DFD3] bg-white/90 text-[#423E3A] shadow-xs backdrop-blur-xs transition hover:bg-white"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowHelp((prev) => !prev)}
          title="3D Navigation Controls"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5DFD3] bg-white/90 text-[#423E3A] shadow-xs backdrop-blur-xs transition hover:bg-white"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {/* Help Modal / Tooltip */}
      {showHelp && (
        <div className="absolute bottom-4 right-4 z-20 max-w-xs rounded-xl border border-[#E5DFD3] bg-white/95 p-3.5 text-xs text-[#524C44] shadow-md backdrop-blur-xs">
          <p className="font-semibold text-[#2C2723]">3D Navigation & Controls</p>
          <ul className="mt-2 space-y-1 text-[11px]">
            <li>• <strong>Left Click + Drag:</strong> Rotate & Orbit camera</li>
            <li>• <strong>Right Click + Drag:</strong> Pan camera</li>
            <li>• <strong>Scroll Wheel:</strong> Zoom in & out</li>
            <li>• <strong>Drag from Catalog:</strong> Drop tables directly in 3D</li>
            <li>• <strong>Click Table:</strong> Select & move across the floor</li>
          </ul>
        </div>
      )}

      {/* Bottom Hint Banner */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-[#E5DFD3] bg-white/80 px-4 py-1.5 text-[11px] font-medium text-[#6B6358] shadow-xs backdrop-blur-xs">
        Drag items from the left palette to place in 3D • Click & drag to move
      </div>
    </div>
  );
}
