import { describe, expect, it } from "vitest";

import { setNodeVisibility } from "@/editor/document/nodeMetadata";
import { sampleDocument } from "@/editor/document/sampleDocument";
import type { EditorDocument } from "@/editor/document/types";

import {
  createSemanticDocumentTree,
  getSemanticNodeDescription,
} from "./semanticMirror";

describe("semantic mirror", () => {
  it("creates a semantic tree from the visible document hierarchy", () => {
    const tree = createSemanticDocumentTree(sampleDocument);

    expect(tree).toHaveLength(1);

    const frame = tree[0];

    expect(frame.id).toBe("frame-main");

    expect(frame.type).toBe("frame");

    expect(frame.children.map((child) => child.id)).toEqual([
      "rectangle-hero",
      "ellipse-decoration",
      "text-title",
    ]);
  });

  it("omits hidden nodes", () => {
    const document = setNodeVisibility(sampleDocument, "rectangle-hero", false);

    const tree = createSemanticDocumentTree(document);

    expect(tree[0].children.map((child) => child.id)).toEqual([
      "ellipse-decoration",
      "text-title",
    ]);
  });

  it("omits descendants when their parent frame is hidden", () => {
    const document = setNodeVisibility(sampleDocument, "frame-main", false);

    const tree = createSemanticDocumentTree(document);

    expect(tree).toEqual([]);
  });

  it("preserves locked nodes because they remain visible content", () => {
    const textNode = sampleDocument.nodes["text-title"];

    expect(textNode.type).toBe("text");

    if (textNode.type !== "text") {
      return;
    }

    const document: EditorDocument = {
      ...sampleDocument,

      nodes: {
        ...sampleDocument.nodes,

        "text-title": {
          ...textNode,

          locked: true,
        },
      },
    };

    const tree = createSemanticDocumentTree(document);

    const semanticTextNode = tree[0].children.find(
      (node) => node.id === "text-title",
    );

    expect(semanticTextNode?.locked).toBe(true);
  });

  it("creates a readable node description", () => {
    const tree = createSemanticDocumentTree(sampleDocument);

    const rectangle = tree[0].children.find(
      (node) => node.id === "rectangle-hero",
    );

    expect(rectangle).toBeDefined();

    if (!rectangle) {
      return;
    }

    const description = getSemanticNodeDescription(rectangle);

    expect(description).toContain("rectangle");

    expect(description).toContain(`${rectangle.width} by ${rectangle.height}`);
  });

  it("prevents malformed cyclic hierarchies from recursing forever", () => {
    const frame = sampleDocument.nodes["frame-main"];

    expect(frame.type).toBe("frame");

    if (frame.type !== "frame") {
      return;
    }

    const document: EditorDocument = {
      ...sampleDocument,

      nodes: {
        ...sampleDocument.nodes,

        "frame-main": {
          ...frame,

          childIds: ["rectangle-hero", "frame-main"],
        },
      },
    };

    const tree = createSemanticDocumentTree(document);

    expect(tree).toHaveLength(1);

    expect(tree[0].children.map((node) => node.id)).toEqual(["rectangle-hero"]);
  });
});
