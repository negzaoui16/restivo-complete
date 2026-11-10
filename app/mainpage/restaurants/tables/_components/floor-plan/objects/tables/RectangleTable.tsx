import { seatsAroundRect } from "../geometry";
import { ChairGlyph, FloorSvg, floorPaint, positiveMeters, type TableObjectProps } from "../shared";

export function RectangleTable({
  width,
  height,
  capacity = 4,
  selected = false,
  className,
}: TableObjectProps) {
  const w = positiveMeters(width);
  const h = positiveMeters(height);
  const paint = floorPaint(selected);
  const detail = floorPaint(selected, true);
  const radius = Math.min(0.05, w * 0.08, h * 0.08);
  const inset = Math.min(w, h) * 0.1;
  const seats = seatsAroundRect(capacity, w, h);

  return (
    <FloorSvg width={w} height={h} className={className}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={radius} {...paint} />
      <rect
        x={-w / 2 + inset}
        y={-h / 2 + inset}
        width={Math.max(w - inset * 2, w * 0.4)}
        height={Math.max(h - inset * 2, h * 0.4)}
        rx={Math.max(radius * 0.6, 0.02)}
        {...detail}
      />
      {seats.map((seat, index) => (
        <ChairGlyph key={index} {...seat} selected={selected} />
      ))}
    </FloorSvg>
  );
}
