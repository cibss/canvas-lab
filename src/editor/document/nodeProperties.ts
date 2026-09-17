import type {
  EditorDocument,
  NodeId,
} from "./types";

export type EditableNodeProperty =
  | "x"
  | "y"
  | "width"
  | "height"
  | "rotation"
  | "opacity";

export const MIN_NODE_DIMENSION = 1;

function normalizeRotation(
  value: number,
): number {
  return (
    ((value % 360) + 360) %
    360
  );
}

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(
    max,
    Math.max(
      min,
      value,
    ),
  );
}

export function normalizeNodePropertyValue(
  property:
    EditableNodeProperty,
  value: number,
): number {
  switch (property) {
    case "width":
    case "height":
      return Math.max(
        MIN_NODE_DIMENSION,
        value,
      );

    case "rotation":
      return normalizeRotation(
        value,
      );

    case "opacity":
      return clamp(
        value,
        0,
        1,
      );

    case "x":
    case "y":
      return value;
  }
}

export function updateNodeProperty(
  document:
    EditorDocument,
  nodeId:
    NodeId,
  property:
    EditableNodeProperty,
  value: number,
): EditorDocument {
  if (
    !Number.isFinite(value)
  ) {
    return document;
  }

  const node =
    document.nodes[nodeId];

  if (
    !node ||
    node.locked
  ) {
    return document;
  }

  const normalizedValue =
    normalizeNodePropertyValue(
      property,
      value,
    );

  if (
    node[property] ===
    normalizedValue
  ) {
    return document;
  }

  return {
    ...document,

    nodes: {
      ...document.nodes,

      [nodeId]: {
        ...node,

        [property]:
          normalizedValue,
      },
    },
  };
}