import type { Bounds, CameraState, Point, ViewportSize } from "./types";

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
export const DEFAULT_ZOOM = 1;

export const DEFAULT_FIT_PADDING = 48;
export const ZOOM_BUTTON_FACTOR = 1.2;

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

export function zoomCameraAtPoint(
  camera: CameraState,
  screenPoint: Point,
  nextZoom: number,
): CameraState {
  const clampedZoom = clampZoom(nextZoom);

  const worldPoint = screenToWorld(screenPoint, camera);

  return {
    offsetX: screenPoint.x - worldPoint.x * clampedZoom,

    offsetY: screenPoint.y - worldPoint.y * clampedZoom,

    zoom: clampedZoom,
  };
}

export function fitCameraToBounds(
  bounds: Bounds,
  viewport: ViewportSize,
  padding = DEFAULT_FIT_PADDING,
): CameraState {
  const availableWidth = Math.max(1, viewport.width - padding * 2);

  const availableHeight = Math.max(1, viewport.height - padding * 2);

  const contentWidth = Math.max(1, bounds.width);

  const contentHeight = Math.max(1, bounds.height);

  const zoom = clampZoom(
    Math.min(availableWidth / contentWidth, availableHeight / contentHeight),
  );

  const contentCenterX = bounds.x + bounds.width / 2;

  const contentCenterY = bounds.y + bounds.height / 2;

  return {
    zoom,

    offsetX: viewport.width / 2 - contentCenterX * zoom,

    offsetY: viewport.height / 2 - contentCenterY * zoom,
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
