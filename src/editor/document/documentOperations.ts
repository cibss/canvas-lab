import type { Point } from "@/editor/camera/types";

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
