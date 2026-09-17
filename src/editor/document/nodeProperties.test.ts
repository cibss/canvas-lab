import { describe, expect, it } from "vitest";

import { sampleDocument } from "./sampleDocument";
import {
  MIN_NODE_DIMENSION,
  normalizeNodePropertyValue,
  updateNodeProperty,
} from "./nodeProperties";

describe("node properties", () => {
  it("updates a node property immutably", () => {
    const result = updateNodeProperty(sampleDocument, "text-title", "x", 200);

    expect(result).not.toBe(sampleDocument);

    expect(result.nodes["text-title"].x).toBe(200);

    expect(sampleDocument.nodes["text-title"].x).toBe(112);
  });

  it("returns the same document when the value did not change", () => {
    const node = sampleDocument.nodes["text-title"];

    const result = updateNodeProperty(sampleDocument, node.id, "x", node.x);

    expect(result).toBe(sampleDocument);
  });

  it("clamps width and height to the minimum dimension", () => {
    expect(normalizeNodePropertyValue("width", -100)).toBe(MIN_NODE_DIMENSION);

    expect(normalizeNodePropertyValue("height", 0)).toBe(MIN_NODE_DIMENSION);
  });

  it("normalizes rotation into 0 to 359 degrees", () => {
    expect(normalizeNodePropertyValue("rotation", 450)).toBe(90);

    expect(normalizeNodePropertyValue("rotation", -45)).toBe(315);

    expect(normalizeNodePropertyValue("rotation", 360)).toBe(0);
  });

  it("clamps opacity", () => {
    expect(normalizeNodePropertyValue("opacity", 1.5)).toBe(1);

    expect(normalizeNodePropertyValue("opacity", -0.5)).toBe(0);

    expect(normalizeNodePropertyValue("opacity", 0.45)).toBe(0.45);
  });

  it("does not update locked nodes", () => {
    const document = {
      ...sampleDocument,

      nodes: {
        ...sampleDocument.nodes,

        "text-title": {
          ...sampleDocument.nodes["text-title"],

          locked: true,
        },
      },
    };

    const result = updateNodeProperty(document, "text-title", "x", 999);

    expect(result).toBe(document);
  });

  it("ignores non-finite values", () => {
    expect(
      updateNodeProperty(sampleDocument, "text-title", "x", Number.NaN),
    ).toBe(sampleDocument);

    expect(
      updateNodeProperty(
        sampleDocument,
        "text-title",
        "x",
        Number.POSITIVE_INFINITY,
      ),
    ).toBe(sampleDocument);
  });
});
