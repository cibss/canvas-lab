import { describe, expect, it } from "vitest";

import { moveNodeBy } from "@/editor/document/documentOperations";
import { sampleDocument } from "@/editor/document/sampleDocument";
import type { EditorDocument } from "@/editor/document/types";

import { hitTestDocument } from "./hitTest";

describe("hitTestDocument", () => {
  it("returns null when the point hits nothing", () => {
    expect(
      hitTestDocument(sampleDocument, {
        x: 20,
        y: 20,
      }),
    ).toBeNull();
  });

  it("hits a child rectangle using world coordinates", () => {
    expect(
      hitTestDocument(sampleDocument, {
        x: 200,
        y: 160,
      }),
    ).toBe("rectangle-hero");
  });

  it("hits the text above the rectangle", () => {
    expect(
      hitTestDocument(sampleDocument, {
        x: 250,
        y: 250,
      }),
    ).toBe("text-title");
  });

  it("hits the frame when no child is under the point", () => {
    expect(
      hitTestDocument(sampleDocument, {
        x: 1250,
        y: 700,
      }),
    ).toBe("frame-main");
  });

  it("uses the topmost node when objects overlap", () => {
    const document: EditorDocument = {
      schemaVersion: 1,

      id: "overlap-test",
      name: "Overlap Test",

      rootNodeIds: ["frame-main"],

      nodes: {
        "frame-main": {
          id: "frame-main",
          type: "frame",
          name: "Frame",

          parentId: null,

          x: 0,
          y: 0,

          width: 500,
          height: 500,

          rotation: 0,
          opacity: 1,

          visible: true,
          locked: false,

          childIds: ["rectangle-bottom", "rectangle-top"],

          fill: null,
          clipContent: true,
        },

        "rectangle-bottom": {
          id: "rectangle-bottom",
          type: "rectangle",
          name: "Bottom",

          parentId: "frame-main",

          x: 100,
          y: 100,

          width: 200,
          height: 200,

          rotation: 0,
          opacity: 1,

          visible: true,
          locked: false,

          fill: {
            type: "solid",
            color: "#ffffff",
          },

          cornerRadius: 0,
        },

        "rectangle-top": {
          id: "rectangle-top",
          type: "rectangle",
          name: "Top",

          parentId: "frame-main",

          x: 150,
          y: 150,

          width: 200,
          height: 200,

          rotation: 0,
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

    expect(
      hitTestDocument(document, {
        x: 175,
        y: 175,
      }),
    ).toBe("rectangle-top");
  });

  it("ignores locked nodes", () => {
    const document: EditorDocument = {
      ...sampleDocument,

      nodes: {
        ...sampleDocument.nodes,

        "rectangle-hero": {
          ...sampleDocument.nodes["rectangle-hero"],

          locked: true,
        },
      },
    };

    expect(
      hitTestDocument(document, {
        x: 200,
        y: 160,
      }),
    ).toBe("frame-main");
  });

  it("ignores invisible nodes", () => {
    const document: EditorDocument = {
      ...sampleDocument,

      nodes: {
        ...sampleDocument.nodes,

        "text-title": {
          ...sampleDocument.nodes["text-title"],

          visible: false,
        },
      },
    };

    expect(
      hitTestDocument(document, {
        x: 250,
        y: 250,
      }),
    ).toBe("rectangle-hero");
  });

  it("uses the updated node position after the document changes", () => {
    const document = moveNodeBy(sampleDocument, "text-title", {
      x: 0,
      y: 200,
    });

    expect(
      hitTestDocument(document, {
        x: 250,
        y: 450,
      }),
    ).toBe("text-title");

    expect(
      hitTestDocument(document, {
        x: 250,
        y: 250,
      }),
    ).toBe("rectangle-hero");
  });

  it("does not hit clipped children outside their frame", () => {
    const document: EditorDocument = {
      schemaVersion: 1,

      id: "clip-test",
      name: "Clip Test",

      rootNodeIds: ["frame-main"],

      nodes: {
        "frame-main": {
          id: "frame-main",
          type: "frame",
          name: "Frame",

          parentId: null,

          x: 100,
          y: 100,

          width: 200,
          height: 200,

          rotation: 0,
          opacity: 1,

          visible: true,
          locked: false,

          childIds: ["rectangle-child"],

          fill: {
            type: "solid",
            color: "#ffffff",
          },

          clipContent: true,
        },

        "rectangle-child": {
          id: "rectangle-child",
          type: "rectangle",
          name: "Child",

          parentId: "frame-main",

          x: 150,
          y: 50,

          width: 200,
          height: 100,

          rotation: 0,
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

    expect(
      hitTestDocument(document, {
        x: 350,
        y: 200,
      }),
    ).toBeNull();
  });
});
