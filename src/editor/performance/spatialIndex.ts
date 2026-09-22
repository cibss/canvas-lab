import type { Point } from "@/editor/camera/types";
import type {
  EditorDocument,
  EditorNode,
  NodeId,
} from "@/editor/document/types";

import {
  doesWorldBoundsContainPoint,
  getNodeWorldBounds,
  type WorldBounds,
} from "./worldBounds";

export const DEFAULT_SPATIAL_INDEX_CELL_SIZE = 512;

export const DEFAULT_MAX_CELLS_PER_NODE = 64;

export interface SpatialIndexOptions {
  cellSize?: number;

  maxCellsPerNode?: number;
}

export interface SpatialIndex {
  cellSize: number;

  maxCellsPerNode: number;

  cells: Map<string, NodeId[]>;

  overflowNodeIds: NodeId[];

  boundsByNodeId: Map<NodeId, WorldBounds | null>;

  indexedNodeIds: NodeId[];
}

interface SpatialCellRange {
  minX: number;

  minY: number;

  maxX: number;

  maxY: number;
}

function getCellCoordinate(value: number, cellSize: number): number {
  return Math.floor(value / cellSize);
}

function getCellKey(x: number, y: number): string {
  return `${x}:${y}`;
}

function getCellRange(bounds: WorldBounds, cellSize: number): SpatialCellRange {
  return {
    minX: getCellCoordinate(bounds.minX, cellSize),

    minY: getCellCoordinate(bounds.minY, cellSize),

    maxX: getCellCoordinate(bounds.maxX, cellSize),

    maxY: getCellCoordinate(bounds.maxY, cellSize),
  };
}

function getCellCount(range: SpatialCellRange): number {
  const width = range.maxX - range.minX + 1;

  const height = range.maxY - range.minY + 1;

  return width * height;
}

function addNodeToCell(
  index: SpatialIndex,
  cellX: number,
  cellY: number,
  nodeId: NodeId,
): void {
  const key = getCellKey(cellX, cellY);

  const current = index.cells.get(key);

  if (current) {
    current.push(nodeId);

    return;
  }

  index.cells.set(key, [nodeId]);
}

function addNodeToIndex(
  index: SpatialIndex,
  nodeId: NodeId,
  bounds: WorldBounds | null,
): void {
  index.indexedNodeIds.push(nodeId);

  index.boundsByNodeId.set(nodeId, bounds);

  /*
   * Missing geometry is kept in
   * the overflow bucket.
   *
   * Broad-phase optimization should
   * stay conservative: we prefer an
   * extra precise hit-test over a
   * false negative.
   */
  if (!bounds) {
    index.overflowNodeIds.push(nodeId);

    return;
  }

  const cellRange = getCellRange(bounds, index.cellSize);

  const cellCount = getCellCount(cellRange);

  /*
   * Very large objects may span
   * hundreds or thousands of cells.
   *
   * Duplicating their ID into every
   * cell would waste memory, so they
   * live in a small overflow list
   * instead.
   */
  if (cellCount > index.maxCellsPerNode) {
    index.overflowNodeIds.push(nodeId);

    return;
  }

  for (let cellY = cellRange.minY; cellY <= cellRange.maxY; cellY += 1) {
    for (let cellX = cellRange.minX; cellX <= cellRange.maxX; cellX += 1) {
      addNodeToCell(index, cellX, cellY, nodeId);
    }
  }
}

function normalizePositiveNumber(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number.`);
  }

  return value;
}

function normalizePositiveInteger(value: number, name: string): number {
  const normalized = normalizePositiveNumber(value, name);

  return Math.max(1, Math.floor(normalized));
}

export function createSpatialIndex(
  document: EditorDocument,
  options: SpatialIndexOptions = {},
): SpatialIndex {
  const cellSize = normalizePositiveNumber(
    options.cellSize ?? DEFAULT_SPATIAL_INDEX_CELL_SIZE,

    "Spatial index cell size",
  );

  const maxCellsPerNode = normalizePositiveInteger(
    options.maxCellsPerNode ?? DEFAULT_MAX_CELLS_PER_NODE,

    "Spatial index max cells per node",
  );

  const index: SpatialIndex = {
    cellSize,

    maxCellsPerNode,

    cells: new Map(),

    overflowNodeIds: [],

    boundsByNodeId: new Map(),

    indexedNodeIds: [],
  };

  const visitedNodeIds = new Set<NodeId>();

  const visitNode = (nodeId: NodeId) => {
    if (visitedNodeIds.has(nodeId)) {
      return;
    }

    visitedNodeIds.add(nodeId);

    const node: EditorNode | undefined = document.nodes[nodeId];

    if (!node || !node.visible) {
      return;
    }

    addNodeToIndex(index, nodeId, getNodeWorldBounds(document, nodeId));

    if (node.type !== "frame") {
      return;
    }

    for (const childId of node.childIds) {
      visitNode(childId);
    }
  };

  for (const rootNodeId of document.rootNodeIds) {
    visitNode(rootNodeId);
  }

  return index;
}

export function querySpatialIndexAtPoint(
  index: SpatialIndex,
  point: Point,
): NodeId[] {
  const cellX = getCellCoordinate(point.x, index.cellSize);

  const cellY = getCellCoordinate(point.y, index.cellSize);

  const bucket = index.cells.get(getCellKey(cellX, cellY)) ?? [];

  const possibleNodeIds = [...bucket, ...index.overflowNodeIds];

  const seenNodeIds = new Set<NodeId>();

  const result: NodeId[] = [];

  for (const nodeId of possibleNodeIds) {
    if (seenNodeIds.has(nodeId)) {
      continue;
    }

    seenNodeIds.add(nodeId);

    const bounds = index.boundsByNodeId.get(nodeId);

    /*
     * Unresolved bounds are intentionally
     * considered candidates.
     *
     * The precise hit-test remains the
     * final authority.
     */
    if (!bounds || doesWorldBoundsContainPoint(bounds, point)) {
      result.push(nodeId);
    }
  }

  return result;
}

function collectTraversalNodeIds(
  document: EditorDocument,
  candidateNodeIds: readonly NodeId[],
): Set<NodeId> {
  const traversalNodeIds = new Set<NodeId>();

  for (const candidateNodeId of candidateNodeIds) {
    let currentNodeId: NodeId | null = candidateNodeId;

    const visitedAncestors = new Set<NodeId>();

    while (currentNodeId !== null && !visitedAncestors.has(currentNodeId)) {
      visitedAncestors.add(currentNodeId);

      const node: EditorNode | undefined = document.nodes[currentNodeId];

      if (!node) {
        break;
      }

      traversalNodeIds.add(currentNodeId);

      currentNodeId = node.parentId;
    }
  }

  return traversalNodeIds;
}

export function createSpatialHitTestDocument(
  document: EditorDocument,
  candidateNodeIds: readonly NodeId[],
): EditorDocument {
  const traversalNodeIds = collectTraversalNodeIds(document, candidateNodeIds);

  const nodes: Record<NodeId, EditorNode> = {};

  for (const nodeId of traversalNodeIds) {
    const node: EditorNode | undefined = document.nodes[nodeId];

    if (!node) {
      continue;
    }

    if (node.type === "frame") {
      nodes[nodeId] = {
        ...node,

        childIds: node.childIds.filter((childId) =>
          traversalNodeIds.has(childId),
        ),
      };

      continue;
    }

    nodes[nodeId] = node;
  }

  return {
    ...document,

    rootNodeIds: document.rootNodeIds.filter((nodeId) =>
      traversalNodeIds.has(nodeId),
    ),

    nodes,
  };
}
