import type { EditorDocument } from "@/editor/document/types";

import type { SpatialIndex, SpatialIndexOptions } from "./spatialIndex";

export interface BuildSpatialIndexWorkerRequest {
  type: "build-spatial-index";

  requestId: number;

  document: EditorDocument;

  options?: SpatialIndexOptions;
}

export type PerformanceWorkerRequest = BuildSpatialIndexWorkerRequest;

export interface SpatialIndexBuiltWorkerResponse {
  type: "spatial-index-built";

  requestId: number;

  index: SpatialIndex;
}

export interface PerformanceWorkerErrorResponse {
  type: "performance-worker-error";

  requestId: number;

  message: string;
}

export type PerformanceWorkerResponse =
  | SpatialIndexBuiltWorkerResponse
  | PerformanceWorkerErrorResponse;
