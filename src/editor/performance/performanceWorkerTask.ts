import { createSpatialIndex } from "./spatialIndex";
import type {
  PerformanceWorkerRequest,
  PerformanceWorkerResponse,
} from "./performanceWorkerProtocol";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function executePerformanceWorkerRequest(
  request: PerformanceWorkerRequest,
): PerformanceWorkerResponse {
  switch (request.type) {
    case "build-spatial-index": {
      try {
        const index = createSpatialIndex(request.document, request.options);

        return {
          type: "spatial-index-built",

          requestId: request.requestId,

          index,
        };
      } catch (error) {
        return {
          type: "performance-worker-error",

          requestId: request.requestId,

          message: getErrorMessage(error),
        };
      }
    }
  }
}
