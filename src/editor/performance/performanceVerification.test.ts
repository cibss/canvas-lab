import { describe, expect, it } from "vitest";

import {
  createDefaultStressDocument,
  createStressDocument,
} from "./stressDocument";
import { runPerformanceVerification } from "./performanceVerification";

describe("performance stress harness", () => {
  it("creates a deterministic 10,000-node stress document", () => {
    const document = createDefaultStressDocument();

    expect(document.rootNodeIds).toHaveLength(10_000);

    expect(Object.keys(document.nodes)).toHaveLength(10_000);

    expect(document.nodes["stress-0-0"]).toBeDefined();

    expect(document.nodes["stress-99-99"]).toBeDefined();
  });

  it("places stress nodes on a predictable grid", () => {
    const document = createStressDocument({
      columns: 3,

      rows: 2,

      nodeWidth: 100,

      nodeHeight: 80,

      spacingX: 160,

      spacingY: 120,
    });

    expect(document.nodes["stress-0-0"].x).toBe(0);

    expect(document.nodes["stress-0-0"].y).toBe(0);

    expect(document.nodes["stress-2-1"].x).toBe(320);

    expect(document.nodes["stress-2-1"].y).toBe(120);
  });

  it("rejects invalid stress document dimensions", () => {
    expect(() =>
      createStressDocument({
        columns: 0,

        rows: 10,
      }),
    ).toThrow();

    expect(() =>
      createStressDocument({
        columns: 10,

        rows: -1,
      }),
    ).toThrow();
  });

  it("dramatically reduces render and hit-test work for a large sparse document", () => {
    const document = createStressDocument({
      columns: 50,

      rows: 50,

      nodeWidth: 100,

      nodeHeight: 80,

      spacingX: 160,

      spacingY: 120,
    });

    const report = runPerformanceVerification({
      document,

      viewportBounds: {
        minX: 0,

        minY: 0,

        maxX: 1000,

        maxY: 700,
      },

      hitTestPoint: {
        x: 50,

        y: 40,
      },
    });

    expect(report.totalNodeCount).toBe(2500);

    /*
     * 7 visible columns:
     * x = 0 ... 960
     *
     * 6 visible rows:
     * y = 0 ... 600
     *
     * 7 × 6 = 42
     */
    expect(report.viewportVisibleNodeCount).toBe(42);

    expect(report.viewportCulledNodeCount).toBe(2458);

    expect(report.spatialIndexedNodeCount).toBe(2500);

    expect(report.spatialCandidateNodeCount).toBe(1);

    expect(report.viewportWorkReduction).toBeGreaterThan(0.98);

    expect(report.hitTestWorkReduction).toBeGreaterThan(0.999);
  });

  it("activates the worker policy for the stress workload", () => {
    const document = createStressDocument({
      columns: 50,

      rows: 50,
    });

    const report = runPerformanceVerification({
      document,

      viewportBounds: {
        minX: 0,
        minY: 0,
        maxX: 800,
        maxY: 600,
      },

      hitTestPoint: {
        x: 50,
        y: 40,
      },
    });

    expect(report.workerRecommended).toBe(true);
  });

  it("keeps selection changes on the overlay layer only", () => {
    const document = createStressDocument({
      columns: 25,

      rows: 20,
    });

    const report = runPerformanceVerification({
      document,

      viewportBounds: {
        minX: 0,
        minY: 0,
        maxX: 800,
        maxY: 600,
      },

      hitTestPoint: {
        x: 50,
        y: 40,
      },
    });

    expect(report.selectionDirtyLayers).toEqual({
      document: false,

      overlay: true,
    });
  });

  it("redraws both layers when document pixels change", () => {
    const document = createStressDocument({
      columns: 25,

      rows: 20,
    });

    const report = runPerformanceVerification({
      document,

      viewportBounds: {
        minX: 0,
        minY: 0,
        maxX: 800,
        maxY: 600,
      },

      hitTestPoint: {
        x: 50,
        y: 40,
      },
    });

    expect(report.documentDirtyLayers).toEqual({
      document: true,

      overlay: true,
    });
  });

  it("does not mutate the source stress document during verification", () => {
    const document = createStressDocument({
      columns: 20,

      rows: 20,
    });

    runPerformanceVerification({
      document,

      viewportBounds: {
        minX: 0,
        minY: 0,
        maxX: 500,
        maxY: 500,
      },

      hitTestPoint: {
        x: 50,
        y: 40,
      },
    });

    expect(Object.values(document.nodes).every((node) => node.visible)).toBe(
      true,
    );
  });
});
