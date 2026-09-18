import type {
  EditorDocument,
  EditorNode,
  NodeId,
} from "@/editor/document/types";

export interface SemanticNode {
  id: NodeId;

  name: string;

  type: EditorNode["type"];

  width: number;

  height: number;

  rotation: number;

  opacity: number;

  locked: boolean;

  children: SemanticNode[];
}

function createSemanticNode(
  document: EditorDocument,
  nodeId: NodeId,
  visitedNodeIds: Set<NodeId>,
): SemanticNode | null {
  if (visitedNodeIds.has(nodeId)) {
    return null;
  }

  const node = document.nodes[nodeId];

  if (!node || !node.visible) {
    return null;
  }

  visitedNodeIds.add(nodeId);

  const children =
    node.type === "frame"
      ? node.childIds
          .map((childId) =>
            createSemanticNode(document, childId, visitedNodeIds),
          )
          .filter((child): child is SemanticNode => child !== null)
      : [];

  return {
    id: node.id,

    name: node.name,

    type: node.type,

    width: node.width,

    height: node.height,

    rotation: node.rotation,

    opacity: node.opacity,

    locked: node.locked,

    children,
  };
}

export function createSemanticDocumentTree(
  document: EditorDocument,
): SemanticNode[] {
  const visitedNodeIds = new Set<NodeId>();

  return document.rootNodeIds
    .map((nodeId) => createSemanticNode(document, nodeId, visitedNodeIds))
    .filter((node): node is SemanticNode => node !== null);
}

function formatDimension(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function formatOpacity(opacity: number): string {
  return `${Math.round(opacity * 100)}%`;
}

export function getSemanticNodeDescription(node: SemanticNode): string {
  const parts = [
    node.type,
    `${formatDimension(node.width)} by ${formatDimension(node.height)}`,
  ];

  if (node.rotation !== 0) {
    parts.push(`${formatDimension(node.rotation)} degrees rotation`);
  }

  if (node.opacity !== 1) {
    parts.push(`${formatOpacity(node.opacity)} opacity`);
  }

  if (node.locked) {
    parts.push("locked");
  }

  return parts.join(", ");
}
