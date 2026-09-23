import type {
  EditorDocument,
  EditorNode,
  EllipseNode,
  NodeId,
  RectangleNode,
} from "./types";

export type FillEditableNode = RectangleNode | EllipseNode;

export function canEditNodeFill(node: EditorNode): node is FillEditableNode {
  return node.type === "rectangle" || node.type === "ellipse";
}

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  const withoutHash = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;

  if (/^[0-9a-f]{3}$/i.test(withoutHash)) {
    const expanded = withoutHash
      .split("")
      .map((character) => `${character}${character}`)
      .join("");

    return `#${expanded.toLowerCase()}`;
  }

  if (!/^[0-9a-f]{6}$/i.test(withoutHash)) {
    return null;
  }

  return `#${withoutHash.toLowerCase()}`;
}

export function getNodeFillColor(node: EditorNode): string | null {
  if (!canEditNodeFill(node)) {
    return null;
  }

  return node.fill?.color ?? null;
}

export function updateNodeFillColor(
  document: EditorDocument,
  nodeId: NodeId,
  color: string,
): EditorDocument {
  const node = document.nodes[nodeId];

  if (!node || node.locked || !canEditNodeFill(node)) {
    return document;
  }

  const normalizedColor = normalizeHexColor(color);

  if (!normalizedColor) {
    return document;
  }

  if (node.fill?.color.toLowerCase() === normalizedColor) {
    return document;
  }

  return {
    ...document,

    nodes: {
      ...document.nodes,

      [nodeId]: {
        ...node,

        fill: {
          type: "solid",
          color: normalizedColor,
        },
      },
    },
  };
}
