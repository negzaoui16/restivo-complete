import { FloorSvg, floorPaint, positiveMeters, type FloorObjectProps } from "../shared";

export function Kitchen({ width, height, selected = false, className }: FloorObjectProps) {
  const w = positiveMeters(width);
  const h = positiveMeters(height);
  const paint = floorPaint(selected);
  const detail = floorPaint(selected, true);
  const left = -w / 2;
  const top = -h / 2;
  const right = w / 2;
  const bottom = h / 2;
  const margin = Math.min(0.06, Math.min(w, h) * 0.04);
  const counter = Math.min(0.65, Math.min(w, h) * 0.32);
  const x1 = left + margin;
  const y1 = top + margin;
  const x2 = right - margin;
  const y2 = bottom - margin;
  const showCounters = w > counter * 2.3 && h > counter * 2.3;

  const runX = x1 + counter;
  const runW = x2 - runX;
  const stoveW = Math.min(0.72, Math.max(runW * 0.5, 0));
  const stoveH = Math.min(0.48, counter * 0.72);
  const stoveX = runX + Math.max(runW - stoveW, 0) / 2;
  const stoveY = y1 + (counter - stoveH) / 2;

  const sinkW = Math.min(counter * 0.52, 0.36);
  const sinkH = Math.min(0.42, Math.max(y2 - (y1 + counter), 0) * 0.36);
  const sinkX = x1 + (counter - sinkW) / 2;
  const sinkY = y1 + counter + Math.max(y2 - y1 - counter - sinkH, 0) * 0.32;

  return (
    <FloorSvg width={w} height={h} className={className}>
      <rect
        x={left}
        y={top}
        width={w}
        height={h}
        rx={Math.min(0.04, w * 0.03)}
        {...detail}
        fill="none"
      />
      {showCounters ? (
        <path
          d={`M ${x1} ${y2} L ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y1 + counter} L ${x1 + counter} ${y1 + counter} L ${x1 + counter} ${y2} Z`}
          {...paint}
          fill="none"
        />
      ) : null}
      {showCounters && stoveW > 0.16 && stoveH > 0.12 ? (
        <Range x={stoveX} y={stoveY} width={stoveW} height={stoveH} selected={selected} />
      ) : (
        <Range
          x={-Math.min(0.6, w * 0.7) / 2}
          y={-Math.min(0.48, h * 0.55) / 2}
          width={Math.min(0.6, w * 0.7)}
          height={Math.min(0.48, h * 0.55)}
          selected={selected}
        />
      )}
      {showCounters && sinkW > 0.12 && sinkH > 0.1 ? (
        <g>
          <rect
            x={sinkX}
            y={sinkY}
            width={sinkW}
            height={sinkH}
            rx={Math.min(sinkW, sinkH) * 0.2}
            {...detail}
          />
          <ellipse
            cx={sinkX + sinkW / 2}
            cy={sinkY + sinkH / 2}
            rx={sinkW * 0.28}
            ry={sinkH * 0.28}
            {...detail}
          />
        </g>
      ) : null}
    </FloorSvg>
  );
}

function Range({
  x,
  y,
  width,
  height,
  selected,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  selected: boolean;
}) {
  const paint = floorPaint(selected);
  const detail = floorPaint(selected, true);
  const radius = Math.min((width - width * 0.36) / 4, (height - height * 0.36) / 4, 0.07);

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={Math.min(0.04, width * 0.08)} {...paint} fill="none" />
      {[0.32, 0.68].map((row) =>
        [0.32, 0.68].map((column) => (
          <circle
            key={`${row}-${column}`}
            cx={x + width * column}
            cy={y + height * row}
            r={Math.max(radius, 0.03)}
            {...detail}
          />
        )),
      )}
    </g>
  );
}
