import type { Bounds, Point } from "@/editor/camera/types";

import type { EditorDocument, NodeId } from "./types";

export function getNodeWorldPosition(
  document: EditorDocument,
  nodeId: NodeId,
): Point | null {
  const node = document.nodes[nodeId];

  if (!node) {
    return null;
  }

  let x = node.x;
  let y = node.y;

  let parentId = node.parentId;

  const visitedNodeIds = new Set<NodeId>([node.id]);

  while (parentId) {
    if (visitedNodeIds.has(parentId)) {
      return null;
    }

    const parent = document.nodes[parentId];

    if (!parent) {
      return null;
    }

    visitedNodeIds.add(parentId);

    x += parent.x;
    y += parent.y;

    parentId = parent.parentId;
  }

  return {
    x,
    y,
  };
}

export function getNodeWorldBounds(
  document: EditorDocument,
  nodeId: NodeId,
): Bounds | null {
  const node = document.nodes[nodeId];

  if (!node) {
    return null;
  }

  const position = getNodeWorldPosition(document, nodeId);

  if (!position) {
    return null;
  }

  return {
    x: position.x,
    y: position.y,
    width: node.width,
    height: node.height,
  };
}
