import type { Point } from "@/editor/camera/types";
import type { NodeWorldGeometry } from "@/editor/document/nodeGeometry";

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

export function getResizeHandlesForNode(
  geometry: NodeWorldGeometry,
): ResizeHandle[] {
  return [
    {
      position: "north-west",

      point: geometry.corners.northWest,
    },

    {
      position: "north",

      point: geometry.edgeMidpoints.north,
    },

    {
      position: "north-east",

      point: geometry.corners.northEast,
    },

    {
      position: "east",

      point: geometry.edgeMidpoints.east,
    },

    {
      position: "south-east",

      point: geometry.corners.southEast,
    },

    {
      position: "south",

      point: geometry.edgeMidpoints.south,
    },

    {
      position: "south-west",

      point: geometry.corners.southWest,
    },

    {
      position: "west",

      point: geometry.edgeMidpoints.west,
    },
  ];
}

function findHandleAtPoint(
  handles: ResizeHandle[],
  point: Point,
  zoom: number,
): ResizeHandlePosition | null {
  const hitSize = RESIZE_HANDLE_HIT_SIZE / zoom;

  const halfHitSize = hitSize / 2;

  for (const handle of handles) {
    if (
      point.x >= handle.point.x - halfHitSize &&
      point.x <= handle.point.x + halfHitSize &&
      point.y >= handle.point.y - halfHitSize &&
      point.y <= handle.point.y + halfHitSize
    ) {
      return handle.position;
    }
  }

  return null;
}

export function findResizeHandleAtPoint(
  bounds: TransformBounds,
  point: Point,
  zoom: number,
): ResizeHandlePosition | null {
  return findHandleAtPoint(getResizeHandles(bounds), point, zoom);
}

export function findNodeResizeHandleAtPoint(
  geometry: NodeWorldGeometry,
  point: Point,
  zoom: number,
): ResizeHandlePosition | null {
  return findHandleAtPoint(getResizeHandlesForNode(geometry), point, zoom);
}

export function getResizeHandleCursor(
  handle: ResizeHandlePosition,
  worldRotation: number,
): string {
  let baseAngle: number;

  switch (handle) {
    case "east":
    case "west":
      baseAngle = 0;
      break;

    case "north-west":
    case "south-east":
      baseAngle = 45;
      break;

    case "north":
    case "south":
      baseAngle = 90;
      break;

    case "north-east":
    case "south-west":
      baseAngle = 135;
      break;
  }

  const normalizedAngle = (((baseAngle + worldRotation) % 180) + 180) % 180;

  const direction = Math.round(normalizedAngle / 45) % 4;

  switch (direction) {
    case 0:
      return "ew-resize";

    case 1:
      return "nwse-resize";

    case 2:
      return "ns-resize";

    case 3:
      return "nesw-resize";

    default:
      return "default";
  }
}
