import { STOOL_SIZE, seatsAlongBottom } from "../geometry";
import { FloorSvg, floorPaint, positiveMeters, StoolGlyph, type TableObjectProps } from "../shared";

export function Bar({
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
  const counterH = h * 0.56;
  const top = -h / 2;
  const radius = Math.min(0.08, counterH / 2, w * 0.08);
  const lipY = top + counterH - Math.min(0.08, counterH * 0.18);
  const stoolY = top + h * 0.8;
  const stools = seatsAlongBottom(capacity, w, stoolY, STOOL_SIZE);
  const wellR = Math.min(0.11, counterH * 0.18, w * 0.05);

  return (
    <FloorSvg width={w} height={h} className={className}>
      <rect x={-w / 2} y={top} width={w} height={counterH} rx={radius} {...paint} />
      <line x1={-w / 2 + radius} y1={lipY} x2={w / 2 - radius} y2={lipY} {...detail} />
      {wellR >= 0.04 ? (
        <circle cx={w / 2 - Math.max(wellR * 2.4, 0.28)} cy={top + counterH / 2} r={wellR} {...detail} />
      ) : null}
      {stools.map((stool, index) => (
        <StoolGlyph key={index} {...stool} selected={selected} />
      ))}
    </FloorSvg>
  );
}
