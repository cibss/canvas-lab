import type { Point } from "@/editor/camera/types";

import type {
  ResizeHandle,
  ResizeHandlePosition,
  TransformBounds,
} from "./types";

const RESIZE_HANDLE_POSITIONS: ResizeHandlePosition[] = [
  "north-west",
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
];

export const RESIZE_HANDLE_VISUAL_SIZE = 8;
export const RESIZE_HANDLE_HIT_SIZE = 14;

export function getResizeHandles(bounds: TransformBounds): ResizeHandle[] {
  return RESIZE_HANDLE_POSITIONS.map((position) => ({
    position,

    point: getResizeHandlePoint(bounds, position),
  }));
}

export function getResizeHandlePoint(
  bounds: TransformBounds,
  position: ResizeHandlePosition,
): Point {
  const left = bounds.x;

  const right = bounds.x + bounds.width;

  const top = bounds.y;

  const bottom = bounds.y + bounds.height;

  switch (position) {
    case "north-west":
      return {
        x: left,
        y: top,
      };

    case "north":
      return {
        x: bounds.centerX,
        y: top,
      };

    case "north-east":
      return {
        x: right,
        y: top,
      };

    case "east":
      return {
        x: right,
        y: bounds.centerY,
      };

    case "south-east":
      return {
        x: right,
        y: bottom,
      };

    case "south":
      return {
        x: bounds.centerX,
        y: bottom,
      };

    case "south-west":
      return {
        x: left,
        y: bottom,
      };

    case "west":
      return {
        x: left,
        y: bounds.centerY,
      };
  }
}

export function findResizeHandleAtPoint(
  bounds: TransformBounds,
  point: Point,
  zoom: number,
): ResizeHandlePosition | null {
  const hitSize = RESIZE_HANDLE_HIT_SIZE / zoom;

  const halfHitSize = hitSize / 2;

  const handles = getResizeHandles(bounds);

  for (const handle of handles) {
    const minX = handle.point.x - halfHitSize;

    const maxX = handle.point.x + halfHitSize;

    const minY = handle.point.y - halfHitSize;

    const maxY = handle.point.y + halfHitSize;

    if (
      point.x >= minX &&
      point.x <= maxX &&
      point.y >= minY &&
      point.y <= maxY
    ) {
      return handle.position;
    }
  }

  return null;
}
