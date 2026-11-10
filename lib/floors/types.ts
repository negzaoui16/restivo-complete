import type { FloorObject } from "@/app/mainpage/restaurants/tables/_components/floor-plan/floor-object";

export type PublicFloor = {
  id: string;
  restaurantId: string;
  name: string;
  level: number;
  width: number;
  height: number;
  sortOrder: number;
  isActive: boolean;
  objects: FloorObject[];
  tableCount: number;
  seatCount: number;
};
