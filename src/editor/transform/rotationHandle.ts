import type { Point } from "@/editor/camera/types";
import type { NodeWorldGeometry } from "@/editor/document/nodeGeometry";

export const ROTATION_HANDLE_OFFSET = 28;

export const ROTATION_HANDLE_VISUAL_SIZE = 10;

export const ROTATION_HANDLE_HIT_SIZE = 18;

export interface RotationHandleGeometry {
  point: Point;
}

export function getRotationHandleGeometry(
  geometry: NodeWorldGeometry,
  zoom: number,
): RotationHandleGeometry {
  const north = geometry.edgeMidpoints.north;

  let directionX = north.x - geometry.center.x;

  let directionY = north.y - geometry.center.y;

  const length = Math.hypot(directionX, directionY);

  if (length > Number.EPSILON) {
    directionX /= length;
    directionY /= length;
  } else {
    const radians = geometry.rotation * (Math.PI / 180);

    directionX = Math.sin(radians);

    directionY = -Math.cos(radians);
  }

  const distance = ROTATION_HANDLE_OFFSET / zoom;

  return {
    point: {
      x: north.x + directionX * distance,

      y: north.y + directionY * distance,
    },
  };
}

export function isPointOnRotationHandle(
  handle: RotationHandleGeometry,
  point: Point,
  zoom: number,
): boolean {
  const radius = ROTATION_HANDLE_HIT_SIZE / 2 / zoom;

  return (
    Math.hypot(
      point.x - handle.point.x,

      point.y - handle.point.y,
    ) <= radius
  );
}
