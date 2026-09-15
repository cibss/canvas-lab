import type { Point } from "@/editor/camera/types";
import {
  getNodeParentWorldTransform,
  getNodeWorldGeometry,
} from "@/editor/document/nodeGeometry";
import type {
  EditorDocument,
  EditorNode,
  NodeId,
} from "@/editor/document/types";
import {
  applyMatrixToPoint,
  invertMatrix,
  rotateVector,
  type Matrix2D,
} from "@/editor/geometry/matrix";
import type { SelectionState } from "@/editor/selection/selection";
import { getTopLevelSelectedNodeIds } from "@/editor/selection/selectionHierarchy";

import {
  DEFAULT_MIN_RESIZE_SIZE,
  resizeBoundsFromHandle,
  type ResizeBoundsOptions,
} from "./resizeBounds";
import { normalizeRotation } from "./rotation";
import { getSelectionBounds } from "./selectionBounds";
import type { ResizeHandlePosition, TransformBounds } from "./types";

interface MultiSelectionNodeSnapshot {
  nodeId: NodeId;

  initialWidth: number;
  initialHeight: number;
  initialRotation: number;

  initialWorldCenter: Point;

  parentWorldInverse: Matrix2D;

  worldRotation: number;
}

export interface MultiSelectionTransformSession {
  initialBounds: TransformBounds;

  nodes: MultiSelectionNodeSnapshot[];

  requiresUniformScaling: boolean;

  minBoundsWidth: number;

  minBoundsHeight: number;
}

function isSafeForNonUniformScaling(worldRotation: number): boolean {
  const normalized = ((worldRotation % 180) + 180) % 180;

  return normalized < 0.0001 || Math.abs(normalized - 180) < 0.0001;
}

function updateNodeFromWorldCenter(
  node: EditorNode,
  snapshot: MultiSelectionNodeSnapshot,
  worldCenter: Point,
  width: number,
  height: number,
  rotation: number,
): EditorNode {
  const localCenter = applyMatrixToPoint(
    snapshot.parentWorldInverse,
    worldCenter,
  );

  return {
    ...node,

    x: localCenter.x - width / 2,

    y: localCenter.y - height / 2,

    width,
    height,

    rotation,
  };
}

export function createMultiSelectionTransformSession(
  document: EditorDocument,
  selection: SelectionState,
): MultiSelectionTransformSession | null {
  const topLevelNodeIds = getTopLevelSelectedNodeIds(
    document,
    selection.selectedNodeIds,
  ).filter((nodeId) => {
    const node = document.nodes[nodeId];

    return node && !node.locked;
  });

  if (topLevelNodeIds.length < 2) {
    return null;
  }

  const effectiveSelection: SelectionState = {
    selectedNodeIds: topLevelNodeIds,
  };

  const initialBounds = getSelectionBounds(document, effectiveSelection);

  if (!initialBounds || initialBounds.width <= 0 || initialBounds.height <= 0) {
    return null;
  }

  const nodes: MultiSelectionNodeSnapshot[] = [];

  let requiresUniformScaling = false;

  let minimumWidthScale = 0;

  let minimumHeightScale = 0;

  for (const nodeId of topLevelNodeIds) {
    const node = document.nodes[nodeId];

    const geometry = getNodeWorldGeometry(document, nodeId);

    const parentWorldTransform = getNodeParentWorldTransform(document, nodeId);

    if (!node || !geometry || !parentWorldTransform) {
      continue;
    }

    const parentWorldInverse = invertMatrix(parentWorldTransform);

    if (!parentWorldInverse) {
      continue;
    }

    requiresUniformScaling ||= !isSafeForNonUniformScaling(geometry.rotation);

    minimumWidthScale = Math.max(
      minimumWidthScale,
      DEFAULT_MIN_RESIZE_SIZE / Math.max(node.width, Number.EPSILON),
    );

    minimumHeightScale = Math.max(
      minimumHeightScale,
      DEFAULT_MIN_RESIZE_SIZE / Math.max(node.height, Number.EPSILON),
    );

    nodes.push({
      nodeId,

      initialWidth: node.width,

      initialHeight: node.height,

      initialRotation: node.rotation,

      initialWorldCenter: geometry.center,

      parentWorldInverse,

      worldRotation: geometry.rotation,
    });
  }

  if (nodes.length < 2) {
    return null;
  }

  return {
    initialBounds,

    nodes,

    requiresUniformScaling,

    minBoundsWidth: initialBounds.width * minimumWidthScale,

    minBoundsHeight: initialBounds.height * minimumHeightScale,
  };
}

export function translateMultiSelection(
  document: EditorDocument,
  session: MultiSelectionTransformSession,
  worldDelta: Point,
): EditorDocument {
  if (worldDelta.x === 0 && worldDelta.y === 0) {
    return document;
  }

  const nextNodes = {
    ...document.nodes,
  };

  for (const snapshot of session.nodes) {
    const node = document.nodes[snapshot.nodeId];

    if (!node || node.locked) {
      continue;
    }

    const nextWorldCenter = {
      x: snapshot.initialWorldCenter.x + worldDelta.x,

      y: snapshot.initialWorldCenter.y + worldDelta.y,
    };

    nextNodes[snapshot.nodeId] = updateNodeFromWorldCenter(
      node,
      snapshot,
      nextWorldCenter,
      snapshot.initialWidth,
      snapshot.initialHeight,
      snapshot.initialRotation,
    );
  }

  return {
    ...document,
    nodes: nextNodes,
  };
}

export function resizeMultiSelection(
  document: EditorDocument,
  session: MultiSelectionTransformSession,
  handle: ResizeHandlePosition,
  pointerWorld: Point,
  options: ResizeBoundsOptions = {},
): EditorDocument {
  const preserveAspectRatio =
    options.preserveAspectRatio || session.requiresUniformScaling;

  const nextBounds = resizeBoundsFromHandle(
    session.initialBounds,
    handle,
    pointerWorld,
    {
      ...options,

      preserveAspectRatio,

      minWidth: Math.max(options.minWidth ?? 0, session.minBoundsWidth),

      minHeight: Math.max(options.minHeight ?? 0, session.minBoundsHeight),
    },
  );

  const scaleX = nextBounds.width / session.initialBounds.width;

  const scaleY = nextBounds.height / session.initialBounds.height;

  const nextNodes = {
    ...document.nodes,
  };

  for (const snapshot of session.nodes) {
    const node = document.nodes[snapshot.nodeId];

    if (!node || node.locked) {
      continue;
    }

    const relativeCenterX =
      (snapshot.initialWorldCenter.x - session.initialBounds.x) /
      session.initialBounds.width;

    const relativeCenterY =
      (snapshot.initialWorldCenter.y - session.initialBounds.y) /
      session.initialBounds.height;

    const nextWorldCenter = {
      x: nextBounds.x + relativeCenterX * nextBounds.width,

      y: nextBounds.y + relativeCenterY * nextBounds.height,
    };

    const nextWidth = snapshot.initialWidth * scaleX;

    const nextHeight = snapshot.initialHeight * scaleY;

    nextNodes[snapshot.nodeId] = updateNodeFromWorldCenter(
      node,
      snapshot,
      nextWorldCenter,
      nextWidth,
      nextHeight,
      snapshot.initialRotation,
    );
  }

  return {
    ...document,
    nodes: nextNodes,
  };
}

export function rotateMultiSelection(
  document: EditorDocument,
  session: MultiSelectionTransformSession,
  rotationDelta: number,
): EditorDocument {
  const center = {
    x: session.initialBounds.centerX,

    y: session.initialBounds.centerY,
  };

  const nextNodes = {
    ...document.nodes,
  };

  for (const snapshot of session.nodes) {
    const node = document.nodes[snapshot.nodeId];

    if (!node || node.locked) {
      continue;
    }

    const centerOffset = {
      x: snapshot.initialWorldCenter.x - center.x,

      y: snapshot.initialWorldCenter.y - center.y,
    };

    const rotatedOffset = rotateVector(centerOffset, rotationDelta);

    const nextWorldCenter = {
      x: center.x + rotatedOffset.x,

      y: center.y + rotatedOffset.y,
    };

    nextNodes[snapshot.nodeId] = updateNodeFromWorldCenter(
      node,
      snapshot,
      nextWorldCenter,
      snapshot.initialWidth,
      snapshot.initialHeight,
      normalizeRotation(snapshot.initialRotation + rotationDelta),
    );
  }

  return {
    ...document,
    nodes: nextNodes,
  };
}
