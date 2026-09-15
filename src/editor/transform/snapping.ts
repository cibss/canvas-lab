import type { Bounds, Point } from "@/editor/camera/types";
import { getNodeWorldBounds } from "@/editor/document/nodeGeometry";
import type { EditorDocument, NodeId } from "@/editor/document/types";
import { getTopLevelSelectedNodeIds } from "@/editor/selection/selectionHierarchy";

import type { ResizeHandlePosition } from "./types";

export const SNAP_THRESHOLD_SCREEN_PX = 6;
export const ROTATION_SNAP_INCREMENT = 15;

export type SnapAxis = "x" | "y";

export interface SnapCandidate {
  axis: SnapAxis;

  position: number;

  nodeId: NodeId;

  bounds: Bounds;
}

export interface SnapMatch {
  axis: SnapAxis;

  position: number;

  targetBounds: Bounds;
}

export interface SnapGuide {
  orientation: "vertical" | "horizontal";

  position: number;

  start: number;
  end: number;
}

export interface TranslationSnapResult {
  delta: Point;

  guides: SnapGuide[];
}

export interface ResizePointSnapResult {
  point: Point;

  matches: SnapMatch[];
}

function collectExcludedSubtree(
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
    collectExcludedSubtree(document, childId, result);
  }
}

function addBoundsCandidates(
  nodeId: NodeId,
  bounds: Bounds,
  result: SnapCandidate[],
) {
  result.push(
    {
      axis: "x",
      position: bounds.x,
      nodeId,
      bounds,
    },
    {
      axis: "x",
      position: bounds.x + bounds.width / 2,
      nodeId,
      bounds,
    },
    {
      axis: "x",
      position: bounds.x + bounds.width,
      nodeId,
      bounds,
    },
    {
      axis: "y",
      position: bounds.y,
      nodeId,
      bounds,
    },
    {
      axis: "y",
      position: bounds.y + bounds.height / 2,
      nodeId,
      bounds,
    },
    {
      axis: "y",
      position: bounds.y + bounds.height,
      nodeId,
      bounds,
    },
  );
}

function collectSnapCandidatesFromNode(
  document: EditorDocument,
  nodeId: NodeId,
  excludedNodeIds: ReadonlySet<NodeId>,
  result: SnapCandidate[],
) {
  const node = document.nodes[nodeId];

  if (!node || !node.visible || node.locked) {
    return;
  }

  if (!excludedNodeIds.has(nodeId)) {
    const bounds = getNodeWorldBounds(document, nodeId);

    if (bounds) {
      addBoundsCandidates(nodeId, bounds, result);
    }
  }

  if (node.type !== "frame") {
    return;
  }

  for (const childId of node.childIds) {
    collectSnapCandidatesFromNode(document, childId, excludedNodeIds, result);
  }
}

export function createSnapCandidates(
  document: EditorDocument,
  selectedNodeIds: NodeId[],
): SnapCandidate[] {
  const excludedNodeIds = new Set<NodeId>();

  const topLevelSelectedNodeIds = getTopLevelSelectedNodeIds(
    document,
    selectedNodeIds,
  );

  for (const nodeId of topLevelSelectedNodeIds) {
    collectExcludedSubtree(document, nodeId, excludedNodeIds);
  }

  const result: SnapCandidate[] = [];

  for (const rootNodeId of document.rootNodeIds) {
    collectSnapCandidatesFromNode(
      document,
      rootNodeId,
      excludedNodeIds,
      result,
    );
  }

  return result;
}

function getWorldThreshold(zoom: number): number {
  return SNAP_THRESHOLD_SCREEN_PX / Math.max(zoom, 0.0001);
}

interface BestSnap {
  correction: number;

  match: SnapMatch;
}

function findBestSnap(
  sourcePositions: number[],
  candidates: SnapCandidate[],
  axis: SnapAxis,
  threshold: number,
): BestSnap | null {
  let best: BestSnap | null = null;

  let bestDistance = Number.POSITIVE_INFINITY;

  for (const sourcePosition of sourcePositions) {
    for (const candidate of candidates) {
      if (candidate.axis !== axis) {
        continue;
      }

      const correction = candidate.position - sourcePosition;

      const distance = Math.abs(correction);

      if (distance > threshold || distance >= bestDistance) {
        continue;
      }

      bestDistance = distance;

      best = {
        correction,

        match: {
          axis,
          position: candidate.position,

          targetBounds: candidate.bounds,
        },
      };
    }
  }

  return best;
}

function offsetBounds(bounds: Bounds, delta: Point): Bounds {
  return {
    x: bounds.x + delta.x,

    y: bounds.y + delta.y,

    width: bounds.width,

    height: bounds.height,
  };
}

function createGuide(match: SnapMatch, movingBounds: Bounds): SnapGuide {
  if (match.axis === "x") {
    return {
      orientation: "vertical",

      position: match.position,

      start: Math.min(match.targetBounds.y, movingBounds.y),

      end: Math.max(
        match.targetBounds.y + match.targetBounds.height,

        movingBounds.y + movingBounds.height,
      ),
    };
  }

  return {
    orientation: "horizontal",

    position: match.position,

    start: Math.min(match.targetBounds.x, movingBounds.x),

    end: Math.max(
      match.targetBounds.x + match.targetBounds.width,

      movingBounds.x + movingBounds.width,
    ),
  };
}

export function createSnapGuidesFromMatches(
  matches: SnapMatch[],
  movingBounds: Bounds,
): SnapGuide[] {
  return matches.map((match) => createGuide(match, movingBounds));
}

export function snapBoundsTranslation(
  initialBounds: Bounds,
  desiredDelta: Point,
  candidates: SnapCandidate[],
  zoom: number,
): TranslationSnapResult {
  const movedBounds = offsetBounds(initialBounds, desiredDelta);

  const threshold = getWorldThreshold(zoom);

  const xSnap = findBestSnap(
    [
      movedBounds.x,

      movedBounds.x + movedBounds.width / 2,

      movedBounds.x + movedBounds.width,
    ],
    candidates,
    "x",
    threshold,
  );

  const ySnap = findBestSnap(
    [
      movedBounds.y,

      movedBounds.y + movedBounds.height / 2,

      movedBounds.y + movedBounds.height,
    ],
    candidates,
    "y",
    threshold,
  );

  const delta = {
    x: desiredDelta.x + (xSnap?.correction ?? 0),

    y: desiredDelta.y + (ySnap?.correction ?? 0),
  };

  const snappedBounds = offsetBounds(initialBounds, delta);

  const matches: SnapMatch[] = [];

  if (xSnap) {
    matches.push(xSnap.match);
  }

  if (ySnap) {
    matches.push(ySnap.match);
  }

  return {
    delta,

    guides: createSnapGuidesFromMatches(matches, snappedBounds),
  };
}

function resizeHandleAffectsHorizontal(handle: ResizeHandlePosition): boolean {
  return (
    handle === "west" ||
    handle === "east" ||
    handle === "north-west" ||
    handle === "north-east" ||
    handle === "south-west" ||
    handle === "south-east"
  );
}

function resizeHandleAffectsVertical(handle: ResizeHandlePosition): boolean {
  return (
    handle === "north" ||
    handle === "south" ||
    handle === "north-west" ||
    handle === "north-east" ||
    handle === "south-west" ||
    handle === "south-east"
  );
}

export function snapResizePoint(
  point: Point,
  handle: ResizeHandlePosition,
  candidates: SnapCandidate[],
  zoom: number,
): ResizePointSnapResult {
  const threshold = getWorldThreshold(zoom);

  const nextPoint = {
    ...point,
  };

  const matches: SnapMatch[] = [];

  if (resizeHandleAffectsHorizontal(handle)) {
    const xSnap = findBestSnap([point.x], candidates, "x", threshold);

    if (xSnap) {
      nextPoint.x += xSnap.correction;

      matches.push(xSnap.match);
    }
  }

  if (resizeHandleAffectsVertical(handle)) {
    const ySnap = findBestSnap([point.y], candidates, "y", threshold);

    if (ySnap) {
      nextPoint.y += ySnap.correction;

      matches.push(ySnap.match);
    }
  }

  return {
    point: nextPoint,
    matches,
  };
}

export function canSnapSingleNodeResize(worldRotation: number): boolean {
  const normalized = ((worldRotation % 180) + 180) % 180;

  return Math.min(normalized, 180 - normalized) < 0.0001;
}

export function snapAngle(
  angle: number,
  increment = ROTATION_SNAP_INCREMENT,
): number {
  if (increment <= 0) {
    return angle;
  }

  return Math.round(angle / increment) * increment;
}
