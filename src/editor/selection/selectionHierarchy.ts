import type { EditorDocument, NodeId } from "@/editor/document/types";

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
