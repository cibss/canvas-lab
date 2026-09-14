import { describe, expect, it } from "vitest";

import { sampleDocument } from "./sampleDocument";

describe("sampleDocument", () => {
  it("contains the expected document metadata", () => {
    expect(sampleDocument.schemaVersion).toBe(1);
    expect(sampleDocument.id).toBe("canvas-lab-sample");
    expect(sampleDocument.name).toBe("CanvasLab Sample");
  });

  it("contains one root frame", () => {
    expect(sampleDocument.rootNodeIds).toEqual(["frame-main"]);

    const rootNode = sampleDocument.nodes["frame-main"];

    expect(rootNode).toBeDefined();
    expect(rootNode.type).toBe("frame");
    expect(rootNode.parentId).toBeNull();
  });

  it("contains four editor nodes", () => {
    expect(Object.keys(sampleDocument.nodes)).toHaveLength(4);
  });

  it("keeps parent and child relationships consistent", () => {
    for (const node of Object.values(sampleDocument.nodes)) {
      if (node.type !== "frame") {
        continue;
      }

      for (const childId of node.childIds) {
        const child = sampleDocument.nodes[childId];

        expect(child).toBeDefined();
        expect(child.parentId).toBe(node.id);
      }
    }
  });

  it("references valid root nodes", () => {
    for (const rootNodeId of sampleDocument.rootNodeIds) {
      const rootNode = sampleDocument.nodes[rootNodeId];

      expect(rootNode).toBeDefined();
      expect(rootNode.parentId).toBeNull();
    }
  });
});
