import type { EditorDocument, NodeId } from "@/editor/document/types";

import type { SelectionState } from "./selection";

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

export function getNodeSubtreeIds(
  document: EditorDocument,
  nodeId: NodeId,
): NodeId[] {
  const result: NodeId[] = [];

  const visited = new Set<NodeId>();

  const visit = (currentNodeId: NodeId) => {
    if (visited.has(currentNodeId)) {
      return;
    }

    visited.add(currentNodeId);

    const node = document.nodes[currentNodeId];

    if (!node) {
      return;
    }

    result.push(currentNodeId);

    if (node.type !== "frame") {
      return;
    }

    for (const childId of node.childIds) {
      visit(childId);
    }
  };

  visit(nodeId);

  return result;
}

export function removeNodeSubtreeFromSelection(
  document: EditorDocument,
  selection: SelectionState,
  nodeId: NodeId,
): SelectionState {
  const subtreeNodeIds = new Set(getNodeSubtreeIds(document, nodeId));

  if (subtreeNodeIds.size === 0) {
    return selection;
  }

  const nextNodeIds = selection.selectedNodeIds.filter(
    (selectedNodeId) => !subtreeNodeIds.has(selectedNodeId),
  );

  if (nextNodeIds.length === selection.selectedNodeIds.length) {
    return selection;
  }

  return {
    selectedNodeIds: nextNodeIds,
  };
}

export function getTopLevelSelectedNodeIds(
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
