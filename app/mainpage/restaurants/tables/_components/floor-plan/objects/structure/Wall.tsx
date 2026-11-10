import { FLOOR_INK, FLOOR_SELECTED, FloorSvg, positiveMeters, type FloorObjectProps } from "../shared";

export function Wall({ width, height, selected = false, className }: FloorObjectProps) {
  const w = positiveMeters(width);
  const h = positiveMeters(height);

  return (
    <FloorSvg width={w} height={h} className={className}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={selected ? FLOOR_SELECTED : FLOOR_INK} />
    </FloorSvg>
  );
}
