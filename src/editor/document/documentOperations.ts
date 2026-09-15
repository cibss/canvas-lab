import type { Bounds, Point } from "@/editor/camera/types";

import { getNodeWorldPosition } from "./nodeGeometry";
import type { EditorDocument, EditorNode, NodeId } from "./types";

function hasSelectedAncestor(
  document: EditorDocument,
  nodeId: NodeId,
  selectedNodeIds: ReadonlySet<NodeId>,
): boolean {
  const node = document.nodes[nodeId];

  if (!node) {
    return false;
  }

  let parentId = node.parentId;

  const visitedNodeIds = new Set<NodeId>();

  while (parentId) {
    if (visitedNodeIds.has(parentId)) {
      return false;
    }

    visitedNodeIds.add(parentId);

    if (selectedNodeIds.has(parentId)) {
      return true;
    }

    const parent = document.nodes[parentId];

    if (!parent) {
      return false;
    }

    parentId = parent.parentId;
  }

  return false;
}

function getTopLevelNodeIds(
  document: EditorDocument,
  nodeIds: NodeId[],
): NodeId[] {
  const validNodeIds = Array.from(new Set(nodeIds)).filter(
    (nodeId) => document.nodes[nodeId],
  );

  const selectedNodeIds = new Set(validNodeIds);

  return validNodeIds.filter(
    (nodeId) => !hasSelectedAncestor(document, nodeId, selectedNodeIds),
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

  const node = document.nodes[nodeId];

  if (!node) {
    return;
  }

  result.add(nodeId);

  if (node.type !== "frame") {
    return;
  }

  for (const childId of node.childIds) {
    collectDescendantNodeIds(document, childId, result);
  }
}

export function moveNodeBy(
  document: EditorDocument,
  nodeId: NodeId,
  delta: Point,
): EditorDocument {
  return moveNodesBy(document, [nodeId], delta);
}

export function moveNodesBy(
  document: EditorDocument,
  nodeIds: NodeId[],
  delta: Point,
): EditorDocument {
  if (delta.x === 0 && delta.y === 0) {
    return document;
  }

  const topLevelNodeIds = getTopLevelNodeIds(document, nodeIds);

  if (topLevelNodeIds.length === 0) {
    return document;
  }

  const nextNodes = {
    ...document.nodes,
  };

  let hasChanges = false;

  for (const nodeId of topLevelNodeIds) {
    const node = document.nodes[nodeId];

    if (!node || node.locked) {
      continue;
    }

    nextNodes[nodeId] = {
      ...node,

      x: node.x + delta.x,

      y: node.y + delta.y,
    };

    hasChanges = true;
  }

  if (!hasChanges) {
    return document;
  }

  return {
    ...document,
    nodes: nextNodes,
  };
}

export function resizeNodeToWorldBounds(
  document: EditorDocument,
  nodeId: NodeId,
  bounds: Bounds,
): EditorDocument {
  const node = document.nodes[nodeId];

  if (!node || node.locked) {
    return document;
  }

  let parentWorldX = 0;
  let parentWorldY = 0;

  if (node.parentId) {
    const parentPosition = getNodeWorldPosition(document, node.parentId);

    if (!parentPosition) {
      return document;
    }

    parentWorldX = parentPosition.x;

    parentWorldY = parentPosition.y;
  }

  const nextX = bounds.x - parentWorldX;

  const nextY = bounds.y - parentWorldY;

  const nextWidth = Math.max(1, bounds.width);

  const nextHeight = Math.max(1, bounds.height);

  if (
    node.x === nextX &&
    node.y === nextY &&
    node.width === nextWidth &&
    node.height === nextHeight
  ) {
    return document;
  }

  return {
    ...document,

    nodes: {
      ...document.nodes,

      [nodeId]: {
        ...node,

        x: nextX,
        y: nextY,

        width: nextWidth,
        height: nextHeight,
      },
    },
  };
}

export function deleteNodes(
  document: EditorDocument,
  nodeIds: NodeId[],
): EditorDocument {
  const topLevelNodeIds = getTopLevelNodeIds(document, nodeIds).filter(
    (nodeId) => {
      const node = document.nodes[nodeId];

      return node && !node.locked;
    },
  );

  if (topLevelNodeIds.length === 0) {
    return document;
  }

  const nodeIdsToDelete = new Set<NodeId>();

  for (const nodeId of topLevelNodeIds) {
    collectDescendantNodeIds(document, nodeId, nodeIdsToDelete);
  }

  const nextNodes: Record<NodeId, EditorNode> = {};

  for (const [nodeId, node] of Object.entries(document.nodes)) {
    if (nodeIdsToDelete.has(nodeId)) {
      continue;
    }

    if (node.type === "frame") {
      const childIds = node.childIds.filter(
        (childId) => !nodeIdsToDelete.has(childId),
      );

      nextNodes[nodeId] =
        childIds.length === node.childIds.length
          ? node
          : {
              ...node,
              childIds,
            };

      continue;
    }

    nextNodes[nodeId] = node;
  }

  return {
    ...document,

    rootNodeIds: document.rootNodeIds.filter(
      (rootNodeId) => !nodeIdsToDelete.has(rootNodeId),
    ),

    nodes: nextNodes,
  };
}
