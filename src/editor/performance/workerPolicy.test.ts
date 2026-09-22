import { describe, expect, it } from "vitest";

import { sampleDocument } from "@/editor/document/sampleDocument";

import {
  getDocumentNodeCount,
  shouldOffloadSpatialIndexBuild,
} from "./workerPolicy";

describe("worker policy", () => {
  it("counts document nodes", () => {
    expect(getDocumentNodeCount(sampleDocument)).toBe(
      Object.keys(sampleDocument.nodes).length,
    );
  });

  it("keeps small workloads on the main thread", () => {
    const nodeCount = getDocumentNodeCount(sampleDocument);

    expect(shouldOffloadSpatialIndexBuild(sampleDocument, nodeCount + 1)).toBe(
      false,
    );
  });

  it("offloads workloads that reach the threshold", () => {
    const nodeCount = getDocumentNodeCount(sampleDocument);

    expect(shouldOffloadSpatialIndexBuild(sampleDocument, nodeCount)).toBe(
      true,
    );
  });

  it("normalizes fractional thresholds", () => {
    const nodeCount = getDocumentNodeCount(sampleDocument);

    expect(
      shouldOffloadSpatialIndexBuild(sampleDocument, nodeCount + 0.9),
    ).toBe(true);
  });

  it("rejects invalid thresholds", () => {
    expect(() => shouldOffloadSpatialIndexBuild(sampleDocument, 0)).toThrow();

    expect(() =>
      shouldOffloadSpatialIndexBuild(sampleDocument, Number.NaN),
    ).toThrow();
  });
});
