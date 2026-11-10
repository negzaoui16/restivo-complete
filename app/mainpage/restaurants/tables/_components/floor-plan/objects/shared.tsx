import type { ReactNode } from "react";
import { CHAIR_DEPTH, CHAIR_WIDTH, STOOL_SIZE, type SeatMark } from "./geometry";

/**
 * Floor symbols are drawn in meters and centered on their box, so a parent
 * can place them on a meter grid and rotate around the center.
 *
 * Size on screen comes from `--floor-meter` (default 100px per meter).
 * Chairs and stools hang outside the table box; the canvas should not clip
 * overflow. Labels stay in your data — these drawings never include a name
 * or a table number.
 */
export const FLOOR_INK = "var(--floor-ink, #3A3530)";
export const FLOOR_SECONDARY = "var(--floor-ink-soft, #A3988C)";
export const FLOOR_SELECTED = "var(--floor-selected, #B55234)";
export const FLOOR_WASH = "var(--floor-wash, rgba(181, 82, 52, 0.14))";

const STROKE = 1.75;
const STROKE_SELECTED = 2.25;
const STROKE_FINE = 1.25;

export type FloorObjectProps = {
  /** Size along X, in meters. */
  width: number;
  /** Size along Y, in meters. */
  height: number;
  selected?: boolean;
  className?: string;
};

export type TableObjectProps = FloorObjectProps & {
  /** How many seats to draw. The glyph never prints this number. */
  capacity?: number;
};

export function positiveMeters(value: number) {
  if (!Number.isFinite(value) || value < 0.05) return 0.05;
  return value;
}

export function floorColors(selected?: boolean) {
  return {
    ink: selected ? FLOOR_SELECTED : FLOOR_INK,
    secondary: selected ? FLOOR_SELECTED : FLOOR_SECONDARY,
    wash: selected ? FLOOR_WASH : "transparent",
  };
}

export function floorPaint(selected?: boolean, detail = false) {
  const colors = floorColors(selected);
  return {
    fill: detail ? ("none" as const) : colors.wash,
    stroke: detail ? colors.secondary : colors.ink,
    strokeWidth: detail ? STROKE_FINE : selected ? STROKE_SELECTED : STROKE,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };
}

export function FloorSvg({
  width,
  height,
  className,
  children,
}: {
  width: number;
  height: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`}
      className={className}
      aria-hidden="true"
      focusable="false"
      data-floor-width={width}
      data-floor-height={height}
      style={{
        width: `calc(${width} * var(--floor-meter, 100px))`,
        height: `calc(${height} * var(--floor-meter, 100px))`,
        display: "block",
        overflow: "visible",
      }}
    >
      {children}
    </svg>
  );
}

type GlyphProps = SeatMark & {
  selected?: boolean;
};

export function ChairGlyph({ x, y, rotation, scale, selected = false }: GlyphProps) {
  const paint = floorPaint(selected);
  const width = CHAIR_WIDTH * scale;
  const depth = CHAIR_DEPTH * scale;
  const backHeight = depth * 0.22;
  const gap = depth * 0.08;
  const seatWidth = width * 0.86;
  const seatHeight = depth - backHeight - gap;

  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation})`}>
      <rect
        x={-width / 2}
        y={-depth / 2}
        width={width}
        height={backHeight}
        rx={backHeight / 2}
        {...paint}
      />
      <rect
        x={-seatWidth / 2}
        y={-depth / 2 + backHeight + gap}
        width={seatWidth}
        height={seatHeight}
        rx={Math.min(seatWidth, seatHeight) * 0.18}
        {...paint}
      />
    </g>
  );
}

export function StoolGlyph({ x, y, rotation, scale, selected = false }: GlyphProps) {
  const paint = floorPaint(selected);
  const detail = floorPaint(selected, true);
  const radius = (STOOL_SIZE / 2) * scale;

  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation})`}>
      <circle r={radius} {...paint} />
      <path
        d={`M ${-radius * 0.82} ${-radius * 0.1} Q 0 ${-radius * 1.28} ${radius * 0.82} ${-radius * 0.1}`}
        {...detail}
      />
    </g>
  );
}

export function surfaceInset(width: number, height: number) {
  return Math.min(width, height) * 0.12;
}
