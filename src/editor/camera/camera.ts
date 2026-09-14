import type { CameraState, Point } from "./types";

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
export const DEFAULT_ZOOM = 1;

export function createCamera(): CameraState {
  return {
    offsetX: 0,
    offsetY: 0,
    zoom: DEFAULT_ZOOM,
  };
}

export function clampZoom(zoom: number): number {
  return Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
}

export function panCamera(
  camera: CameraState,
  deltaX: number,
  deltaY: number,
): CameraState {
  return {
    ...camera,
    offsetX: camera.offsetX + deltaX,
    offsetY: camera.offsetY + deltaY,
  };
}

export function worldToScreen(point: Point, camera: CameraState): Point {
  return {
    x: point.x * camera.zoom + camera.offsetX,
    y: point.y * camera.zoom + camera.offsetY,
  };
}

export function screenToWorld(point: Point, camera: CameraState): Point {
  return {
    x: (point.x - camera.offsetX) / camera.zoom,
    y: (point.y - camera.offsetY) / camera.zoom,
  };
}
