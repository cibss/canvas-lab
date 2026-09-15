import type { Point } from "@/editor/camera/types";
import { worldPointToNodeLocal } from "@/editor/document/nodeGeometry";
import type {
  EditorDocument,
  EditorNode,
  NodeId,
} from "@/editor/document/types";

function isPointInsideRectangle(
  point: Point,
  width: number,
  height: number,
): boolean {
  return point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height;
}

function isPointInsideEllipse(
  point: Point,
  width: number,
  height: number,
): boolean {
  if (width <= 0 || height <= 0) {
    return false;
  }

  const radiusX = width / 2;

  const radiusY = height / 2;

  const normalizedX = (point.x - radiusX) / radiusX;

  const normalizedY = (point.y - radiusY) / radiusY;

  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
}

function isPointInsideNode(point: Point, node: EditorNode): boolean {
  if (node.type === "ellipse") {
    return isPointInsideEllipse(point, node.width, node.height);
  }

  return isPointInsideRectangle(point, node.width, node.height);
}

function hitTestNode(
  document: EditorDocument,
  node: EditorNode,
  worldPoint: Point,
): NodeId | null {
  if (!node.visible || node.locked) {
    return null;
  }

  const localPoint = worldPointToNodeLocal(document, node.id, worldPoint);

  if (!localPoint) {
    return null;
  }

  const pointInsideNode = isPointInsideNode(localPoint, node);

  if (node.type === "frame") {
    if (node.clipContent && !pointInsideNode) {
      return null;
    }

    for (let index = node.childIds.length - 1; index >= 0; index -= 1) {
      const childId = node.childIds[index];

      const child = document.nodes[childId];

      if (!child) {
        continue;
      }

      const childHit = hitTestNode(document, child, worldPoint);

      if (childHit) {
        return childHit;
      }
    }
  }

  if (pointInsideNode) {
    return node.id;
  }

  return null;
}

export function hitTestDocument(
  document: EditorDocument,
  point: Point,
): NodeId | null {
  for (let index = document.rootNodeIds.length - 1; index >= 0; index -= 1) {
    const rootNodeId = document.rootNodeIds[index];

    const rootNode = document.nodes[rootNodeId];

    if (!rootNode) {
      continue;
    }

    const hit = hitTestNode(document, rootNode, point);

    if (hit) {
      return hit;
    }
  }

  return null;
}
