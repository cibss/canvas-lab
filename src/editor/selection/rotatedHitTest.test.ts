import { describe, expect, it } from "vitest";

import type { EditorDocument } from "@/editor/document/types";

import { hitTestDocument } from "./hitTest";

const document: EditorDocument = {
  schemaVersion: 1,

  id: "rotated-hit-test",
  name: "Rotated Hit Test",

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

      rotation: 45,
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

describe("rotated hit testing", () => {
  it("hits the center of a rotated node", () => {
    expect(
      hitTestDocument(document, {
        x: 200,
        y: 150,
      }),
    ).toBe("rectangle");
  });

  it("does not hit an empty corner of the rotated axis-aligned bounds", () => {
    expect(
      hitTestDocument(document, {
        x: 100,
        y: 100,
      }),
    ).toBeNull();
  });
});
