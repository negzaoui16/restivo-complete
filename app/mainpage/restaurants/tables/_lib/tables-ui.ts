export const FLOORS = ["Ground Floor", "First Floor", "Rooftop"] as const;
export type FloorName = (typeof FLOORS)[number];

export const VIEW_MODES = ["2D", "3D"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export type TableRow = {
  num: string;
  cap: number;
  shape: string;
  status: string;
  statusColor: string;
};

export type StatusLegendItem = {
  name: string;
  color: string;
};

export const STATUS_LEGEND: StatusLegendItem[] = [
  { name: "Available", color: "bg-green-500" },
  { name: "Reserved", color: "bg-orange-400" },
  { name: "Occupied", color: "bg-red-500" },
  { name: "Cleaning", color: "bg-blue-500" },
];

export const FLOOR_PREVIEW_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=2070";

export const FLOOR_THUMB_IMAGE =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop";
