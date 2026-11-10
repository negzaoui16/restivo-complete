import { STOOL_SIZE, seatsAroundEllipse } from "../geometry";
import { FloorSvg, floorPaint, positiveMeters, StoolGlyph, type TableObjectProps } from "../shared";

export function BarTable({
  width,
  height,
  capacity = 2,
  selected = false,
  className,
}: TableObjectProps) {
  const w = positiveMeters(width);
  const h = positiveMeters(height);
  const paint = floorPaint(selected);
  const detail = floorPaint(selected, true);
  const seats = seatsAroundEllipse(capacity, w, h, STOOL_SIZE, STOOL_SIZE);

  return (
    <FloorSvg width={w} height={h} className={className}>
      <ellipse rx={w / 2} ry={h / 2} {...paint} />
      <ellipse rx={w * 0.28} ry={h * 0.28} {...detail} />
      <ellipse rx={Math.max(w * 0.06, 0.03)} ry={Math.max(h * 0.06, 0.03)} {...detail} />
      {seats.map((seat, index) => (
        <StoolGlyph key={index} {...seat} selected={selected} />
      ))}
    </FloorSvg>
  );
}
