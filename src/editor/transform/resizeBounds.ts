import type { Bounds, Point } from "@/editor/camera/types";

import type { ResizeHandlePosition } from "./types";

export const ABSOLUTE_MIN_RESIZE_SIZE = 1;

export function resizeBoundsFromHandle(
  initialBounds: Bounds,
  handle: ResizeHandlePosition,
  pointer: Point,
): Bounds {
  const initialLeft = initialBounds.x;

  const initialTop = initialBounds.y;

  const initialRight = initialBounds.x + initialBounds.width;

  const initialBottom = initialBounds.y + initialBounds.height;

  let left = initialLeft;
  let top = initialTop;
  let right = initialRight;
  let bottom = initialBottom;

  switch (handle) {
    case "north-west":
      left = Math.min(pointer.x, initialRight - ABSOLUTE_MIN_RESIZE_SIZE);

      top = Math.min(pointer.y, initialBottom - ABSOLUTE_MIN_RESIZE_SIZE);
      break;

    case "north":
      top = Math.min(pointer.y, initialBottom - ABSOLUTE_MIN_RESIZE_SIZE);
      break;

    case "north-east":
      right = Math.max(pointer.x, initialLeft + ABSOLUTE_MIN_RESIZE_SIZE);

      top = Math.min(pointer.y, initialBottom - ABSOLUTE_MIN_RESIZE_SIZE);
      break;

    case "east":
      right = Math.max(pointer.x, initialLeft + ABSOLUTE_MIN_RESIZE_SIZE);
      break;

    case "south-east":
      right = Math.max(pointer.x, initialLeft + ABSOLUTE_MIN_RESIZE_SIZE);

      bottom = Math.max(pointer.y, initialTop + ABSOLUTE_MIN_RESIZE_SIZE);
      break;

    case "south":
      bottom = Math.max(pointer.y, initialTop + ABSOLUTE_MIN_RESIZE_SIZE);
      break;

    case "south-west":
      left = Math.min(pointer.x, initialRight - ABSOLUTE_MIN_RESIZE_SIZE);

      bottom = Math.max(pointer.y, initialTop + ABSOLUTE_MIN_RESIZE_SIZE);
      break;

    case "west":
      left = Math.min(pointer.x, initialRight - ABSOLUTE_MIN_RESIZE_SIZE);
      break;
  }

  return {
    x: left,
    y: top,

    width: right - left,

    height: bottom - top,
  };
}
