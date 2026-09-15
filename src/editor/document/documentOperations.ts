import type { Point } from "@/editor/camera/types";

import type { EditorDocument, NodeId } from "./types";

export function moveNodeBy(
  document: EditorDocument,
  nodeId: NodeId,
  delta: Point,
): EditorDocument {
  const node = document.nodes[nodeId];

  if (!node) {
    return document;
  }

  if (delta.x === 0 && delta.y === 0) {
    return document;
  }

  return {
    ...document,

    nodes: {
      ...document.nodes,

      [nodeId]: {
        ...node,

        x: node.x + delta.x,
        y: node.y + delta.y,
      },
    },
  };
}
