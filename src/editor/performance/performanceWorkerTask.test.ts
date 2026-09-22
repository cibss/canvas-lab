import { describe, expect, it } from "vitest";

import { sampleDocument } from "@/editor/document/sampleDocument";

import type { PerformanceWorkerRequest } from "./performanceWorkerProtocol";
import { executePerformanceWorkerRequest } from "./performanceWorkerTask";

describe("performance worker task", () => {
  it("builds a spatial index", () => {
    const request: PerformanceWorkerRequest = {
      type: "build-spatial-index",

      requestId: 17,

      document: sampleDocument,
    };

    const response = executePerformanceWorkerRequest(request);

    expect(response.type).toBe("spatial-index-built");

    expect(response.requestId).toBe(17);

    if (response.type !== "spatial-index-built") {
      return;
    }

    expect(response.index.indexedNodeIds).toContain("frame-main");

    expect(response.index.indexedNodeIds).toContain("text-title");
  });

  it("preserves spatial index options", () => {
    const response = executePerformanceWorkerRequest({
      type: "build-spatial-index",

      requestId: 20,

      document: sampleDocument,

      options: {
        cellSize: 128,

        maxCellsPerNode: 8,
      },
    });

    expect(response.type).toBe("spatial-index-built");

    if (response.type !== "spatial-index-built") {
      return;
    }

    expect(response.index.cellSize).toBe(128);

    expect(response.index.maxCellsPerNode).toBe(8);
  });

  it("returns a serializable worker response", () => {
    const response = executePerformanceWorkerRequest({
      type: "build-spatial-index",

      requestId: 21,

      document: sampleDocument,
    });

    expect(() => structuredClone(response)).not.toThrow();
  });

  it("returns an error response when computation fails", () => {
    const response = executePerformanceWorkerRequest({
      type: "build-spatial-index",

      requestId: 22,

      document: sampleDocument,

      options: {
        cellSize: 0,
      },
    });

    expect(response.type).toBe("performance-worker-error");

    expect(response.requestId).toBe(22);

    if (response.type !== "performance-worker-error") {
      return;
    }

    expect(response.message.length).toBeGreaterThan(0);
  });
});
