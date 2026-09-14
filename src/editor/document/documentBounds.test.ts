import { describe, expect, it } from "vitest";

import type { EditorDocument } from "./types";
import { getDocumentBounds } from "./documentBounds";
import { sampleDocument } from "./sampleDocument";

describe("getDocumentBounds", () => {
  it("returns the bounds of the sample document", () => {
    expect(getDocumentBounds(sampleDocument)).toEqual({
      x: 120,
      y: 80,
      width: 1200,
      height: 720,
    });
  });

  it("returns null when the document has no root nodes", () => {
    const document: EditorDocument = {
      schemaVersion: 1,
      id: "empty-document",
      name: "Empty Document",
      rootNodeIds: [],
      nodes: {},
    };

    expect(getDocumentBounds(document)).toBeNull();
  });

  it("calculates bounds across multiple root nodes", () => {
    const document: EditorDocument = {
      schemaVersion: 1,

      id: "multiple-artboards",
      name: "Multiple Artboards",

      rootNodeIds: ["frame-left", "frame-right"],

      nodes: {
        "frame-left": {
          id: "frame-left",
          type: "frame",
          name: "Desktop",

          parentId: null,

          x: 100,
          y: 80,

          width: 800,
          height: 600,

          rotation: 0,
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

        "frame-right": {
          id: "frame-right",
          type: "frame",
          name: "Tablet",

          parentId: null,

          x: 1100,
          y: 200,

          width: 500,
          height: 700,

          rotation: 0,
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

    expect(getDocumentBounds(document)).toEqual({
      x: 100,
      y: 80,
      width: 1500,
      height: 820,
    });
  });
});
