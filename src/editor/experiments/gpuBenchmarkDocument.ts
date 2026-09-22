import type {
  EditorDocument,
  NodeId,
  RectangleNode,
} from "@/editor/document/types";

export interface GpuBenchmarkDocumentOptions {
  columns: number;

  rows: number;

  nodeSize?: number;

  spacing?: number;
}

function normalizePositiveInteger(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number.`);
  }

  return Math.max(1, Math.floor(value));
}

export function createGpuBenchmarkDocument({
  columns,
  rows,
  nodeSize = 10,
  spacing = 12,
}: GpuBenchmarkDocumentOptions): EditorDocument {
  const normalizedColumns = normalizePositiveInteger(
    columns,
    "Benchmark columns",
  );

  const normalizedRows = normalizePositiveInteger(rows, "Benchmark rows");

  const normalizedNodeSize = normalizePositiveInteger(
    nodeSize,
    "Benchmark node size",
  );

  const normalizedSpacing = normalizePositiveInteger(
    spacing,
    "Benchmark spacing",
  );

  const rootNodeIds: NodeId[] = [];

  const nodes: EditorDocument["nodes"] = {};

  for (let row = 0; row < normalizedRows; row += 1) {
    for (let column = 0; column < normalizedColumns; column += 1) {
      const id = `gpu-benchmark-${column}-${row}`;

      const node: RectangleNode = {
        id,

        type: "rectangle",

        name: id,

        parentId: null,

        x: column * normalizedSpacing,

        y: row * normalizedSpacing,

        width: normalizedNodeSize,

        height: normalizedNodeSize,

        rotation: 0,

        opacity: 1,

        visible: true,

        locked: false,

        fill: {
          type: "solid",

          color: "#60a5fa",
        },

        cornerRadius: 0,
      };

      rootNodeIds.push(id);

      nodes[id] = node;
    }
  }

  return {
    schemaVersion: 1,

    id: `gpu-benchmark-${normalizedColumns}x${normalizedRows}`,

    name: `GPU Benchmark ${normalizedColumns} × ${normalizedRows}`,

    rootNodeIds,

    nodes,
  };
}
