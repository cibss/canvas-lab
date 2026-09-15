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

export function getResizeHandles(bounds: TransformBounds): ResizeHandle[] {
  return RESIZE_HANDLE_POSITIONS.map((position) => ({
    position,
    point: getResizeHandlePoint(bounds, position),
  }));
}

export function getResizeHandlePoint(
  bounds: TransformBounds,
  position: ResizeHandlePosition,
): {
  x: number;
  y: number;
} {
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
