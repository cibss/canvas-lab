import type { Point } from "@/editor/camera/types";

import type { EditorDocument, NodeId, TextNode } from "./types";

export const DEFAULT_TEXT_WIDTH = 320;
export const DEFAULT_TEXT_HEIGHT = 48;
export const DEFAULT_TEXT_FONT_SIZE = 32;
export const DEFAULT_TEXT_LINE_HEIGHT = 1.25;

export function createTextNodeId(document: EditorDocument): NodeId {
  let index = 1;

  while (document.nodes[`text-${index}`]) {
    index += 1;
  }

  return `text-${index}`;
}

function createTextName(document: EditorDocument): string {
  const existingNames = new Set(
    Object.values(document.nodes)
      .filter((node) => node.type === "text")
      .map((node) => node.name),
  );

  let index = 1;

  while (existingNames.has(`Text ${index}`)) {
    index += 1;
  }

  return `Text ${index}`;
}

export function insertRootText(
  document: EditorDocument,
  nodeId: NodeId,
  point: Point,
): EditorDocument {
  if (document.nodes[nodeId]) {
    return document;
  }

  const node: TextNode = {
    id: nodeId,
    type: "text",

    name: createTextName(document),

    parentId: null,

    x: point.x,
    y: point.y,

    width: DEFAULT_TEXT_WIDTH,

    height: DEFAULT_TEXT_HEIGHT,

    rotation: 0,
    opacity: 1,

    visible: true,
    locked: false,

    content: "",

    fontFamily: "Arial",

    fontSize: DEFAULT_TEXT_FONT_SIZE,

    fontWeight: 500,

    textAlign: "left",

    fill: {
      type: "solid",
      color: "#18181b",
    },
  };

  return {
    ...document,

    rootNodeIds: [...document.rootNodeIds, nodeId],

    nodes: {
      ...document.nodes,

      [nodeId]: node,
    },
  };
}

function getTextHeight(node: TextNode, content: string): number {
  const lineCount = Math.max(1, content.split("\n").length);

  return Math.max(
    node.height,
    lineCount * node.fontSize * DEFAULT_TEXT_LINE_HEIGHT,
  );
}

export function updateTextNodeContent(
  document: EditorDocument,
  nodeId: NodeId,
  content: string,
): EditorDocument {
  const node = document.nodes[nodeId];

  if (!node || node.type !== "text" || node.locked) {
    return document;
  }

  if (node.content === content) {
    return document;
  }

  return {
    ...document,

    nodes: {
      ...document.nodes,

      [nodeId]: {
        ...node,

        content,

        height: getTextHeight(node, content),
      },
    },
  };
}
