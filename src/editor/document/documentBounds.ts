import type { Bounds } from "@/editor/camera/types";

import type { EditorDocument, EditorNode } from "./types";

export function getDocumentBounds(document: EditorDocument): Bounds | null {
  const rootNodes: EditorNode[] = [];

  for (const rootNodeId of document.rootNodeIds) {
    const rootNode = document.nodes[rootNodeId];

    if (rootNode) {
      rootNodes.push(rootNode);
    }
  }

  if (rootNodes.length === 0) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;

  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of rootNodes) {
    minX = Math.min(minX, node.x);

    minY = Math.min(minY, node.y);

    maxX = Math.max(maxX, node.x + node.width);

    maxY = Math.max(maxY, node.y + node.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
