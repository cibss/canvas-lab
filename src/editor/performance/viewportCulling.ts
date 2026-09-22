import type {
  EditorDocument,
  EditorNode,
  NodeId,
} from "@/editor/document/types";

import {
  doWorldBoundsIntersect,
  getNodeWorldBounds,
  type WorldBounds,
} from "./worldBounds";

export { createWorldBounds, doWorldBoundsIntersect } from "./worldBounds";

export type { WorldBounds } from "./worldBounds";

export interface ViewportCullingResult {
  document: EditorDocument;

  culledNodeIds: NodeId[];
}

export function createViewportRenderDocument(
  document: EditorDocument,
  viewportBounds: WorldBounds,
): ViewportCullingResult {
  const visitedNodeIds = new Set<NodeId>();

  const culledNodeIds: NodeId[] = [];

  let nextNodes = document.nodes;

  let hasChanges = false;

  const cullNode = (nodeId: NodeId, node: EditorNode) => {
    if (!node.visible) {
      return;
    }

    if (!hasChanges) {
      nextNodes = {
        ...document.nodes,
      };

      hasChanges = true;
    }

    nextNodes[nodeId] = {
      ...node,

      visible: false,
    };

    culledNodeIds.push(nodeId);
  };

  const processNode = (nodeId: NodeId): boolean => {
    if (visitedNodeIds.has(nodeId)) {
      return false;
    }

    visitedNodeIds.add(nodeId);

    const node = document.nodes[nodeId];

    if (!node || !node.visible) {
      return false;
    }

    const nodeBounds = getNodeWorldBounds(document, nodeId);

    const intersectsViewport = nodeBounds
      ? doWorldBoundsIntersect(nodeBounds, viewportBounds)
      : true;

    if (node.type !== "frame") {
      if (!intersectsViewport) {
        cullNode(nodeId, node);
      }

      return intersectsViewport;
    }

    if (node.clipContent && !intersectsViewport) {
      cullNode(nodeId, node);

      return false;
    }

    let hasVisibleDescendant = false;

    for (const childId of node.childIds) {
      if (processNode(childId)) {
        hasVisibleDescendant = true;
      }
    }

    const shouldKeepFrame = intersectsViewport || hasVisibleDescendant;

    if (!shouldKeepFrame) {
      cullNode(nodeId, node);
    }

    return shouldKeepFrame;
  };

  for (const rootNodeId of document.rootNodeIds) {
    processNode(rootNodeId);
  }

  if (!hasChanges) {
    return {
      document,

      culledNodeIds,
    };
  }

  return {
    document: {
      ...document,

      nodes: nextNodes,
    },

    culledNodeIds,
  };
}
