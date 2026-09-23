import { describe, expect, it } from "vitest";

import {
  deleteNodes,
  moveNodeBy,
  moveNodesBy,
  reparentNodeByWorldContainment,
  resizeNodeToWorldBounds,
} from "./documentOperations";
import { sampleDocument } from "./sampleDocument";
import type { EditorDocument } from "./types";

describe("document operations", () => {
  describe("moveNodeBy", () => {
    it("moves a node by the provided world delta", () => {
      const result = moveNodeBy(sampleDocument, "rectangle-hero", {
        x: 25,
        y: -10,
      });

      expect(result.nodes["rectangle-hero"].x).toBe(89);

      expect(result.nodes["rectangle-hero"].y).toBe(54);
    });

    it("converts world movement into parent-local movement", () => {
      const document: EditorDocument = {
        schemaVersion: 1,

        id: "rotated-parent",
        name: "Rotated Parent",

        rootNodeIds: ["frame"],

        nodes: {
          frame: {
            id: "frame",
            type: "frame",
            name: "Frame",

            parentId: null,

            x: 100,
            y: 100,

            width: 400,
            height: 400,

            rotation: 90,
            opacity: 1,

            visible: true,
            locked: false,

            childIds: ["rectangle"],

            fill: null,
            clipContent: false,
          },

          rectangle: {
            id: "rectangle",
            type: "rectangle",
            name: "Rectangle",

            parentId: "frame",

            x: 50,
            y: 60,

            width: 100,
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

      const result = moveNodeBy(document, "rectangle", {
        x: 10,
        y: 0,
      });

      expect(result.nodes["rectangle"].x).toBeCloseTo(50);

      expect(result.nodes["rectangle"].y).toBeCloseTo(50);
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

      expect(result.nodes["text-title"]).toBe(
        sampleDocument.nodes["text-title"],
      );
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

  describe("moveNodesBy", () => {
    it("moves multiple sibling nodes", () => {
      const result = moveNodesBy(
        sampleDocument,
        ["rectangle-hero", "text-title"],
        {
          x: 10,
          y: 20,
        },
      );

      expect(result.nodes["rectangle-hero"].x).toBe(74);

      expect(result.nodes["rectangle-hero"].y).toBe(84);

      expect(result.nodes["text-title"].x).toBe(122);

      expect(result.nodes["text-title"].y).toBe(172);
    });

    it("does not move a selected child twice when its parent is also selected", () => {
      const result = moveNodesBy(
        sampleDocument,
        ["frame-main", "rectangle-hero"],
        {
          x: 10,
          y: 20,
        },
      );

      expect(result.nodes["frame-main"].x).toBe(130);

      expect(result.nodes["frame-main"].y).toBe(100);

      expect(result.nodes["rectangle-hero"].x).toBe(64);

      expect(result.nodes["rectangle-hero"].y).toBe(64);
    });

    it("does not move locked nodes", () => {
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

      const result = moveNodesBy(document, ["rectangle-hero", "text-title"], {
        x: 10,
        y: 20,
      });

      expect(result.nodes["rectangle-hero"].x).toBe(64);

      expect(result.nodes["rectangle-hero"].y).toBe(64);

      expect(result.nodes["text-title"].x).toBe(122);

      expect(result.nodes["text-title"].y).toBe(172);
    });
  });

  describe("reparentNodeByWorldContainment", () => {
    it("moves a root node into a frame while preserving world geometry", () => {
      const document: EditorDocument = {
        ...sampleDocument,
        rootNodeIds: [...sampleDocument.rootNodeIds, "rectangle-root"],
        nodes: {
          ...sampleDocument.nodes,
          "rectangle-root": {
            id: "rectangle-root",
            type: "rectangle",
            name: "Root Rectangle",
            parentId: null,
            x: 300,
            y: 500,
            width: 120,
            height: 80,
            rotation: 15,
            opacity: 1,
            visible: true,
            locked: false,
            fill: {
              type: "solid",
              color: "#60a5fa",
            },
            cornerRadius: 8,
          },
        },
      };

      const before = document.nodes["rectangle-root"];
      const result = reparentNodeByWorldContainment(document, "rectangle-root");
      const after = result.nodes["rectangle-root"];

      expect(after.parentId).toBe("frame-main");
      expect(result.rootNodeIds).not.toContain("rectangle-root");

      expect(after.rotation).toBeCloseTo(before.rotation);

      const frame = result.nodes["frame-main"];

      expect(frame.type).toBe("frame");

      if (frame.type !== "frame") {
        return;
      }

      expect(frame.childIds).toContain("rectangle-root");
    });

    it("moves a child out to the root when it no longer fits in its frame", () => {
      const movedDocument = moveNodeBy(sampleDocument, "text-title", {
        x: 1400,
        y: 0,
      });

      const result = reparentNodeByWorldContainment(
        movedDocument,
        "text-title",
      );

      expect(result.nodes["text-title"].parentId).toBeNull();
      expect(result.rootNodeIds).toContain("text-title");

      const frame = result.nodes["frame-main"];

      expect(frame.type).toBe("frame");

      if (frame.type !== "frame") {
        return;
      }

      expect(frame.childIds).not.toContain("text-title");
    });

    it("does not create a frame hierarchy cycle", () => {
      const document: EditorDocument = {
        schemaVersion: 1,
        id: "nested-frames",
        name: "Nested Frames",
        rootNodeIds: ["outer"],
        nodes: {
          outer: {
            id: "outer",
            type: "frame",
            name: "Outer",
            parentId: null,
            x: 100,
            y: 100,
            width: 500,
            height: 500,
            rotation: 0,
            opacity: 1,
            visible: true,
            locked: false,
            childIds: ["inner"],
            fill: null,
            clipContent: false,
          },
          inner: {
            id: "inner",
            type: "frame",
            name: "Inner",
            parentId: "outer",
            x: 100,
            y: 100,
            width: 200,
            height: 200,
            rotation: 0,
            opacity: 1,
            visible: true,
            locked: false,
            childIds: [],
            fill: null,
            clipContent: false,
          },
        },
      };

      const result = reparentNodeByWorldContainment(document, "outer");

      expect(result).toBe(document);
      expect(result.nodes.outer.parentId).toBeNull();
    });
  });

  describe("resizeNodeToWorldBounds", () => {
    it("resizes a root node using world bounds", () => {
      const result = resizeNodeToWorldBounds(sampleDocument, "frame-main", {
        x: 150,
        y: 100,

        width: 900,
        height: 600,
      });

      const frame = result.nodes["frame-main"];

      expect(frame.x).toBe(150);

      expect(frame.y).toBe(100);

      expect(frame.width).toBe(900);

      expect(frame.height).toBe(600);
    });

    it("converts world position back to local coordinates for a child node", () => {
      const result = resizeNodeToWorldBounds(sampleDocument, "text-title", {
        x: 300,
        y: 260,

        width: 500,
        height: 90,
      });

      const text = result.nodes["text-title"];

      expect(text.x).toBe(180);

      expect(text.y).toBe(180);

      expect(text.width).toBe(500);

      expect(text.height).toBe(90);
    });

    it("does not mutate the original node when resizing", () => {
      resizeNodeToWorldBounds(sampleDocument, "text-title", {
        x: 300,
        y: 260,

        width: 500,
        height: 90,
      });

      expect(sampleDocument.nodes["text-title"].x).toBe(112);

      expect(sampleDocument.nodes["text-title"].width).toBe(560);
    });

    it("does not resize locked nodes", () => {
      const document: EditorDocument = {
        ...sampleDocument,

        nodes: {
          ...sampleDocument.nodes,

          "text-title": {
            ...sampleDocument.nodes["text-title"],

            locked: true,
          },
        },
      };

      const result = resizeNodeToWorldBounds(document, "text-title", {
        x: 300,
        y: 260,

        width: 500,
        height: 90,
      });

      expect(result).toBe(document);
    });
  });

  describe("deleteNodes", () => {
    it("deletes a child node and removes it from its parent", () => {
      const result = deleteNodes(sampleDocument, ["text-title"]);

      expect(result.nodes["text-title"]).toBeUndefined();

      const frame = result.nodes["frame-main"];

      expect(frame.type).toBe("frame");

      if (frame.type !== "frame") {
        return;
      }

      expect(frame.childIds).not.toContain("text-title");
    });

    it("deletes a frame and all of its descendants", () => {
      const result = deleteNodes(sampleDocument, ["frame-main"]);

      expect(result.rootNodeIds).toEqual([]);

      expect(Object.keys(result.nodes)).toEqual([]);
    });

    it("handles parent and child selected together without leaving dangling nodes", () => {
      const result = deleteNodes(sampleDocument, [
        "frame-main",
        "rectangle-hero",
      ]);

      expect(result.rootNodeIds).toEqual([]);

      expect(result.nodes).toEqual({});
    });

    it("does not delete a locked node", () => {
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

      const result = deleteNodes(document, ["rectangle-hero", "text-title"]);

      expect(result.nodes["rectangle-hero"]).toBeDefined();

      expect(result.nodes["text-title"]).toBeUndefined();
    });

    it("returns the same document when every selected node is locked", () => {
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

      const result = deleteNodes(document, ["rectangle-hero"]);

      expect(result).toBe(document);
    });
  });
});
