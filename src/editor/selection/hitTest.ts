import type { Point } from "@/editor/camera/types";
import type {
  EditorDocument,
  EditorNode,
  NodeId,
} from "@/editor/document/types";

interface NodePosition {
  x: number;
  y: number;
}

interface HitTestNodeOptions {
  document: EditorDocument;
  node: EditorNode;
  point: Point;
  parentPosition: NodePosition;
}

function isPointInsideRectangle(
  point: Point,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  return (
    point.x >= x &&
    point.x <= x + width &&
    point.y >= y &&
    point.y <= y + height
  );
}

function isPointInsideEllipse(
  point: Point,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  if (width <= 0 || height <= 0) {
    return false;
  }

  const radiusX = width / 2;
  const radiusY = height / 2;

  const centerX = x + radiusX;
  const centerY = y + radiusY;

  const normalizedX = (point.x - centerX) / radiusX;

  const normalizedY = (point.y - centerY) / radiusY;

  return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
}

function isPointInsideNode(
  point: Point,
  node: EditorNode,
  worldX: number,
  worldY: number,
): boolean {
  if (node.type === "ellipse") {
    return isPointInsideEllipse(point, worldX, worldY, node.width, node.height);
  }

  return isPointInsideRectangle(point, worldX, worldY, node.width, node.height);
}

function hitTestNode({
  document,
  node,
  point,
  parentPosition,
}: HitTestNodeOptions): NodeId | null {
  if (!node.visible || node.locked) {
    return null;
  }

  const worldX = parentPosition.x + node.x;

  const worldY = parentPosition.y + node.y;

  const pointInsideNode = isPointInsideNode(point, node, worldX, worldY);

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

      const childHit = hitTestNode({
        document,
        node: child,
        point,
        parentPosition: {
          x: worldX,
          y: worldY,
        },
      });

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

    const hit = hitTestNode({
      document,
      node: rootNode,
      point,
      parentPosition: {
        x: 0,
        y: 0,
      },
    });

    if (hit) {
      return hit;
    }
  }

  return null;
}
