import { describe, expect, it } from "vitest";

import { getNodeWorldBounds, getNodeWorldPosition } from "./nodeGeometry";
import { sampleDocument } from "./sampleDocument";

describe("node geometry", () => {
  it("returns the world position of a root node", () => {
    expect(getNodeWorldPosition(sampleDocument, "frame-main")).toEqual({
      x: 120,
      y: 80,
    });
  });

  it("includes parent position for child nodes", () => {
    expect(getNodeWorldPosition(sampleDocument, "text-title")).toEqual({
      x: 232,
      y: 232,
    });
  });

  it("returns the world bounds of a node", () => {
    expect(getNodeWorldBounds(sampleDocument, "text-title")).toEqual({
      x: 232,
      y: 232,
      width: 560,
      height: 72,
    });
  });

  it("returns null for an unknown node", () => {
    expect(getNodeWorldBounds(sampleDocument, "missing-node")).toBeNull();
  });
});
