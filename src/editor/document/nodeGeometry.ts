import type { Bounds, Point } from "@/editor/camera/types";
import {
  applyMatrixToPoint,
  createRotationMatrix,
  createTranslationMatrix,
  getMatrixRotationDegrees,
  IDENTITY_MATRIX,
  invertMatrix,
  multiplyMatrices,
  type Matrix2D,
} from "@/editor/geometry/matrix";

import type { EditorDocument, EditorNode, NodeId } from "./types";

export interface NodeWorldCorners {
  northWest: Point;
  northEast: Point;
  southEast: Point;
  southWest: Point;
}

export interface NodeWorldEdgeMidpoints {
  north: Point;
  east: Point;
  south: Point;
  west: Point;
}

export interface NodeWorldGeometry {
  center: Point;

  corners: NodeWorldCorners;

  edgeMidpoints: NodeWorldEdgeMidpoints;

  rotation: number;
}

function getNodeLocalTransform(node: EditorNode): Matrix2D {
  const centerX = node.width / 2;

  const centerY = node.height / 2;

  let matrix = createTranslationMatrix(node.x, node.y);

  matrix = multiplyMatrices(matrix, createTranslationMatrix(centerX, centerY));

  matrix = multiplyMatrices(matrix, createRotationMatrix(node.rotation));

  matrix = multiplyMatrices(
    matrix,
    createTranslationMatrix(-centerX, -centerY),
  );

  return matrix;
}

export function getNodeWorldTransform(
  document: EditorDocument,
  nodeId: NodeId,
): Matrix2D | null {
  const hierarchy: EditorNode[] = [];

  const visitedNodeIds = new Set<NodeId>();

  let currentNodeId: NodeId | null = nodeId;

  while (currentNodeId !== null) {
    if (visitedNodeIds.has(currentNodeId)) {
      return null;
    }

    visitedNodeIds.add(currentNodeId);

    const node: EditorNode | undefined = document.nodes[currentNodeId];

    if (!node) {
      return null;
    }

    hierarchy.push(node);

    currentNodeId = node.parentId;
  }

  hierarchy.reverse();

  let matrix: Matrix2D = IDENTITY_MATRIX;

  for (const node of hierarchy) {
    matrix = multiplyMatrices(matrix, getNodeLocalTransform(node));
  }

  return matrix;
}

export function getNodeParentWorldTransform(
  document: EditorDocument,
  nodeId: NodeId,
): Matrix2D | null {
  const node: EditorNode | undefined = document.nodes[nodeId];

  if (!node) {
    return null;
  }

  if (!node.parentId) {
    return IDENTITY_MATRIX;
  }

  return getNodeWorldTransform(document, node.parentId);
}

export function getNodeWorldPosition(
  document: EditorDocument,
  nodeId: NodeId,
): Point | null {
  const transform = getNodeWorldTransform(document, nodeId);

  if (!transform) {
    return null;
  }

  return applyMatrixToPoint(transform, {
    x: 0,
    y: 0,
  });
}

export function getNodeWorldCenter(
  document: EditorDocument,
  nodeId: NodeId,
): Point | null {
  const node: EditorNode | undefined = document.nodes[nodeId];

  const transform = getNodeWorldTransform(document, nodeId);

  if (!node || !transform) {
    return null;
  }

  return applyMatrixToPoint(transform, {
    x: node.width / 2,

    y: node.height / 2,
  });
}

export function getNodeWorldGeometry(
  document: EditorDocument,
  nodeId: NodeId,
): NodeWorldGeometry | null {
  const node: EditorNode | undefined = document.nodes[nodeId];

  const transform = getNodeWorldTransform(document, nodeId);

  if (!node || !transform) {
    return null;
  }

  const center = {
    x: node.width / 2,

    y: node.height / 2,
  };

  return {
    center: applyMatrixToPoint(transform, center),

    corners: {
      northWest: applyMatrixToPoint(transform, {
        x: 0,
        y: 0,
      }),

      northEast: applyMatrixToPoint(transform, {
        x: node.width,

        y: 0,
      }),

      southEast: applyMatrixToPoint(transform, {
        x: node.width,

        y: node.height,
      }),

      southWest: applyMatrixToPoint(transform, {
        x: 0,

        y: node.height,
      }),
    },

    edgeMidpoints: {
      north: applyMatrixToPoint(transform, {
        x: node.width / 2,

        y: 0,
      }),

      east: applyMatrixToPoint(transform, {
        x: node.width,

        y: node.height / 2,
      }),

      south: applyMatrixToPoint(transform, {
        x: node.width / 2,

        y: node.height,
      }),

      west: applyMatrixToPoint(transform, {
        x: 0,

        y: node.height / 2,
      }),
    },

    rotation: getMatrixRotationDegrees(transform),
  };
}

export function getNodeWorldBounds(
  document: EditorDocument,
  nodeId: NodeId,
): Bounds | null {
  const geometry = getNodeWorldGeometry(document, nodeId);

  if (!geometry) {
    return null;
  }

  const points = [
    geometry.corners.northWest,

    geometry.corners.northEast,

    geometry.corners.southEast,

    geometry.corners.southWest,
  ];

  const xs = points.map((point) => point.x);

  const ys = points.map((point) => point.y);

  const minX = Math.min(...xs);

  const maxX = Math.max(...xs);

  const minY = Math.min(...ys);

  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,

    width: maxX - minX,

    height: maxY - minY,
  };
}

export function worldPointToNodeLocal(
  document: EditorDocument,
  nodeId: NodeId,
  point: Point,
): Point | null {
  const transform = getNodeWorldTransform(document, nodeId);

  if (!transform) {
    return null;
  }

  const inverse = invertMatrix(transform);

  if (!inverse) {
    return null;
  }

  return applyMatrixToPoint(inverse, point);
}
