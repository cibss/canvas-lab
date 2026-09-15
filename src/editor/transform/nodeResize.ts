import type { Point } from "@/editor/camera/types";
import {
  getNodeParentWorldTransform,
  getNodeWorldGeometry,
} from "@/editor/document/nodeGeometry";
import type { EditorDocument, NodeId } from "@/editor/document/types";
import {
  applyMatrixToPoint,
  invertMatrix,
  rotateVector,
  type Matrix2D,
} from "@/editor/geometry/matrix";

import {
  resizeBoundsFromHandle,
  type ResizeBoundsOptions,
} from "./resizeBounds";
import type { ResizeHandlePosition } from "./types";

export interface NodeResizeSession {
  nodeId: NodeId;

  handle: ResizeHandlePosition;

  initialWidth: number;
  initialHeight: number;

  initialWorldCenter: Point;

  worldRotation: number;

  parentWorldInverse: Matrix2D;
}

export function createNodeResizeSession(
  document: EditorDocument,
  nodeId: NodeId,
  handle: ResizeHandlePosition,
): NodeResizeSession | null {
  const node = document.nodes[nodeId];

  if (!node || node.locked) {
    return null;
  }

  const geometry = getNodeWorldGeometry(document, nodeId);

  const parentTransform = getNodeParentWorldTransform(document, nodeId);

  if (!geometry || !parentTransform) {
    return null;
  }

  const parentWorldInverse = invertMatrix(parentTransform);

  if (!parentWorldInverse) {
    return null;
  }

  return {
    nodeId,
    handle,

    initialWidth: node.width,

    initialHeight: node.height,

    initialWorldCenter: geometry.center,

    worldRotation: geometry.rotation,

    parentWorldInverse,
  };
}

export function resizeNodeWithSession(
  document: EditorDocument,
  session: NodeResizeSession,
  pointerWorld: Point,
  options: ResizeBoundsOptions = {},
): EditorDocument {
  const node = document.nodes[session.nodeId];

  if (!node || node.locked) {
    return document;
  }

  const pointerOffset = {
    x: pointerWorld.x - session.initialWorldCenter.x,

    y: pointerWorld.y - session.initialWorldCenter.y,
  };

  const pointerInResizeSpace = rotateVector(
    pointerOffset,
    -session.worldRotation,
  );

  const initialBounds = {
    x: -session.initialWidth / 2,

    y: -session.initialHeight / 2,

    width: session.initialWidth,

    height: session.initialHeight,
  };

  const nextBounds = resizeBoundsFromHandle(
    initialBounds,
    session.handle,
    pointerInResizeSpace,
    options,
  );

  const nextCenterOffset = {
    x: nextBounds.x + nextBounds.width / 2,

    y: nextBounds.y + nextBounds.height / 2,
  };

  const nextWorldCenterOffset = rotateVector(
    nextCenterOffset,
    session.worldRotation,
  );

  const nextWorldCenter = {
    x: session.initialWorldCenter.x + nextWorldCenterOffset.x,

    y: session.initialWorldCenter.y + nextWorldCenterOffset.y,
  };

  const nextParentCenter = applyMatrixToPoint(
    session.parentWorldInverse,
    nextWorldCenter,
  );

  const nextX = nextParentCenter.x - nextBounds.width / 2;

  const nextY = nextParentCenter.y - nextBounds.height / 2;

  return {
    ...document,

    nodes: {
      ...document.nodes,

      [session.nodeId]: {
        ...node,

        x: nextX,
        y: nextY,

        width: nextBounds.width,

        height: nextBounds.height,
      },
    },
  };
}
