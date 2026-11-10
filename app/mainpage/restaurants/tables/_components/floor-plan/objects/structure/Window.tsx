import { FloorSvg, floorPaint, positiveMeters, type FloorObjectProps } from "../shared";

export function Window({ width, height, selected = false, className }: FloorObjectProps) {
  const w = positiveMeters(width);
  const h = positiveMeters(height);
  const paint = { ...floorPaint(selected), strokeLinecap: "square" as const };
  const detail = { ...floorPaint(selected, true), strokeLinecap: "square" as const };
  const left = -w / 2;
  const right = w / 2;
  const top = -h / 2;
  const bottom = h / 2;

  const isVertical = h > w;

  return (
    <FloorSvg width={w} height={h} className={className}>
      {isVertical ? (
        <>
          <line x1={left} y1={top} x2={left} y2={bottom} {...paint} />
          <line x1={right} y1={top} x2={right} y2={bottom} {...paint} />
          <line x1={0} y1={top} x2={0} y2={bottom} {...detail} />
          <line x1={left} y1={top} x2={right} y2={top} {...paint} />
          <line x1={left} y1={bottom} x2={right} y2={bottom} {...paint} />
        </>
      ) : (
        <>
          <line x1={left} y1={top} x2={right} y2={top} {...paint} />
          <line x1={left} y1={bottom} x2={right} y2={bottom} {...paint} />
          <line x1={left} y1={0} x2={right} y2={0} {...detail} />
          <line x1={left} y1={top} x2={left} y2={bottom} {...paint} />
          <line x1={right} y1={top} x2={right} y2={bottom} {...paint} />
        </>
      )}
    </FloorSvg>
  );
}
