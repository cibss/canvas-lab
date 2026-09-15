import { describe, expect, it } from "vitest";

import { moveNodeBy } from "./documentOperations";
import { sampleDocument } from "./sampleDocument";

describe("moveNodeBy", () => {
  it("moves a node by the provided delta", () => {
    const result = moveNodeBy(sampleDocument, "rectangle-hero", {
      x: 25,
      y: -10,
    });

    expect(result.nodes["rectangle-hero"].x).toBe(89);

    expect(result.nodes["rectangle-hero"].y).toBe(54);
  });

  it("does not mutate the original document", () => {
    moveNodeBy(sampleDocument, "rectangle-hero", {
      x: 100,
      y: 100,
    });

    expect(sampleDocument.nodes["rectangle-hero"].x).toBe(64);

    expect(sampleDocument.nodes["rectangle-hero"].y).toBe(64);
  });

  it("keeps sibling nodes unchanged", () => {
    const result = moveNodeBy(sampleDocument, "rectangle-hero", {
      x: 50,
      y: 50,
    });

    expect(result.nodes["text-title"]).toBe(sampleDocument.nodes["text-title"]);
  });

  it("returns the same document for an unknown node", () => {
    const result = moveNodeBy(sampleDocument, "missing-node", {
      x: 50,
      y: 50,
    });

    expect(result).toBe(sampleDocument);
  });

  it("returns the same document for zero movement", () => {
    const result = moveNodeBy(sampleDocument, "rectangle-hero", {
      x: 0,
      y: 0,
    });

    expect(result).toBe(sampleDocument);
  });
});
