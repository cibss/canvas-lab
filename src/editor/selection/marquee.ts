import type { Bounds, Point } from "@/editor/camera/types";
import { getNodeWorldBounds } from "@/editor/document/nodeGeometry";
import type { EditorDocument, NodeId } from "@/editor/document/types";

export interface MarqueeState {
  start: Point;
  current: Point;
}

export function getMarqueeBounds(marquee: MarqueeState): Bounds {
  const x = Math.min(marquee.start.x, marquee.current.x);

  const y = Math.min(marquee.start.y, marquee.current.y);

  return {
    x,
    y,

    width: Math.abs(marquee.current.x - marquee.start.x),

    height: Math.abs(marquee.current.y - marquee.start.y),
  };
}

function containsBounds(container: Bounds, target: Bounds): boolean {
  return (
    target.x >= container.x &&
    target.y >= container.y &&
    target.x + target.width <= container.x + container.width &&
    target.y + target.height <= container.y + container.height
  );
}

function collectCandidateNodeIds(
  document: EditorDocument,
  nodeId: NodeId,
  marqueeBounds: Bounds,
  result: NodeId[],
) {
  const node = document.nodes[nodeId];

  if (!node || !node.visible || node.locked) {
    return;
  }

  if (node.type === "frame") {
    for (const childId of node.childIds) {
      collectCandidateNodeIds(document, childId, marqueeBounds, result);
    }
  }

  const nodeBounds = getNodeWorldBounds(document, nodeId);

  if (nodeBounds && containsBounds(marqueeBounds, nodeBounds)) {
    result.push(nodeId);
  }
}

function hasCandidateDescendant(
  document: EditorDocument,
  nodeId: NodeId,
  candidateNodeIds: ReadonlySet<NodeId>,
  visitedNodeIds: Set<NodeId>,
): boolean {
  if (visitedNodeIds.has(nodeId)) {
    return false;
  }

  visitedNodeIds.add(nodeId);

  const node = document.nodes[nodeId];

  if (!node || node.type !== "frame") {
    return false;
  }

  for (const childId of node.childIds) {
    if (candidateNodeIds.has(childId)) {
      return true;
    }

    if (
      hasCandidateDescendant(
        document,
        childId,
        candidateNodeIds,
        visitedNodeIds,
      )
    ) {
      return true;
    }
  }

  return false;
}

export function findNodesWithinMarquee(
  document: EditorDocument,
  marqueeBounds: Bounds,
): NodeId[] {
  const candidates: NodeId[] = [];

  for (const rootNodeId of document.rootNodeIds) {
    collectCandidateNodeIds(document, rootNodeId, marqueeBounds, candidates);
  }

  const candidateNodeIds = new Set(candidates);

  return candidates.filter(
    (nodeId) =>
      !hasCandidateDescendant(
        document,
        nodeId,
        candidateNodeIds,
        new Set<NodeId>(),
      ),
  );
}
