import type { FloorObject, FloorObjectType } from "@/app/mainpage/restaurants/tables/_components/floor-plan/floor-object";

export interface GenerateFloorPlanInput {
  frontImage: string; // base64 string or data URL
  backImage: string;  // base64 string or data URL
  floorWidth: number; // in meters (e.g. 16)
  floorHeight: number; // in meters (e.g. 10)
  notes?: string;
  generateChairs?: boolean;
}

export interface FloorPlanSummary {
  tableCount: number;
  seatCount: number;
  layoutDescription: string;
  detectedZones?: string[];
  tablesByType?: Partial<Record<FloorObjectType, number>>;
}

export interface GenerateFloorPlanResult {
  ok: boolean;
  summary: FloorPlanSummary;
  objects: FloorObject[];
  error?: string;
}
