import type { EditorDocument } from "@/editor/document/types";

export const DEFAULT_SPATIAL_INDEX_WORKER_NODE_THRESHOLD = 500;

export function getDocumentNodeCount(document: EditorDocument): number {
  return Object.keys(document.nodes).length;
}

function normalizeWorkerThreshold(threshold: number): number {
  if (!Number.isFinite(threshold) || threshold <= 0) {
    throw new Error("Worker threshold must be a positive finite number.");
  }

  return Math.max(1, Math.floor(threshold));
}

export function shouldOffloadSpatialIndexBuild(
  document: EditorDocument,
  threshold = DEFAULT_SPATIAL_INDEX_WORKER_NODE_THRESHOLD,
): boolean {
  const normalizedThreshold = normalizeWorkerThreshold(threshold);

  return getDocumentNodeCount(document) >= normalizedThreshold;
}
