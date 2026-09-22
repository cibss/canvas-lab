import type { Point } from "@/editor/camera/types";
import type { EditorDocument } from "@/editor/document/types";

import { RENDER_INVALIDATION } from "./renderInvalidation";
import { getDirtyRenderLayers, type DirtyRenderLayers } from "./renderLayers";
import { createSpatialIndex, querySpatialIndexAtPoint } from "./spatialIndex";
import { createViewportRenderDocument } from "./viewportCulling";
import type { WorldBounds } from "./worldBounds";
import { shouldOffloadSpatialIndexBuild } from "./workerPolicy";

export interface PerformanceVerificationInput {
  document: EditorDocument;

  viewportBounds: WorldBounds;

  hitTestPoint: Point;
}

export interface PerformanceVerificationReport {
  totalNodeCount: number;

  viewportVisibleNodeCount: number;

  viewportCulledNodeCount: number;

  spatialIndexedNodeCount: number;

  spatialCandidateNodeCount: number;

  viewportWorkReduction: number;

  hitTestWorkReduction: number;

  workerRecommended: boolean;

  selectionDirtyLayers: DirtyRenderLayers;

  documentDirtyLayers: DirtyRenderLayers;
}

function countVisibleNodes(document: EditorDocument): number {
  let count = 0;

  for (const node of Object.values(document.nodes)) {
    if (node.visible) {
      count += 1;
    }
  }

  return count;
}

function getWorkReduction(totalWork: number, remainingWork: number): number {
  if (totalWork <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, 1 - remainingWork / totalWork));
}

export function runPerformanceVerification({
  document,
  viewportBounds,
  hitTestPoint,
}: PerformanceVerificationInput): PerformanceVerificationReport {
  const totalNodeCount = Object.keys(document.nodes).length;

  const viewportResult = createViewportRenderDocument(document, viewportBounds);

  const viewportVisibleNodeCount = countVisibleNodes(viewportResult.document);

  const spatialIndex = createSpatialIndex(document);

  const spatialCandidateNodeIds = querySpatialIndexAtPoint(
    spatialIndex,
    hitTestPoint,
  );

  return {
    totalNodeCount,

    viewportVisibleNodeCount,

    viewportCulledNodeCount: viewportResult.culledNodeIds.length,

    spatialIndexedNodeCount: spatialIndex.indexedNodeIds.length,

    spatialCandidateNodeCount: spatialCandidateNodeIds.length,

    viewportWorkReduction: getWorkReduction(
      totalNodeCount,
      viewportVisibleNodeCount,
    ),

    hitTestWorkReduction: getWorkReduction(
      totalNodeCount,
      spatialCandidateNodeIds.length,
    ),

    workerRecommended: shouldOffloadSpatialIndexBuild(document),

    selectionDirtyLayers: getDirtyRenderLayers(RENDER_INVALIDATION.selection),

    documentDirtyLayers: getDirtyRenderLayers(RENDER_INVALIDATION.document),
  };
}
