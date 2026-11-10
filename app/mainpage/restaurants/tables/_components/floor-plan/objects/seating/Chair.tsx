import { CHAIR_DEPTH, CHAIR_WIDTH } from "../geometry";
import { ChairGlyph, FloorSvg, positiveMeters, type FloorObjectProps } from "../shared";

export function Chair({ width, height, selected = false, className }: FloorObjectProps) {
  const w = positiveMeters(width);
  const h = positiveMeters(height);
  const scale = Math.min(w / CHAIR_WIDTH, h / CHAIR_DEPTH);

  return (
    <FloorSvg width={w} height={h} className={className}>
      <ChairGlyph x={0} y={0} rotation={0} scale={scale} selected={selected} />
    </FloorSvg>
  );
}
