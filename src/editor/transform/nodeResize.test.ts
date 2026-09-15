import { describe, expect, it } from "vitest";

import type { EditorDocument } from "@/editor/document/types";

import { createNodeResizeSession, resizeNodeWithSession } from "./nodeResize";

const document: EditorDocument = {
  schemaVersion: 1,

  id: "rotated-resize",
  name: "Rotated Resize",

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

describe("rotated node resize", () => {
  it("resizes along the rotated east axis", () => {
    const session = createNodeResizeSession(document, "rectangle", "east");

    expect(session).not.toBeNull();

    if (!session) {
      return;
    }

    const result = resizeNodeWithSession(document, session, {
      x: 200,
      y: 350,
    });

    const node = result.nodes["rectangle"];

    expect(node.width).toBeCloseTo(300);

    expect(node.height).toBeCloseTo(100);

    expect(node.x).toBeCloseTo(50);

    expect(node.y).toBeCloseTo(150);

    expect(node.rotation).toBe(90);
  });
});
