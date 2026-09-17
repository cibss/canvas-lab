import { describe, expect, it } from "vitest";

import { sampleDocument } from "./sampleDocument";
import {
  normalizeNodeName,
  setNodeLocked,
  setNodeVisibility,
  updateNodeName,
} from "./nodeMetadata";

describe("node metadata", () => {
  it("normalizes node names", () => {
    expect(normalizeNodeName("  Hero Card  ")).toBe("Hero Card");

    expect(normalizeNodeName("   ")).toBeNull();
  });

  it("renames a node immutably", () => {
    const result = updateNodeName(
      sampleDocument,
      "rectangle-hero",
      "Hero Card",
    );

    expect(result).not.toBe(sampleDocument);

    expect(result.nodes["rectangle-hero"].name).toBe("Hero Card");

    expect(sampleDocument.nodes["rectangle-hero"].name).not.toBe("Hero Card");
  });

  it("trims a renamed node", () => {
    const result = updateNodeName(
      sampleDocument,
      "rectangle-hero",
      "  Hero Card  ",
    );

    expect(result.nodes["rectangle-hero"].name).toBe("Hero Card");
  });

  it("ignores an empty node name", () => {
    const result = updateNodeName(sampleDocument, "rectangle-hero", "   ");

    expect(result).toBe(sampleDocument);
  });

  it("updates visibility immutably", () => {
    const result = setNodeVisibility(sampleDocument, "rectangle-hero", false);

    expect(result.nodes["rectangle-hero"].visible).toBe(false);

    expect(sampleDocument.nodes["rectangle-hero"].visible).toBe(true);
  });

  it("returns the same document when visibility did not change", () => {
    const result = setNodeVisibility(sampleDocument, "rectangle-hero", true);

    expect(result).toBe(sampleDocument);
  });

  it("updates the locked state immutably", () => {
    const result = setNodeLocked(sampleDocument, "rectangle-hero", true);

    expect(result.nodes["rectangle-hero"].locked).toBe(true);

    expect(sampleDocument.nodes["rectangle-hero"].locked).toBe(false);
  });

  it("allows metadata changes to an already locked node", () => {
    const lockedDocument = setNodeLocked(
      sampleDocument,
      "rectangle-hero",
      true,
    );

    const renamed = updateNodeName(
      lockedDocument,
      "rectangle-hero",
      "Locked Hero",
    );

    const hidden = setNodeVisibility(renamed, "rectangle-hero", false);

    expect(hidden.nodes["rectangle-hero"].name).toBe("Locked Hero");

    expect(hidden.nodes["rectangle-hero"].visible).toBe(false);
  });

  it("ignores unknown node ids", () => {
    expect(setNodeLocked(sampleDocument, "missing-node", true)).toBe(
      sampleDocument,
    );

    expect(setNodeVisibility(sampleDocument, "missing-node", false)).toBe(
      sampleDocument,
    );

    expect(updateNodeName(sampleDocument, "missing-node", "Missing")).toBe(
      sampleDocument,
    );
  });
});
