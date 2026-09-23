import { describe, expect, it } from "vitest";

import { getNodeWorldGeometry, getNodeWorldPosition } from "./nodeGeometry";
import {
  findFrameContainingWorldBounds,
  findFrameContainingWorldPoint,
} from "./frameParenting";
import type { EditorDocument } from "./types";
import { insertShape } from "./shapeCreation";
import { insertText } from "./textEditing";

function createRotatedFrameDocument(): EditorDocument {
  return {
    schemaVersion: 1,
    id: "rotated-frame-document",
    name: "Rotated Frame Document",
    rootNodeIds: ["frame-root"],
    nodes: {
      "frame-root": {
        id: "frame-root",
        type: "frame",
        name: "Rotated Frame",
        parentId: null,
        x: 100,
        y: 100,
        width: 400,
        height: 300,
        rotation: 30,
        opacity: 1,
        visible: true,
        locked: false,
        childIds: [],
        fill: {
          type: "solid",
          color: "#ffffff",
        },
        clipContent: true,
      },
    },
  };
}

function createNestedFrameDocument(): EditorDocument {
  return {
    schemaVersion: 1,
    id: "nested-frame-document",
    name: "Nested Frame Document",
    rootNodeIds: ["frame-outer"],
    nodes: {
      "frame-outer": {
        id: "frame-outer",
        type: "frame",
        name: "Outer Frame",
        parentId: null,
        x: 100,
        y: 100,
        width: 500,
        height: 400,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        childIds: ["frame-inner"],
        fill: {
          type: "solid",
          color: "#ffffff",
        },
        clipContent: true,
      },
      "frame-inner": {
        id: "frame-inner",
        type: "frame",
        name: "Inner Frame",
        parentId: "frame-outer",
        x: 80,
        y: 70,
        width: 240,
        height: 180,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        childIds: [],
        fill: {
          type: "solid",
          color: "#f4f4f5",
        },
        clipContent: true,
      },
    },
  };
}

describe("frame parenting", () => {
  it("finds the deepest frame containing a world point", () => {
    const document = createNestedFrameDocument();

    expect(
      findFrameContainingWorldPoint(document, {
        x: 250,
        y: 230,
      }),
    ).toBe("frame-inner");
  });

  it("only chooses a frame when the full shape bounds fit inside it", () => {
    const document = createNestedFrameDocument();

    expect(
      findFrameContainingWorldBounds(document, {
        x: 220,
        y: 220,
        width: 80,
        height: 60,
      }),
    ).toBe("frame-inner");

    expect(
      findFrameContainingWorldBounds(document, {
        x: 560,
        y: 440,
        width: 100,
        height: 100,
      }),
    ).toBeNull();
  });

  it("inserts a created rectangle as a frame child", () => {
    const document = createNestedFrameDocument();

    const result = insertShape(document, "rectangle", "rectangle-new", {
      x: 220,
      y: 220,
      width: 80,
      height: 60,
    });

    const node = result.nodes["rectangle-new"];

    expect(node.parentId).toBe("frame-inner");

    expect(result.rootNodeIds).not.toContain("rectangle-new");

    const parent = result.nodes["frame-inner"];

    expect(parent.type).toBe("frame");

    if (parent.type !== "frame") {
      return;
    }

    expect(parent.childIds).toContain("rectangle-new");
  });

  it("preserves world geometry when parenting into a rotated frame", () => {
    const document = createRotatedFrameDocument();

    const bounds = {
      x: 280,
      y: 230,
      width: 40,
      height: 40,
    };

    const result = insertShape(document, "rectangle", "rectangle-new", bounds);

    const node = result.nodes["rectangle-new"];

    expect(node.parentId).toBe("frame-root");

    const geometry = getNodeWorldGeometry(result, node.id);

    expect(geometry).not.toBeNull();

    if (!geometry) {
      return;
    }

    expect(geometry.corners.northWest.x).toBeCloseTo(bounds.x);

    expect(geometry.corners.northWest.y).toBeCloseTo(bounds.y);

    expect(geometry.corners.southEast.x).toBeCloseTo(bounds.x + bounds.width);

    expect(geometry.corners.southEast.y).toBeCloseTo(bounds.y + bounds.height);
  });

  it("parents text created inside a rotated frame without moving its world origin", () => {
    const document = createRotatedFrameDocument();

    const point = {
      x: 260,
      y: 220,
    };

    const result = insertText(document, "text-new", point);

    const node = result.nodes["text-new"];

    expect(node.parentId).toBe("frame-root");

    const worldPosition = getNodeWorldPosition(result, node.id);

    expect(worldPosition).not.toBeNull();

    if (!worldPosition) {
      return;
    }

    expect(worldPosition.x).toBeCloseTo(point.x);

    expect(worldPosition.y).toBeCloseTo(point.y);
  });

  it("does not target locked frames", () => {
    const document = createNestedFrameDocument();

    const inner = document.nodes["frame-inner"];

    if (inner.type !== "frame") {
      throw new Error("Expected inner frame.");
    }

    const lockedDocument: EditorDocument = {
      ...document,
      nodes: {
        ...document.nodes,
        "frame-inner": {
          ...inner,
          locked: true,
        },
      },
    };

    expect(
      findFrameContainingWorldPoint(lockedDocument, {
        x: 250,
        y: 230,
      }),
    ).toBe("frame-outer");
  });
});
