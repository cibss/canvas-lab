import type { Point } from "@/editor/camera/types";
import { getNodeWorldGeometry } from "@/editor/document/nodeGeometry";
import type { EditorDocument, NodeId } from "@/editor/document/types";

export interface WorldBounds {
  minX: number;

  minY: number;

  maxX: number;

  maxY: number;
}

export function createWorldBounds(first: Point, second: Point): WorldBounds {
  return {
    minX: Math.min(first.x, second.x),

    minY: Math.min(first.y, second.y),

    maxX: Math.max(first.x, second.x),

    maxY: Math.max(first.y, second.y),
  };
}

export function doWorldBoundsIntersect(
  first: WorldBounds,
  second: WorldBounds,
): boolean {
  return !(
    first.maxX < second.minX ||
    first.minX > second.maxX ||
    first.maxY < second.minY ||
    first.minY > second.maxY
  );
}

export function doesWorldBoundsContainPoint(
  bounds: WorldBounds,
  point: Point,
): boolean {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  );
}

export function getNodeWorldBounds(
  document: EditorDocument,
  nodeId: NodeId,
): WorldBounds | null {
  const geometry = getNodeWorldGeometry(document, nodeId);

  if (!geometry) {
    return null;
  }

  const corners = [
    geometry.corners.northWest,

    geometry.corners.northEast,

    geometry.corners.southEast,

    geometry.corners.southWest,
  ];

  let minX = Number.POSITIVE_INFINITY;

  let minY = Number.POSITIVE_INFINITY;

  let maxX = Number.NEGATIVE_INFINITY;

  let maxY = Number.NEGATIVE_INFINITY;

  for (const corner of corners) {
    minX = Math.min(minX, corner.x);

    minY = Math.min(minY, corner.y);

    maxX = Math.max(maxX, corner.x);

    maxY = Math.max(maxY, corner.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
  };
}
