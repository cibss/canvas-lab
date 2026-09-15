import type { Bounds, Point } from "@/editor/camera/types";

export type ResizeHandlePosition =
  | "north-west"
  | "north"
  | "north-east"
  | "east"
  | "south-east"
  | "south"
  | "south-west"
  | "west";

export interface ResizeHandle {
  position: ResizeHandlePosition;
  point: Point;
}

export interface TransformBounds extends Bounds {
  centerX: number;
  centerY: number;
}
