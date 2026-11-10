import { FloorSvg, floorPaint, positiveMeters, type FloorObjectProps } from "../shared";

export function Toilet({ width, height, selected = false, className }: FloorObjectProps) {
  const w = positiveMeters(width);
  const h = positiveMeters(height);
  const paint = floorPaint(selected);
  const detail = floorPaint(selected, true);
  const left = -w / 2;
  const top = -h / 2;
  const right = w / 2;
  const bottom = h / 2;
  const doorW = Math.min(w * 0.62, h * 0.36, 0.78);
  const bowlW = Math.min(w * 0.4, 0.5);
  const tankH = Math.min(h * 0.09, 0.15);
  const tankW = bowlW * 0.9;
  const bowlRy = Math.min(h * 0.12, 0.24);
  const bowlRx = bowlW / 2;
  const tankY = top + Math.max(h * 0.14, 0.08);
  const bowlCy = tankY + tankH + bowlRy * 0.62;

  return (
    <FloorSvg width={w} height={h} className={className}>
      <path
        d={`M ${left + doorW} ${bottom} L ${right} ${bottom} L ${right} ${top} L ${left} ${top} L ${left} ${bottom}`}
        {...detail}
      />
      <line x1={left} y1={bottom} x2={left} y2={bottom - doorW} {...paint} />
      <path
        d={`M ${left} ${bottom - doorW} A ${doorW} ${doorW} 0 0 1 ${left + doorW} ${bottom}`}
        {...detail}
      />
      <rect x={-tankW / 2} y={tankY} width={tankW} height={tankH} rx={0.02} {...paint} fill="none" />
      <ellipse cx={0} cy={bowlCy} rx={bowlRx} ry={bowlRy} {...paint} fill="none" />
      <ellipse cx={0} cy={bowlCy + bowlRy * 0.08} rx={bowlRx * 0.55} ry={bowlRy * 0.48} {...detail} />
    </FloorSvg>
  );
}
