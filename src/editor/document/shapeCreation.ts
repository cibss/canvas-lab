import type { Bounds, Point } from "@/editor/camera/types";
import type {
  EditorDocument,
  EditorNode,
  NodeId,
} from "@/editor/document/types";
import {
  getEditorToolDefinition,
  type ShapeEditorTool,
} from "@/editor/tools/editorTool";

export interface ShapeCreationBoundsOptions {
  constrainSquare?: boolean;

  fromCenter?: boolean;
}

function normalizeBounds(bounds: Bounds): Bounds {
  const endX = bounds.x + bounds.width;

  const endY = bounds.y + bounds.height;

  return {
    x: Math.min(bounds.x, endX),

    y: Math.min(bounds.y, endY),

    width: Math.abs(bounds.width),

    height: Math.abs(bounds.height),
  };
}

function getDirection(value: number): number {
  return value < 0 ? -1 : 1;
}

export function getShapeCreationBounds(
  start: Point,
  current: Point,
  options: ShapeCreationBoundsOptions = {},
): Bounds {
  let deltaX = current.x - start.x;

  let deltaY = current.y - start.y;

  if (options.constrainSquare) {
    const size = Math.max(Math.abs(deltaX), Math.abs(deltaY));

    deltaX = getDirection(deltaX) * size;

    deltaY = getDirection(deltaY) * size;
  }

  if (options.fromCenter) {
    return {
      x: start.x - Math.abs(deltaX),

      y: start.y - Math.abs(deltaY),

      width: Math.abs(deltaX) * 2,

      height: Math.abs(deltaY) * 2,
    };
  }

  return normalizeBounds({
    x: start.x,
    y: start.y,

    width: deltaX,

    height: deltaY,
  });
}

export function createShapeNodeId(
  document: EditorDocument,

  tool: ShapeEditorTool,
): NodeId {
  let index = 1;

  while (document.nodes[`${tool}-${index}`]) {
    index += 1;
  }

  return `${tool}-${index}`;
}

function createShapeName(
  document: EditorDocument,

  tool: ShapeEditorTool,
): string {
  const label = getEditorToolDefinition(tool).label;

  const existingNames = new Set(
    Object.values(document.nodes)
      .filter((node) => node.type === tool)
      .map((node) => node.name),
  );

  let index = 1;

  while (existingNames.has(`${label} ${index}`)) {
    index += 1;
  }

  return `${label} ${index}`;
}

function createShapeNode(
  document: EditorDocument,

  tool: ShapeEditorTool,

  nodeId: NodeId,

  bounds: Bounds,
): EditorNode {
  const normalizedBounds = normalizeBounds(bounds);

  const common = {
    id: nodeId,

    name: createShapeName(document, tool),

    parentId: null,

    x: normalizedBounds.x,

    y: normalizedBounds.y,

    width: normalizedBounds.width,

    height: normalizedBounds.height,

    rotation: 0,

    opacity: 1,

    visible: true,

    locked: false,
  };

  switch (tool) {
    case "rectangle":
      return {
        ...common,

        type: "rectangle",

        fill: {
          type: "solid",
          color: "#60a5fa",
        },

        cornerRadius: 8,
      };

    case "ellipse":
      return {
        ...common,

        type: "ellipse",

        fill: {
          type: "solid",
          color: "#a78bfa",
        },
      };

    case "frame":
      return {
        ...common,

        type: "frame",

        childIds: [],

        fill: {
          type: "solid",
          color: "#ffffff",
        },

        clipContent: true,
      };
  }
}

export function insertRootShape(
  document: EditorDocument,

  tool: ShapeEditorTool,

  nodeId: NodeId,

  bounds: Bounds,
): EditorDocument {
  if (document.nodes[nodeId]) {
    return document;
  }

  const node = createShapeNode(document, tool, nodeId, bounds);

  return {
    ...document,

    rootNodeIds: [...document.rootNodeIds, nodeId],

    nodes: {
      ...document.nodes,

      [nodeId]: node,
    },
  };
}
