import { describe, expect, it } from "vitest";

import {
  getNodeWorldBounds,
  getNodeWorldGeometry,
  worldPointToNodeLocal,
} from "./nodeGeometry";
import type { EditorDocument } from "./types";

const document: EditorDocument = {
  schemaVersion: 1,

  id: "rotation-geometry",
  name: "Rotation Geometry",

  rootNodeIds: ["rectangle"],

  nodes: {
    rectangle: {
      id: "rectangle",
      type: "rectangle",
      name: "Rectangle",

      parentId: null,

      x: 100,
      y: 100,

      width: 200,
      height: 100,

      rotation: 90,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#000000",
      },

      cornerRadius: 0,
    },
  },
};

describe("rotation geometry", () => {
  it("computes rotated world corners", () => {
    const geometry = getNodeWorldGeometry(document, "rectangle");

    expect(geometry).not.toBeNull();

    if (!geometry) {
      return;
    }

    expect(geometry.corners.northWest.x).toBeCloseTo(250);

    expect(geometry.corners.northWest.y).toBeCloseTo(50);

    expect(geometry.corners.southEast.x).toBeCloseTo(150);

    expect(geometry.corners.southEast.y).toBeCloseTo(250);
  });

  it("computes an axis-aligned world bound around a rotated node", () => {
    const bounds = getNodeWorldBounds(document, "rectangle");

    expect(bounds).not.toBeNull();

    if (!bounds) {
      return;
    }

    expect(bounds.x).toBeCloseTo(150);

    expect(bounds.y).toBeCloseTo(50);

    expect(bounds.width).toBeCloseTo(100);

    expect(bounds.height).toBeCloseTo(200);
  });

  it("converts a world point back into node-local space", () => {
    const localPoint = worldPointToNodeLocal(document, "rectangle", {
      x: 200,
      y: 150,
    });

    expect(localPoint).not.toBeNull();

    if (!localPoint) {
      return;
    }

    expect(localPoint.x).toBeCloseTo(100);

    expect(localPoint.y).toBeCloseTo(50);
  });
});
