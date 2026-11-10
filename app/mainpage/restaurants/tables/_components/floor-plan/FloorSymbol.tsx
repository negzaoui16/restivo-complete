import { objectCapacity, type FloorObject } from "./floor-object";
import { Bar } from "./objects/areas/Bar";
import { Kitchen } from "./objects/areas/Kitchen";
import { Toilet } from "./objects/areas/Toilet";
import { Bench } from "./objects/seating/Bench";
import { Chair } from "./objects/seating/Chair";
import { Door } from "./objects/structure/Door";
import { Wall } from "./objects/structure/Wall";
import { Window } from "./objects/structure/Window";
import { BarTable } from "./objects/tables/BarTable";
import { RectangleTable } from "./objects/tables/RectangleTable";
import { TableRound } from "./objects/tables/TableRound";
import { TableSquare } from "./objects/tables/TableSquare";
import { FloorSvg, floorPaint } from "./objects/shared";

export function FloorSymbol({ object, selected = false }: { object: FloorObject; selected?: boolean }) {
  const { width, height, type } = object;
  const capacity = objectCapacity(object);

  switch (type) {
    case "ROUND_TABLE":
      return <TableRound width={width} height={height} capacity={capacity} selected={selected} />;
    case "SQUARE_TABLE":
      return <TableSquare width={width} height={height} capacity={capacity} selected={selected} />;
    case "RECTANGLE_TABLE":
      return <RectangleTable width={width} height={height} capacity={capacity} selected={selected} />;
    case "BAR_TABLE":
      return <BarTable width={width} height={height} capacity={capacity} selected={selected} />;
    case "CHAIR":
      return <Chair width={width} height={height} selected={selected} />;
    case "BENCH":
      return <Bench width={width} height={height} capacity={capacity} selected={selected} />;
    case "BAR":
      return <Bar width={width} height={height} capacity={capacity} selected={selected} />;
    case "KITCHEN":
      return <Kitchen width={width} height={height} selected={selected} />;
    case "TOILET":
      return <Toilet width={width} height={height} selected={selected} />;
    case "WALL":
      return <Wall width={width} height={height} selected={selected} />;
    case "DOOR":
      return <Door width={width} height={height} selected={selected} />;
    case "WINDOW":
      return <Window width={width} height={height} selected={selected} />;
    case "BOOTH":
    case "STORAGE":
    case "RECEPTION":
    case "COLUMN":
    case "STAIRS":
      return <FloorFootprint width={width} height={height} selected={selected} />;
  }
}

function FloorFootprint({ width, height, selected }: { width: number; height: number; selected: boolean }) {
  return (
    <FloorSvg width={width} height={height}>
      <rect x={-width / 2} y={-height / 2} width={width} height={height} rx={0.04} {...floorPaint(selected)} />
    </FloorSvg>
  );
}
