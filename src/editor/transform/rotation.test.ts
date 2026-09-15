import { describe, expect, it } from "vitest";

import { sampleDocument } from "@/editor/document/sampleDocument";

import {
  getPointerAngleDegrees,
  getShortestAngleDelta,
  normalizeRotation,
  rotateNodeTo,
} from "./rotation";

describe("rotation", () => {
  it("calculates pointer angle around a center", () => {
    expect(
      getPointerAngleDegrees(
        {
          x: 100,
          y: 100,
        },
        {
          x: 200,
          y: 100,
        },
      ),
    ).toBeCloseTo(0);

    expect(
      getPointerAngleDegrees(
        {
          x: 100,
          y: 100,
        },
        {
          x: 100,
          y: 200,
        },
      ),
    ).toBeCloseTo(90);
  });

  it("calculates the shortest angle across the wrap boundary", () => {
    expect(getShortestAngleDelta(179, -179)).toBeCloseTo(2);
  });

  it("normalizes rotation", () => {
    expect(normalizeRotation(450)).toBe(90);

    expect(normalizeRotation(-90)).toBe(270);
  });

  it("rotates a document node immutably", () => {
    const result = rotateNodeTo(sampleDocument, "rectangle-hero", 45);

    expect(result.nodes["rectangle-hero"].rotation).toBe(45);

    expect(sampleDocument.nodes["rectangle-hero"].rotation).toBe(0);
  });
});
