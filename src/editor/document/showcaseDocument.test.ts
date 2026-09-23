import { describe, expect, it } from "vitest";

import { showcaseDocument } from "./showcaseDocument";

describe("showcaseDocument", () => {
  it("contains the expected document metadata", () => {
    expect(showcaseDocument.schemaVersion).toBe(1);
    expect(showcaseDocument.id).toBe("canvas-lab-sample");
    expect(showcaseDocument.name).toBe("CanvasLab Showcase");
  });

  it("contains one root showcase frame", () => {
    expect(showcaseDocument.rootNodeIds).toEqual(["frame-main"]);

    const rootNode = showcaseDocument.nodes["frame-main"];

    expect(rootNode).toBeDefined();
    expect(rootNode.type).toBe("frame");
    expect(rootNode.parentId).toBeNull();
    expect(rootNode.name).toBe("CanvasLab Showcase");
  });

  it("contains a portfolio-ready composition rather than a minimal demo", () => {
    expect(Object.keys(showcaseDocument.nodes).length).toBeGreaterThan(30);

    expect(showcaseDocument.nodes["sidebar-group"]).toBeDefined();
    expect(showcaseDocument.nodes["header-group"]).toBeDefined();
    expect(showcaseDocument.nodes["feature-group"]).toBeDefined();
    expect(showcaseDocument.nodes["metric-group"]).toBeDefined();
    expect(showcaseDocument.nodes["decision-group"]).toBeDefined();
  });

  it("includes multiline text that exercises committed line rendering", () => {
    const heroTitle = showcaseDocument.nodes["header-title"];
    const featureTitle = showcaseDocument.nodes["feature-title"];

    expect(heroTitle.type).toBe("text");
    expect(featureTitle.type).toBe("text");

    if (heroTitle.type !== "text" || featureTitle.type !== "text") {
      return;
    }

    expect(heroTitle.content).toContain("\n");
    expect(featureTitle.content).toContain("\n");
  });

  it("keeps parent and child relationships consistent", () => {
    for (const node of Object.values(showcaseDocument.nodes)) {
      if (node.type !== "frame") {
        continue;
      }

      for (const childId of node.childIds) {
        const child = showcaseDocument.nodes[childId];

        expect(child).toBeDefined();
        expect(child.parentId).toBe(node.id);
      }
    }
  });

  it("references valid root nodes", () => {
    for (const rootNodeId of showcaseDocument.rootNodeIds) {
      const rootNode = showcaseDocument.nodes[rootNodeId];

      expect(rootNode).toBeDefined();
      expect(rootNode.parentId).toBeNull();
    }
  });
});
