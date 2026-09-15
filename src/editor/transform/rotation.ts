import type { Point } from "@/editor/camera/types";
import type { EditorDocument, NodeId } from "@/editor/document/types";

export function getPointerAngleDegrees(center: Point, point: Point): number {
  return (
    Math.atan2(
      point.y - center.y,

      point.x - center.x,
    ) *
    (180 / Math.PI)
  );
}

export function getShortestAngleDelta(
  previousAngle: number,
  nextAngle: number,
): number {
  return ((((nextAngle - previousAngle + 180) % 360) + 360) % 360) - 180;
}

export function normalizeRotation(rotation: number): number {
  return ((rotation % 360) + 360) % 360;
}

export function rotateNodeTo(
  document: EditorDocument,
  nodeId: NodeId,
  rotation: number,
): EditorDocument {
  const node = document.nodes[nodeId];

  if (!node || node.locked) {
    return document;
  }

  const normalizedRotation = normalizeRotation(rotation);

  if (node.rotation === normalizedRotation) {
    return document;
  }

  return {
    ...document,

    nodes: {
      ...document.nodes,

      [nodeId]: {
        ...node,

        rotation: normalizedRotation,
      },
    },
  };
}
