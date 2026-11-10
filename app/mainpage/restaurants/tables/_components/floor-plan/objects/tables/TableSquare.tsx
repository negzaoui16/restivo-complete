import { RectangleTable } from "./RectangleTable";
import type { TableObjectProps } from "../shared";

export function TableSquare({ capacity = 4, ...props }: TableObjectProps) {
  return <RectangleTable capacity={capacity} {...props} />;
}
