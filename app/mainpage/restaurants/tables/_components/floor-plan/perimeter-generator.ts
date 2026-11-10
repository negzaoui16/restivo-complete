import { createFloorObject, type FloorObject } from "./floor-object";

export type WallSide = "bottom" | "top" | "left" | "right";

export interface PerimeterConfig {
  floorWidth: number;
  floorHeight: number;
  wallThickness?: number;
  doorWall: WallSide;
  doorPosition?: number; // 0.1 to 0.9, e.g. 0.5 = center
  doorWidth?: number; // default 0.9m
  windows?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  lockedWalls?: boolean;
}

interface OpeningInterval {
  type: "DOOR" | "WINDOW";
  start: number;
  length: number;
}

function round(val: number): number {
  return Math.round(val * 100) / 100;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Distributes window openings in an available interval.
 * Returns opening intervals that fit without collision.
 */
function fitWindowsInInterval(
  startOffset: number,
  intervalLength: number,
  targetCount: number,
  windowLength: number,
  minWallGap = 0.25,
): OpeningInterval[] {
  if (targetCount <= 0 || intervalLength < windowLength + minWallGap * 2) {
    return [];
  }

  // How many windows can realistically fit with at least minWallGap between them?
  const maxFit = Math.max(1, Math.floor((intervalLength - minWallGap) / (windowLength + minWallGap)));
  const count = Math.min(targetCount, maxFit);

  const totalWindowLength = count * windowLength;
  const remainingWall = intervalLength - totalWindowLength;
  const gap = remainingWall / (count + 1);

  const results: OpeningInterval[] = [];
  for (let i = 0; i < count; i++) {
    const start = round(startOffset + gap + i * (windowLength + gap));
    results.push({
      type: "WINDOW",
      start,
      length: windowLength,
    });
  }

  return results;
}

/**
 * Generates wall, door, and window objects for one side of the perimeter.
 */
function generateSideObjects(options: {
  side: WallSide;
  floorWidth: number;
  floorHeight: number;
  wallThickness: number;
  hasDoor: boolean;
  doorPosition: number;
  doorWidth: number;
  windowCount: number;
  windowLength: number;
  lockedWalls: boolean;
}): FloorObject[] {
  const {
    side,
    floorWidth,
    floorHeight,
    wallThickness: t,
    hasDoor,
    doorPosition,
    doorWidth,
    windowCount,
    windowLength,
    lockedWalls,
  } = options;

  const isHorizontal = side === "top" || side === "bottom";
  const wallSpanStart = isHorizontal ? 0 : t;
  const wallSpanEnd = isHorizontal ? floorWidth : floorHeight - t;
  const totalSpan = wallSpanEnd - wallSpanStart;

  const openings: OpeningInterval[] = [];

  // 1. Position Door if on this wall
  let doorOpening: OpeningInterval | null = null;
  if (hasDoor) {
    const minStart = round(wallSpanStart + t + 0.1);
    const maxStart = round(wallSpanEnd - t - 0.1 - doorWidth);
    const targetCenter = wallSpanStart + totalSpan * clamp(doorPosition, 0.1, 0.9);
    const desiredStart = round(targetCenter - doorWidth / 2);
    const safeStart = maxStart >= minStart ? clamp(desiredStart, minStart, maxStart) : minStart;

    doorOpening = {
      type: "DOOR",
      start: safeStart,
      length: doorWidth,
    };
    openings.push(doorOpening);
  }

  // 2. Position Windows
  if (windowCount > 0) {
    if (!doorOpening) {
      // Entire wall span available for windows
      const winOpenings = fitWindowsInInterval(wallSpanStart + t, totalSpan - 2 * t, windowCount, windowLength);
      openings.push(...winOpenings);
    } else {
      // Door divides wall into before-door and after-door sections
      const beforeSpanStart = wallSpanStart + t;
      const beforeSpanLen = doorOpening.start - beforeSpanStart;

      const afterSpanStart = doorOpening.start + doorOpening.length;
      const afterSpanLen = wallSpanEnd - t - afterSpanStart;

      // Distribute windows proportionally between sides
      let countBefore = 0;
      let countAfter = 0;
      if (windowCount === 1) {
        if (beforeSpanLen >= afterSpanLen) countBefore = 1;
        else countAfter = 1;
      } else {
        const ratio = beforeSpanLen / Math.max(0.1, beforeSpanLen + afterSpanLen);
        countBefore = Math.round(windowCount * ratio);
        countAfter = windowCount - countBefore;
      }

      if (countBefore > 0) {
        openings.push(...fitWindowsInInterval(beforeSpanStart, beforeSpanLen, countBefore, windowLength));
      }
      if (countAfter > 0) {
        openings.push(...fitWindowsInInterval(afterSpanStart, afterSpanLen, countAfter, windowLength));
      }
    }
  }

  // Sort openings along the wall from start to end
  openings.sort((a, b) => a.start - b.start);

  const objects: FloorObject[] = [];
  let cursor = wallSpanStart;

  for (const op of openings) {
    // Generate solid wall segment before this opening
    const wallSegLength = round(op.start - cursor);
    if (wallSegLength >= 0.05) {
      objects.push(buildWallSegment(side, cursor, wallSegLength, t, floorWidth, floorHeight, lockedWalls));
    }

    // Generate the opening object (DOOR or WINDOW)
    if (op.type === "DOOR") {
      objects.push(buildDoorObject(side, op.start, op.length, floorWidth, floorHeight, lockedWalls));
    } else {
      objects.push(buildWindowObject(side, op.start, op.length, t, floorWidth, floorHeight, lockedWalls));
    }

    cursor = round(op.start + op.length);
  }

  // Generate final wall segment after last opening
  const finalSegLength = round(wallSpanEnd - cursor);
  if (finalSegLength >= 0.05) {
    objects.push(buildWallSegment(side, cursor, finalSegLength, t, floorWidth, floorHeight, lockedWalls));
  }

  return objects;
}

function buildWallSegment(
  side: WallSide,
  start: number,
  length: number,
  thickness: number,
  floorWidth: number,
  floorHeight: number,
  locked: boolean,
): FloorObject {
  switch (side) {
    case "top":
      return createFloorObject("WALL", {
        x: round(start),
        y: 0,
        width: round(length),
        height: thickness,
        rotation: 0,
        zIndex: 1,
        locked,
      });
    case "bottom":
      return createFloorObject("WALL", {
        x: round(start),
        y: round(floorHeight - thickness),
        width: round(length),
        height: thickness,
        rotation: 0,
        zIndex: 1,
        locked,
      });
    case "left":
      return createFloorObject("WALL", {
        x: 0,
        y: round(start),
        width: thickness,
        height: round(length),
        rotation: 0,
        zIndex: 1,
        locked,
      });
    case "right":
      return createFloorObject("WALL", {
        x: round(floorWidth - thickness),
        y: round(start),
        width: thickness,
        height: round(length),
        rotation: 0,
        zIndex: 1,
        locked,
      });
  }
}

function buildDoorObject(
  side: WallSide,
  start: number,
  doorWidth: number,
  floorWidth: number,
  floorHeight: number,
  locked: boolean,
): FloorObject {
  switch (side) {
    case "top":
      return createFloorObject("DOOR", {
        x: round(start),
        y: 0,
        width: doorWidth,
        height: doorWidth,
        rotation: 180,
        zIndex: 2,
        locked,
      });
    case "bottom":
      return createFloorObject("DOOR", {
        x: round(start),
        y: round(floorHeight - doorWidth),
        width: doorWidth,
        height: doorWidth,
        rotation: 0,
        zIndex: 2,
        locked,
      });
    case "left":
      return createFloorObject("DOOR", {
        x: 0,
        y: round(start),
        width: doorWidth,
        height: doorWidth,
        rotation: 90,
        zIndex: 2,
        locked,
      });
    case "right":
      return createFloorObject("DOOR", {
        x: round(floorWidth - doorWidth),
        y: round(start),
        width: doorWidth,
        height: doorWidth,
        rotation: 270,
        zIndex: 2,
        locked,
      });
  }
}

function buildWindowObject(
  side: WallSide,
  start: number,
  windowLength: number,
  thickness: number,
  floorWidth: number,
  floorHeight: number,
  locked: boolean,
): FloorObject {
  switch (side) {
    case "top":
      return createFloorObject("WINDOW", {
        x: round(start),
        y: 0,
        width: round(windowLength),
        height: thickness,
        rotation: 0,
        zIndex: 2,
        locked,
      });
    case "bottom":
      return createFloorObject("WINDOW", {
        x: round(start),
        y: round(floorHeight - thickness),
        width: round(windowLength),
        height: thickness,
        rotation: 0,
        zIndex: 2,
        locked,
      });
    case "left":
      return createFloorObject("WINDOW", {
        x: 0,
        y: round(start),
        width: thickness,
        height: round(windowLength),
        rotation: 0,
        zIndex: 2,
        locked,
      });
    case "right":
      return createFloorObject("WINDOW", {
        x: round(floorWidth - thickness),
        y: round(start),
        width: thickness,
        height: round(windowLength),
        rotation: 0,
        zIndex: 2,
        locked,
      });
  }
}

/**
 * Generates all perimeter walls, entrance door, and windows around the entire floor layout.
 */
export function generatePerimeterWalls(config: PerimeterConfig): FloorObject[] {
  const {
    floorWidth,
    floorHeight,
    wallThickness = 0.2,
    doorWall = "bottom",
    doorPosition = 0.5,
    doorWidth = 0.9,
    windows = {},
    lockedWalls = false,
  } = config;

  const windowLength = 1.4;

  const topObjects = generateSideObjects({
    side: "top",
    floorWidth,
    floorHeight,
    wallThickness,
    hasDoor: doorWall === "top",
    doorPosition,
    doorWidth,
    windowCount: windows.top ?? 0,
    windowLength,
    lockedWalls,
  });

  const bottomObjects = generateSideObjects({
    side: "bottom",
    floorWidth,
    floorHeight,
    wallThickness,
    hasDoor: doorWall === "bottom",
    doorPosition,
    doorWidth,
    windowCount: windows.bottom ?? 0,
    windowLength,
    lockedWalls,
  });

  const leftObjects = generateSideObjects({
    side: "left",
    floorWidth,
    floorHeight,
    wallThickness,
    hasDoor: doorWall === "left",
    doorPosition,
    doorWidth,
    windowCount: windows.left ?? 0,
    windowLength,
    lockedWalls,
  });

  const rightObjects = generateSideObjects({
    side: "right",
    floorWidth,
    floorHeight,
    wallThickness,
    hasDoor: doorWall === "right",
    doorPosition,
    doorWidth,
    windowCount: windows.right ?? 0,
    windowLength,
    lockedWalls,
  });

  return [...topObjects, ...bottomObjects, ...leftObjects, ...rightObjects];
}

/**
 * Checks whether an object is positioned along the outer perimeter boundary of the floor.
 */
export function isPerimeterObject(
  obj: FloorObject,
  floorWidth: number,
  floorHeight: number,
  margin = 0.35,
): boolean {
  if (obj.type !== "WALL" && obj.type !== "DOOR" && obj.type !== "WINDOW") {
    return false;
  }
  return (
    obj.x <= margin ||
    obj.x + obj.width >= floorWidth - margin ||
    obj.y <= margin ||
    obj.y + obj.height >= floorHeight - margin
  );
}
