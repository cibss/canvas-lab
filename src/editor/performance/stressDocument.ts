import type {
  EditorDocument,
  NodeId,
  RectangleNode,
} from "@/editor/document/types";

export interface StressDocumentOptions {
  columns: number;

  rows: number;

  nodeWidth?: number;

  nodeHeight?: number;

  spacingX?: number;

  spacingY?: number;
}

const DEFAULT_NODE_WIDTH = 100;

const DEFAULT_NODE_HEIGHT = 80;

const DEFAULT_SPACING_X = 160;

const DEFAULT_SPACING_Y = 120;

function normalizePositiveInteger(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number.`);
  }

  return Math.max(1, Math.floor(value));
}

function normalizePositiveNumber(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number.`);
  }

  return value;
}

function createStressNodeId(column: number, row: number): NodeId {
  return `stress-${column}-${row}`;
}

function createStressRectangle(
  id: NodeId,
  x: number,
  y: number,
  width: number,
  height: number,
): RectangleNode {
  return {
    id,

    type: "rectangle",

    name: id,

    parentId: null,

    x,

    y,

    width,

    height,

    rotation: 0,

    opacity: 1,

    visible: true,

    locked: false,

    fill: {
      type: "solid",

      color: "#60a5fa",
    },

    cornerRadius: 8,
  };
}

export function createStressDocument({
  columns,
  rows,
  nodeWidth = DEFAULT_NODE_WIDTH,
  nodeHeight = DEFAULT_NODE_HEIGHT,
  spacingX = DEFAULT_SPACING_X,
  spacingY = DEFAULT_SPACING_Y,
}: StressDocumentOptions): EditorDocument {
  const normalizedColumns = normalizePositiveInteger(
    columns,
    "Stress document columns",
  );

  const normalizedRows = normalizePositiveInteger(rows, "Stress document rows");

  const normalizedNodeWidth = normalizePositiveNumber(
    nodeWidth,
    "Stress node width",
  );

  const normalizedNodeHeight = normalizePositiveNumber(
    nodeHeight,
    "Stress node height",
  );

  const normalizedSpacingX = normalizePositiveNumber(
    spacingX,
    "Stress horizontal spacing",
  );

  const normalizedSpacingY = normalizePositiveNumber(
    spacingY,
    "Stress vertical spacing",
  );

  const rootNodeIds: NodeId[] = [];

  const nodes: EditorDocument["nodes"] = {};

  for (let row = 0; row < normalizedRows; row += 1) {
    for (let column = 0; column < normalizedColumns; column += 1) {
      const nodeId = createStressNodeId(column, row);

      rootNodeIds.push(nodeId);

      nodes[nodeId] = createStressRectangle(
        nodeId,

        column * normalizedSpacingX,

        row * normalizedSpacingY,

        normalizedNodeWidth,

        normalizedNodeHeight,
      );
    }
  }

  return {
    schemaVersion: 1,

    id: `stress-${normalizedColumns}x${normalizedRows}`,

    name: `Stress ${normalizedColumns} × ${normalizedRows}`,

    rootNodeIds,

    nodes,
  };
}

export function createDefaultStressDocument(): EditorDocument {
  return createStressDocument({
    columns: 100,

    rows: 100,
  });
}
