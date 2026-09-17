import type { EditorDocument, NodeId } from "./types";

export function normalizeNodeName(name: string): string | null {
  const normalized = name.trim();

  return normalized.length > 0 ? normalized : null;
}

export function updateNodeName(
  document: EditorDocument,
  nodeId: NodeId,
  name: string,
): EditorDocument {
  const node = document.nodes[nodeId];

  if (!node) {
    return document;
  }

  const normalizedName = normalizeNodeName(name);

  if (normalizedName === null || normalizedName === node.name) {
    return document;
  }

  return {
    ...document,

    nodes: {
      ...document.nodes,

      [nodeId]: {
        ...node,

        name: normalizedName,
      },
    },
  };
}

export function setNodeVisibility(
  document: EditorDocument,
  nodeId: NodeId,
  visible: boolean,
): EditorDocument {
  const node = document.nodes[nodeId];

  if (!node || node.visible === visible) {
    return document;
  }

  return {
    ...document,

    nodes: {
      ...document.nodes,

      [nodeId]: {
        ...node,

        visible,
      },
    },
  };
}

export function setNodeLocked(
  document: EditorDocument,
  nodeId: NodeId,
  locked: boolean,
): EditorDocument {
  const node = document.nodes[nodeId];

  if (!node || node.locked === locked) {
    return document;
  }

  return {
    ...document,

    nodes: {
      ...document.nodes,

      [nodeId]: {
        ...node,

        locked,
      },
    },
  };
}
