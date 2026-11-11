"use client";

import { useCallback, useEffect, useState } from "react";
import { createFloorObject, type FloorObject, type FloorObjectType } from "../floor-object";
import { isPerimeterObject } from "../perimeter-generator";
import { GRID_SIZE, OBJECT_SNAP, ZOOM_STEPS } from "./constants";
import { clampBox, snapPosition, type Corner, type Guide, type Point } from "./geometry";
import { applyGesture, type Gesture } from "./gesture";

export type FloorEditorApi = {
  width: number;
  height: number;
  objects: FloorObject[];
  selectedId: string | null;
  selected: FloorObject | null;
  zoom: number;
  showGrid: boolean;
  snap: boolean;
  gridSize: number;
  guides: Guide[];
  preview: boolean;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
  notice: string | null;
  dragging: boolean;
  viewMode: "2d" | "3d";
  setViewMode: (mode: "2d" | "3d") => void;
  applyPointer: (point: Point) => void;
  endPointer: () => void;
  select: (id: string | null) => void;
  startMove: (id: string, point: Point) => void;
  startResize: (id: string, corner: Corner, point: Point) => void;
  startRotate: (id: string, point: Point) => void;
  addAt: (type: FloorObjectType, point: Point) => void;
  update: (id: string, partial: Partial<FloorObject>) => void;
  setCapacity: (id: string, capacity: number) => void;
  remove: (id: string) => void;
  undo: () => void;
  redo: () => void;
  zoomBy: (direction: -1 | 0 | 1) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  togglePreview: () => void;
  save: () => void;
  publish: () => void;
  applyPerimeterWalls: (perimeterObjects: FloorObject[], replaceExisting?: boolean) => void;
  perimeterModalOpen: boolean;
  setPerimeterModalOpen: (open: boolean) => void;
  applyAiLayout: (newObjects: FloorObject[], mode?: "replace" | "merge") => void;
  aiModalOpen: boolean;
  setAiModalOpen: (open: boolean) => void;
};

export function useFloorEditor(options: {
  width: number;
  height: number;
  initialObjects: FloorObject[];
  onSave?: (objects: FloorObject[]) => Promise<void>;
  onPublish?: (objects: FloorObject[]) => Promise<void>;
}): FloorEditorApi {
  const { width, height, initialObjects, onSave, onPublish } = options;
  const [objects, setObjects] = useState(initialObjects);
  const [past, setPast] = useState<FloorObject[][]>([]);
  const [future, setFuture] = useState<FloorObject[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [preview, setPreview] = useState(false);
  const [perimeterModalOpen, setPerimeterModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);

  const selected = objects.find((object) => object.id === selectedId) ?? null;

  const commit = useCallback(
    (next: FloorObject[]) => {
      setPast((stack) => [...stack, objects].slice(-50));
      setFuture([]);
      setObjects(next);
      setNotice(null);
    },
    [objects],
  );

  const applyPerimeterWalls = useCallback(
    (perimeterObjects: FloorObject[], replaceExisting = true) => {
      const kept = replaceExisting
        ? objects.filter((obj) => !isPerimeterObject(obj, width, height))
        : objects;

      commit([...kept, ...perimeterObjects]);
      setSelectedId(null);
    },
    [commit, height, objects, width],
  );

  const applyAiLayout = useCallback(
    (newObjects: FloorObject[], mode: "replace" | "merge" = "replace") => {
      if (mode === "replace") {
        commit(newObjects);
      } else {
        commit([...objects, ...newObjects]);
      }
      setSelectedId(null);
      setNotice(`AI layout applied: ${newObjects.length} items`);
    },
    [commit, objects],
  );

  const undo = useCallback(() => {
    const previous = past.at(-1);
    if (!previous) return;
    setFuture((stack) => [objects, ...stack]);
    setPast((stack) => stack.slice(0, -1));
    setObjects(previous);
  }, [past, objects]);

  const redo = useCallback(() => {
    const next = future[0];
    if (!next) return;
    setPast((stack) => [...stack, objects]);
    setFuture((stack) => stack.slice(1));
    setObjects(next);
  }, [future, objects]);

  const update = useCallback(
    (id: string, partial: Partial<FloorObject>) => {
      commit(objects.map((object) => (object.id === id ? mergeObject(object, partial, width, height) : object)));
    },
    [commit, objects, width, height],
  );

  const remove = useCallback(
    (id: string) => {
      commit(objects.filter((object) => object.id !== id));
      setSelectedId((current) => (current === id ? null : current));
    },
    [commit, objects],
  );

  const setCapacity = useCallback(
    (id: string, capacity: number) => {
      const object = objects.find((item) => item.id === id);
      if (!object) return;
      update(id, { metadata: { ...object.metadata, capacity: Math.max(0, Math.round(capacity)) } });
    },
    [objects, update],
  );

  const addAt = useCallback(
    (type: FloorObjectType, point: Point) => {
      if (preview) return;
      const zIndex = Math.max(0, ...objects.map((object) => object.zIndex)) + 1;
      const created = createFloorObject(type, { x: point.x, y: point.y, zIndex });
      const snapped = snapPosition(created, objects, snap ? GRID_SIZE : null, snap ? OBJECT_SNAP : 0);
      const placed = { ...created, ...clampBox({ ...created, x: snapped.x, y: snapped.y }, width, height) };
      commit([...objects, placed]);
      setSelectedId(placed.id);
    },
    [commit, objects, preview, snap, width, height],
  );

  const startMove = useCallback(
    (id: string, point: Point) => {
      const origin = objects.find((object) => object.id === id);
      if (!origin) return;
      setSelectedId(id);
      if (preview || origin.locked) return;
      setGesture({ kind: "move", id, origin, pointer: point, before: objects });
    },
    [objects, preview],
  );

  const startResize = useCallback(
    (id: string, corner: Corner, point: Point) => {
      const origin = objects.find((object) => object.id === id);
      if (!origin || preview || origin.locked) return;
      setGesture({ kind: "resize", id, origin, pointer: point, corner, before: objects });
    },
    [objects, preview],
  );

  const startRotate = useCallback(
    (id: string, point: Point) => {
      const origin = objects.find((object) => object.id === id);
      if (!origin || preview || origin.locked) return;
      setGesture({ kind: "rotate", id, origin, pointer: point, before: objects });
    },
    [objects, preview],
  );

  const zoomBy = useCallback((direction: -1 | 0 | 1) => {
    setZoom((current) => nextZoom(current, direction));
  }, []);

  const persist = useCallback(
    async (publish: boolean) => {
      const run = publish ? onPublish : onSave;
      if (!run || saving) return;
      setSaving(true);
      setNotice(null);
      try {
        await run(objects);
        setNotice(publish ? "Published" : "Saved");
        if (publish) setPreview(false);
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Could not save this floor.");
      } finally {
        setSaving(false);
      }
    },
    [objects, onPublish, onSave, saving],
  );

  const applyPointer = useCallback(
    (point: Point) => {
      if (!gesture) return;
      const result = applyGesture(gesture, point, { width, height }, snap);
      setObjects(result.objects);
      setGuides(result.guides);
    },
    [gesture, height, snap, width],
  );

  const endPointer = useCallback(() => {
    if (gesture && JSON.stringify(gesture.before) !== JSON.stringify(objects)) {
      setPast((stack) => [...stack, gesture.before].slice(-50));
      setFuture([]);
    }
    setGuides([]);
    setGesture(null);
  }, [gesture, objects]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      const shortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z";
      if (shortcut) {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        remove(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [redo, undo, remove, selectedId]);

  return {
    width,
    height,
    objects,
    selectedId,
    selected,
    zoom,
    showGrid,
    snap,
    gridSize: GRID_SIZE,
    guides,
    preview,
    viewMode,
    setViewMode,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    saving,
    notice,
    dragging: gesture !== null,
    applyPointer,
    endPointer,
    select: setSelectedId,
    startMove,
    startResize,
    startRotate,
    addAt,
    update,
    setCapacity,
    remove,
    undo,
    redo,
    zoomBy,
    toggleGrid: () => setShowGrid((value) => !value),
    toggleSnap: () => setSnap((value) => !value),
    togglePreview: () => setPreview((value) => !value),
    save: () => void persist(false),
    publish: () => void persist(true),
    applyPerimeterWalls,
    perimeterModalOpen,
    setPerimeterModalOpen,
    applyAiLayout,
    aiModalOpen,
    setAiModalOpen,
  };
}

function mergeObject(object: FloorObject, partial: Partial<FloorObject>, width: number, height: number) {
  const merged = { ...object, ...partial, metadata: partial.metadata ?? object.metadata };
  return { ...merged, ...clampBox(merged, width, height), rotation: normalizeAngle(merged.rotation) };
}

function nextZoom(current: number, direction: -1 | 0 | 1) {
  if (direction === 0) return 1;
  const index = ZOOM_STEPS.findIndex((step) => step >= current - 0.001);
  const nextIndex = Math.min(ZOOM_STEPS.length - 1, Math.max(0, index + direction));
  return ZOOM_STEPS[nextIndex] ?? current;
}

function normalizeAngle(value: number) {
  return Math.round((((value % 360) + 360) % 360) * 100) / 100;
}

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}
