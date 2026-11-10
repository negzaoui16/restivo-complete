import type { FloorObject } from "../floor-object";
import { GRID_SIZE, OBJECT_SNAP, ROTATE_STEP } from "./constants";
import {
  clampBox,
  resizeFromCorner,
  rotationFromPointer,
  snapPosition,
  type Corner,
  type Guide,
  type Point,
} from "./geometry";

export type Gesture = {
  kind: "move" | "resize" | "rotate";
  id: string;
  origin: FloorObject;
  pointer: Point;
  corner?: Corner;
  before: FloorObject[];
};

export function applyGesture(
  gesture: Gesture,
  point: Point,
  floor: { width: number; height: number },
  snap: boolean,
): { objects: FloorObject[]; guides: Guide[] } {
  const grid = snap ? GRID_SIZE : null;
  const threshold = snap ? OBJECT_SNAP : 0;
  const guides: Guide[] = [];

  const objects = gesture.before.map((object) => {
    if (object.id !== gesture.id) return object;
    return moveObject(object, gesture, point, floor, grid, threshold, snap, guides);
  });

  return { objects, guides };
}

function moveObject(
  object: FloorObject,
  gesture: Gesture,
  point: Point,
  floor: { width: number; height: number },
  grid: number | null,
  threshold: number,
  snap: boolean,
  guides: Guide[],
) {
  if (gesture.kind === "move") {
    const snapped = snapPosition(
      {
        ...gesture.origin,
        x: gesture.origin.x + (point.x - gesture.pointer.x),
        y: gesture.origin.y + (point.y - gesture.pointer.y),
      },
      gesture.before.filter((item) => item.id !== object.id),
      grid,
      threshold,
    );
    guides.push(...snapped.guides);
    return { ...object, ...clampBox({ ...object, x: snapped.x, y: snapped.y }, floor.width, floor.height) };
  }

  if (gesture.kind === "resize" && gesture.corner) {
    const sized = resizeFromCorner(gesture.origin, gesture.corner, point, grid);
    return { ...object, ...clampBox(sized, floor.width, floor.height) };
  }

  return {
    ...object,
    rotation: rotationFromPointer(gesture.origin, point, snap ? ROTATE_STEP : null),
  };
}
