import { FloorSvg, floorPaint, positiveMeters, type FloorObjectProps } from "../shared";

export function Door({ width, height, selected = false, className }: FloorObjectProps) {
  const w = positiveMeters(width);
  const h = positiveMeters(height);
  const paint = floorPaint(selected);
  const detail = floorPaint(selected, true);
  const leaf = Math.max(0.08, Math.min(w, h) * 0.96);
  const hingeX = -w / 2;
  const hingeY = h / 2;
  const leafX = hingeX;
  const leafY = hingeY - leaf;
  const arcX = hingeX + leaf;
  const arcY = hingeY;

  return (
    <FloorSvg width={w} height={h} className={className}>
      <line x1={hingeX} y1={hingeY} x2={hingeX + leaf} y2={hingeY} {...detail} />
      <line x1={hingeX} y1={hingeY} x2={leafX} y2={leafY} {...paint} />
      <path d={`M ${leafX} ${leafY} A ${leaf} ${leaf} 0 0 1 ${arcX} ${arcY}`} {...detail} />
    </FloorSvg>
  );
}
