export { TableRound } from "./tables/TableRound";
export { TableSquare } from "./tables/TableSquare";
export { RectangleTable } from "./tables/RectangleTable";
export { BarTable } from "./tables/BarTable";
export { Chair } from "./seating/Chair";
export { Bench } from "./seating/Bench";
export { Wall } from "./structure/Wall";
export { Door } from "./structure/Door";
export { Window } from "./structure/Window";
export { Bar } from "./areas/Bar";
export { Kitchen } from "./areas/Kitchen";
export { Toilet } from "./areas/Toilet";
export type { FloorObjectProps, TableObjectProps } from "./shared";
export {
  FLOOR_OBJECT_CATALOG,
  FLOOR_OBJECT_TYPES,
  createFloorObject,
  isFloorObjectType,
} from "../floor-object";
export type { FloorObject, FloorObjectDefinition, FloorObjectGroup, FloorObjectType } from "../floor-object";
