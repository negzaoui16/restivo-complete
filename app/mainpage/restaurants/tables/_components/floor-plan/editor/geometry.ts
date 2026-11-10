import type { FloorObject } from "../floor-object";
import { MIN_OBJECT_SIZE } from "./constants";

export type Point = { x: number; y: number };
export type Guide = { axis: "x" | "y"; at: number };
export type Corner = "nw" | "ne" | "sw" | "se";

type Box = Pick<FloorObject, "x" | "y" | "width" | "height">;

export function roundMeters(value: number) {
  return Math.round(value * 100) / 100;
}

export function clientToFloor(floor: HTMLElement, clientX: number, clientY: number): Point {
  const rect = floor.getBoundingClientRect();
  const meter = Number.parseFloat(getComputedStyle(floor).getPropertyValue("--floor-meter"));
  const scale = Number.isFinite(meter) && meter > 0 ? meter : 1;
  return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
}

export function clampBox(box: Box, floorWidth: number, floorHeight: number): Box {
  const width = Math.min(Math.max(box.width, MIN_OBJECT_SIZE), floorWidth);
  const height = Math.min(Math.max(box.height, MIN_OBJECT_SIZE), floorHeight);
  return {
    width: roundMeters(width),
    height: roundMeters(height),
    x: roundMeters(Math.min(Math.max(box.x, 0), floorWidth - width)),
    y: roundMeters(Math.min(Math.max(box.y, 0), floorHeight - height)),
  };
}

export function snapPosition(
  box: Box,
  others: Box[],
  grid: number | null,
  threshold: number,
): { x: number; y: number; guides: Guide[] } {
  const x = snapAxis(box.x, box.width, grid, edges(others, "x"), threshold);
  const y = snapAxis(box.y, box.height, grid, edges(others, "y"), threshold);
  const guides: Guide[] = [];
  if (x.guide != null) guides.push({ axis: "x", at: x.guide });
  if (y.guide != null) guides.push({ axis: "y", at: y.guide });
  return { x: x.value, y: y.value, guides };
}

export function resizeFromCorner(object: FloorObject, corner: Corner, pointer: Point, grid: number | null): Box {
  const center = { x: object.x + object.width / 2, y: object.y + object.height / 2 };
  const local = rotate(pointer.x - center.x, pointer.y - center.y, -object.rotation);
  const signX = corner === "nw" || corner === "sw" ? -1 : 1;
  const signY = corner === "nw" || corner === "ne" ? -1 : 1;
  const anchor = { x: -signX * (object.width / 2), y: -signY * (object.height / 2) };

  let width = (local.x - anchor.x) * signX;
  let height = (local.y - anchor.y) * signY;
  if (grid) {
    width = Math.round(width / grid) * grid;
    height = Math.round(height / grid) * grid;
  }
  width = Math.max(width, MIN_OBJECT_SIZE);
  height = Math.max(height, MIN_OBJECT_SIZE);

  const worldAnchor = shift(center, rotate(anchor.x, anchor.y, object.rotation));
  const nextAnchor = rotate(-signX * (width / 2), -signY * (height / 2), object.rotation);
  const nextCenter = { x: worldAnchor.x - nextAnchor.x, y: worldAnchor.y - nextAnchor.y };

  return {
    x: roundMeters(nextCenter.x - width / 2),
    y: roundMeters(nextCenter.y - height / 2),
    width: roundMeters(width),
    height: roundMeters(height),
  };
}

export function rotationFromPointer(object: FloorObject, pointer: Point, step: number | null) {
  const centerX = object.x + object.width / 2;
  const centerY = object.y + object.height / 2;
  const radians = Math.atan2(pointer.y - centerY, pointer.x - centerX);
  let degrees = (radians * 180) / Math.PI + 90;
  degrees = normalize(degrees);
  if (step) degrees = normalize(Math.round(degrees / step) * step);
  return roundMeters(degrees);
}

function snapAxis(start: number, size: number, grid: number | null, lines: number[], threshold: number) {
  const anchors = [0, size / 2, size];
  let value = start;
  let distance = Number.POSITIVE_INFINITY;
  let guide: number | null = null;

  if (grid) {
    const snapped = Math.round(start / grid) * grid;
    distance = Math.abs(snapped - start);
    value = snapped;
    guide = snapped;
  }

  if (threshold > 0) {
    for (const line of lines) {
      for (const offset of anchors) {
        const current = start + offset;
        const delta = Math.abs(line - current);
        if (delta <= threshold && delta < distance) {
          distance = delta;
          value = start + (line - current);
          guide = line;
        }
      }
    }
  }

  return { value: roundMeters(value), guide };
}

function edges(objects: Box[], axis: "x" | "y") {
  return objects.flatMap((object) => {
    const start = axis === "x" ? object.x : object.y;
    const size = axis === "x" ? object.width : object.height;
    return [start, start + size / 2, start + size];
  });
}

function rotate(x: number, y: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

function shift(origin: Point, delta: Point): Point {
  return { x: origin.x + delta.x, y: origin.y + delta.y };
}

function normalize(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}
