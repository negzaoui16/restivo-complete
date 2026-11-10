import * as THREE from "three";
import type { FloorObject } from "@/app/mainpage/restaurants/tables/_components/floor-plan/floor-object";

export interface FloorDimensions {
  width: number;
  height: number;
}

/**
 * Converts a 2D floor object's center and rotation to 3D world coordinates.
 * Floor in 3D is centered at (0, 0, 0) on the XZ plane.
 */
export function floorToWorld(
  object: FloorObject,
  floor: FloorDimensions,
): { x: number; y: number; z: number; rotationY: number } {
  const cx = object.x + object.width / 2;
  const cy = object.y + object.height / 2;

  const worldX = cx - floor.width / 2;
  const worldZ = cy - floor.height / 2;
  const rotationY = -object.rotation * (Math.PI / 180);

  return {
    x: worldX,
    y: 0,
    z: worldZ,
    rotationY,
  };
}

/**
 * Converts a 3D intersection point on the ground plane (Y=0) back to 2D floor coordinates (meters).
 */
export function worldToFloor(
  worldPoint: THREE.Vector3,
  floor: FloorDimensions,
): { x: number; y: number } {
  const x = worldPoint.x + floor.width / 2;
  const y = worldPoint.z + floor.height / 2;

  return {
    x: Math.max(0, Math.min(floor.width, x)),
    y: Math.max(0, Math.min(floor.height, y)),
  };
}

/**
 * Given a dropped or placed object at world point, calculates the object's top-left (x, y)
 * clamped within the floor bounds.
 */
export function worldCenterToTopLeft(
  worldPoint: THREE.Vector3,
  objectWidth: number,
  objectHeight: number,
  floor: FloorDimensions,
): { x: number; y: number } {
  const center = worldToFloor(worldPoint, floor);
  const left = center.x - objectWidth / 2;
  const top = center.y - objectHeight / 2;

  return {
    x: Math.max(0, Math.min(floor.width - objectWidth, left)),
    y: Math.max(0, Math.min(floor.height - objectHeight, top)),
  };
}
