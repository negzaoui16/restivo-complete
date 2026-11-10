export const CHAIR_WIDTH = 0.4;
export const CHAIR_DEPTH = 0.42;
export const STOOL_SIZE = 0.32;

const GAP = 0.05;
const MIN_SCALE = 0.55;

export type SeatMark = {
  x: number;
  y: number;
  /** Degrees clockwise. 0 faces +y (down); the backrest points toward -y. */
  rotation: number;
  scale: number;
};

type Side = "top" | "right" | "bottom" | "left";

export function seatCount(capacity?: number) {
  if (capacity == null || !Number.isFinite(capacity)) return 0;
  return Math.max(0, Math.floor(capacity));
}

function clampScale(value: number) {
  if (!Number.isFinite(value) || value <= 0) return MIN_SCALE;
  return Math.max(MIN_SCALE, Math.min(1, value));
}

export function seatsAroundEllipse(
  capacity: number | undefined,
  width: number,
  height: number,
  markWidth = CHAIR_WIDTH,
  markDepth = CHAIR_DEPTH,
): SeatMark[] {
  const count = seatCount(capacity);
  if (count === 0) return [];

  const radius = (width + height) / 4 + markDepth / 2 + GAP;
  const circumference = 2 * Math.PI * Math.max(radius, 0.1);
  const scale = clampScale(circumference / count / (markWidth * 1.15));
  const reach = (markDepth * scale) / 2 + GAP;
  const rx = width / 2 + reach;
  const ry = height / 2 + reach;

  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / count;
    return {
      x: Math.cos(angle) * rx,
      y: Math.sin(angle) * ry,
      rotation: ((angle + Math.PI / 2) * 180) / Math.PI,
      scale,
    };
  });
}

export function seatsAroundRect(
  capacity: number | undefined,
  width: number,
  height: number,
  markWidth = CHAIR_WIDTH,
  markDepth = CHAIR_DEPTH,
): SeatMark[] {
  const count = seatCount(capacity);
  if (count === 0) return [];

  const landscape = width >= height;
  const longSides: [Side, Side] = landscape ? ["top", "bottom"] : ["left", "right"];
  const shortSides: [Side, Side] = landscape ? ["left", "right"] : ["top", "bottom"];
  const counts: Record<Side, number> = { top: 0, right: 0, bottom: 0, left: 0 };
  const nearlySquare = Math.abs(width - height) / Math.max(width, height, 0.001) < 0.18;

  if (nearlySquare) {
    const base = Math.floor(count / 4);
    const extra = count % 4;
    const order: Side[] = ["top", "bottom", "left", "right"];
    for (const side of order) counts[side] = base;
    for (let index = 0; index < extra; index += 1) counts[order[index]] += 1;
  } else if (count === 1) {
    counts[longSides[0]] = 1;
  } else if (count === 2) {
    counts[longSides[0]] = 1;
    counts[longSides[1]] = 1;
  } else if (count === 3) {
    counts[longSides[0]] = 2;
    counts[longSides[1]] = 1;
  } else {
    counts[shortSides[0]] = 1;
    counts[shortSides[1]] = 1;
    const rest = count - 2;
    counts[longSides[0]] = Math.ceil(rest / 2);
    counts[longSides[1]] = Math.floor(rest / 2);
  }

  let scale = 1;
  for (const side of Object.keys(counts) as Side[]) {
    const sideCount = counts[side];
    if (sideCount <= 0) continue;
    const along = side === "top" || side === "bottom" ? width : height;
    scale = Math.min(scale, (along * 0.9) / (sideCount * markWidth * 1.08));
  }
  scale = clampScale(scale);

  const reach = (markDepth * scale) / 2 + GAP;
  const seats: SeatMark[] = [];

  for (const side of Object.keys(counts) as Side[]) {
    const sideCount = counts[side];
    if (sideCount <= 0) continue;
    const along = side === "top" || side === "bottom" ? width : height;
    const span = Math.max(0, Math.min(along - markWidth * scale, along * 0.84));

    for (let index = 0; index < sideCount; index += 1) {
      const offset = sideCount === 1 ? 0 : -span / 2 + (span * index) / (sideCount - 1);
      if (side === "top") seats.push({ x: offset, y: -height / 2 - reach, rotation: 0, scale });
      if (side === "bottom") seats.push({ x: offset, y: height / 2 + reach, rotation: 180, scale });
      if (side === "left") seats.push({ x: -width / 2 - reach, y: offset, rotation: -90, scale });
      if (side === "right") seats.push({ x: width / 2 + reach, y: offset, rotation: 90, scale });
    }
  }

  return seats;
}

/** Stools or seats in a row. Rotation 180 faces up, toward a counter above them. */
export function seatsAlongBottom(
  capacity: number | undefined,
  width: number,
  y: number,
  markWidth: number,
): SeatMark[] {
  const count = seatCount(capacity);
  if (count === 0) return [];

  const scale = clampScale((width * 0.88) / (count * markWidth * 1.08));
  const span = Math.max(0, Math.min(width - markWidth * scale, width * 0.86));

  return Array.from({ length: count }, (_, index) => ({
    x: count === 1 ? 0 : -span / 2 + (span * index) / (count - 1),
    y,
    rotation: 180,
    scale,
  }));
}
