import type { Point } from "@/editor/camera/types";
import { getNodeWorldGeometry } from "@/editor/document/nodeGeometry";
import type {
  EditorDocument,
  EditorNode,
  NodeId,
} from "@/editor/document/types";

export interface WorldBounds {
  minX: number;

  minY: number;

  maxX: number;

  maxY: number;
}

export interface ViewportCullingResult {
  document: EditorDocument;

  culledNodeIds: NodeId[];
}

export function createWorldBounds(first: Point, second: Point): WorldBounds {
  return {
    minX: Math.min(first.x, second.x),

    minY: Math.min(first.y, second.y),

    maxX: Math.max(first.x, second.x),

    maxY: Math.max(first.y, second.y),
  };
}

export function doWorldBoundsIntersect(
  first: WorldBounds,
  second: WorldBounds,
): boolean {
  return !(
    first.maxX < second.minX ||
    first.minX > second.maxX ||
    first.maxY < second.minY ||
    first.minY > second.maxY
  );
}

function getNodeWorldBounds(
  document: EditorDocument,
  nodeId: NodeId,
): WorldBounds | null {
  const geometry = getNodeWorldGeometry(document, nodeId);

  if (!geometry) {
    return null;
  }

  const corners = [
    geometry.corners.northWest,
    geometry.corners.northEast,
    geometry.corners.southEast,
    geometry.corners.southWest,
  ];

  let minX = Number.POSITIVE_INFINITY;

  let minY = Number.POSITIVE_INFINITY;

  let maxX = Number.NEGATIVE_INFINITY;

  let maxY = Number.NEGATIVE_INFINITY;

  for (const corner of corners) {
    minX = Math.min(minX, corner.x);

    minY = Math.min(minY, corner.y);

    maxX = Math.max(maxX, corner.x);

    maxY = Math.max(maxY, corner.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
  };
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

    /*
     * If geometry cannot be resolved,
     * stay conservative and keep the
     * node rather than accidentally
     * removing visible content.
     */
    const intersectsViewport = nodeBounds
      ? doWorldBoundsIntersect(nodeBounds, viewportBounds)
      : true;

    if (node.type !== "frame") {
      if (!intersectsViewport) {
        cullNode(nodeId, node);
      }

      return intersectsViewport;
    }

    /*
     * A clipped frame fully outside
     * the viewport guarantees that
     * none of its descendants can
     * produce visible pixels.
     *
     * We can therefore prune the
     * complete subtree by hiding only
     * the frame in the render document.
     */
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

    /*
     * Non-clipping frames require
     * special treatment.
     *
     * The frame itself may be outside
     * the viewport while one of its
     * children extends into it.
     *
     * In that case the frame must stay
     * available so the renderer can
     * traverse its children and preserve
     * the parent transform.
     */
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
