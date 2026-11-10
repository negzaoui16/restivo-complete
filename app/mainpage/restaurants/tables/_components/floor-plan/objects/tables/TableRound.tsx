import { seatsAroundEllipse } from "../geometry";
import { FloorSvg, floorPaint, positiveMeters, surfaceInset, type TableObjectProps, ChairGlyph } from "../shared";

export function TableRound({
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
  const inset = surfaceInset(w, h);
  const seats = seatsAroundEllipse(capacity, w, h);

  return (
    <FloorSvg width={w} height={h} className={className}>
      <ellipse rx={w / 2} ry={h / 2} {...paint} />
      <ellipse rx={Math.max(w / 2 - inset, w * 0.2)} ry={Math.max(h / 2 - inset, h * 0.2)} {...detail} />
      {seats.map((seat, index) => (
        <ChairGlyph key={index} {...seat} selected={selected} />
      ))}
    </FloorSvg>
  );
}
