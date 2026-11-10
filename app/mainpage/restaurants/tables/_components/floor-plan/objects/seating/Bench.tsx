import { seatCount } from "../geometry";
import { FloorSvg, floorPaint, positiveMeters, type TableObjectProps } from "../shared";

export function Bench({
  width,
  height,
  capacity = 3,
  selected = false,
  className,
}: TableObjectProps) {
  const w = positiveMeters(width);
  const h = positiveMeters(height);
  const paint = floorPaint(selected);
  const detail = floorPaint(selected, true);
  const backHeight = Math.min(Math.max(h * 0.22, 0.05), h * 0.34);
  const gap = Math.min(0.045, h * 0.1);
  const seatHeight = Math.max(h - backHeight - gap, h * 0.4);
  const seatY = -h / 2 + backHeight + gap;
  const places = seatCount(capacity);

  return (
    <FloorSvg width={w} height={h} className={className}>
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={backHeight}
        rx={backHeight / 2}
        {...paint}
      />
      <rect
        x={-w / 2}
        y={seatY}
        width={w}
        height={seatHeight}
        rx={Math.min(0.06, seatHeight * 0.2)}
        {...paint}
      />
      {places > 1
        ? Array.from({ length: places - 1 }, (_, index) => {
            const x = -w / 2 + (w / places) * (index + 1);
            return (
              <line
                key={index}
                x1={x}
                y1={seatY + seatHeight * 0.18}
                x2={x}
                y2={seatY + seatHeight * 0.82}
                {...detail}
              />
            );
          })
        : null}
    </FloorSvg>
  );
}
