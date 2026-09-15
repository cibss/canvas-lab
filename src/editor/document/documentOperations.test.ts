import { describe, expect, it } from "vitest";

import { deleteNodes, moveNodeBy, moveNodesBy } from "./documentOperations";
import { sampleDocument } from "./sampleDocument";

describe("document operations", () => {
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
  });
});
