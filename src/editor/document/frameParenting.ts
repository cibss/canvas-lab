import type { Bounds, Point } from "@/editor/camera/types";
import {
  getNodeWorldGeometry,
  getNodeWorldTransform,
  worldPointToNodeLocal,
} from "@/editor/document/nodeGeometry";
import {
  applyMatrixToPoint,
  getMatrixRotationDegrees,
  invertMatrix,
} from "@/editor/geometry/matrix";

import type { EditorDocument, FrameNode, NodeId } from "./types";

const CONTAINMENT_EPSILON = 0.0001;

export interface ChildPlacement {
  parentId: NodeId | null;
  x: number;
  y: number;
  rotation: number;
}

interface FrameCandidate {
  frameId: NodeId;
  depth: number;
  order: number;
}

function isPointInsideFrameLocalBounds(
  frame: FrameNode,
  point: Point,
): boolean {
  return (
    point.x >= -CONTAINMENT_EPSILON &&
    point.y >= -CONTAINMENT_EPSILON &&
    point.x <= frame.width + CONTAINMENT_EPSILON &&
    point.y <= frame.height + CONTAINMENT_EPSILON
  );
}

function collectDescendantNodeIds(
  document: EditorDocument,
  nodeId: NodeId,
  result: Set<NodeId>,
) {
  if (result.has(nodeId)) {
    return;
  }

  result.add(nodeId);

  const node = document.nodes[nodeId];

  if (!node || node.type !== "frame") {
    return;
  }

  for (const childId of node.childIds) {
    collectDescendantNodeIds(document, childId, result);
  }
}

function collectAvailableFrameCandidates(
  document: EditorDocument,
  excludedNodeIds: ReadonlySet<NodeId> = new Set<NodeId>(),
): FrameCandidate[] {
  const candidates: FrameCandidate[] = [];
  const visitedNodeIds = new Set<NodeId>();
  let order = 0;

  const visit = (
    nodeId: NodeId,
    depth: number,
    ancestorsAvailable: boolean,
  ) => {
    if (visitedNodeIds.has(nodeId)) {
      return;
    }

    visitedNodeIds.add(nodeId);

    const node = document.nodes[nodeId];

    if (!node) {
      return;
    }

    const available =
      ancestorsAvailable &&
      node.visible &&
      !node.locked &&
      !excludedNodeIds.has(nodeId);

    if (node.type !== "frame") {
      return;
    }

    if (available) {
      candidates.push({
        frameId: node.id,
        depth,
        order,
      });

      order += 1;
    }

    for (const childId of node.childIds) {
      visit(childId, depth + 1, available);
    }
  };

  for (const rootNodeId of document.rootNodeIds) {
    visit(rootNodeId, 0, true);
  }

  return candidates;
}

function chooseBestContainingFrame(matches: FrameCandidate[]): NodeId | null {
  if (matches.length === 0) {
    return null;
  }

  matches.sort((first, second) => {
    if (first.depth !== second.depth) {
      return second.depth - first.depth;
    }

    return second.order - first.order;
  });

  return matches[0]?.frameId ?? null;
}

function findFrameContainingWorldPoints(
  document: EditorDocument,
  points: readonly Point[],
  excludedNodeIds: ReadonlySet<NodeId> = new Set<NodeId>(),
): NodeId | null {
  const matches: FrameCandidate[] = [];

  for (const candidate of collectAvailableFrameCandidates(
    document,
    excludedNodeIds,
  )) {
    const frame = document.nodes[candidate.frameId];

    if (!frame || frame.type !== "frame") {
      continue;
    }

    const containsAllPoints = points.every((point) => {
      const localPoint = worldPointToNodeLocal(document, frame.id, point);

      return (
        localPoint !== null && isPointInsideFrameLocalBounds(frame, localPoint)
      );
    });

    if (containsAllPoints) {
      matches.push(candidate);
    }
  }

  return chooseBestContainingFrame(matches);
}

export function findFrameContainingWorldPoint(
  document: EditorDocument,
  point: Point,
): NodeId | null {
  return findFrameContainingWorldPoints(document, [point]);
}

export function findFrameContainingWorldBounds(
  document: EditorDocument,
  bounds: Bounds,
): NodeId | null {
  return findFrameContainingWorldPoints(document, [
    {
      x: bounds.x,
      y: bounds.y,
    },
    {
      x: bounds.x + bounds.width,
      y: bounds.y,
    },
    {
      x: bounds.x + bounds.width,
      y: bounds.y + bounds.height,
    },
    {
      x: bounds.x,
      y: bounds.y + bounds.height,
    },
  ]);
}

export function findFrameContainingWorldNode(
  document: EditorDocument,
  nodeId: NodeId,
): NodeId | null {
  const geometry = getNodeWorldGeometry(document, nodeId);

  if (!geometry) {
    return null;
  }

  const excludedNodeIds = new Set<NodeId>();

  collectDescendantNodeIds(document, nodeId, excludedNodeIds);

  return findFrameContainingWorldPoints(
    document,
    [
      geometry.corners.northWest,
      geometry.corners.northEast,
      geometry.corners.southEast,
      geometry.corners.southWest,
    ],
    excludedNodeIds,
  );
}

export function getChildPlacementForWorldBounds(
  document: EditorDocument,
  parentId: NodeId | null,
  bounds: Bounds,
  worldRotation = 0,
): ChildPlacement {
  if (!parentId) {
    return {
      parentId: null,
      x: bounds.x,
      y: bounds.y,
      rotation: worldRotation,
    };
  }

  const parent = document.nodes[parentId];
  const parentTransform = getNodeWorldTransform(document, parentId);

  if (!parent || parent.type !== "frame" || !parentTransform) {
    return {
      parentId: null,
      x: bounds.x,
      y: bounds.y,
      rotation: worldRotation,
    };
  }

  const inverseParentTransform = invertMatrix(parentTransform);

  if (!inverseParentTransform) {
    return {
      parentId: null,
      x: bounds.x,
      y: bounds.y,
      rotation: worldRotation,
    };
  }

  const worldCenter = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };

  const localCenter = applyMatrixToPoint(inverseParentTransform, worldCenter);

  const parentWorldRotation = getMatrixRotationDegrees(parentTransform);

  return {
    parentId,
    x: localCenter.x - bounds.width / 2,
    y: localCenter.y - bounds.height / 2,
    rotation: worldRotation - parentWorldRotation,
  };
}
