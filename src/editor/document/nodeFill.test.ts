import { describe, expect, it } from "vitest";

import { sampleDocument } from "./sampleDocument";
import {
  canEditNodeFill,
  getNodeFillColor,
  normalizeHexColor,
  updateNodeFillColor,
} from "./nodeFill";

describe("node fill", () => {
  it("recognizes rectangle and ellipse fill editing", () => {
    expect(canEditNodeFill(sampleDocument.nodes["rectangle-hero"])).toBe(true);
    expect(canEditNodeFill(sampleDocument.nodes["ellipse-decoration"])).toBe(
      true,
    );
    expect(canEditNodeFill(sampleDocument.nodes["text-title"])).toBe(false);
    expect(canEditNodeFill(sampleDocument.nodes["frame-main"])).toBe(false);
  });

  it("normalizes three and six digit hex colors", () => {
    expect(normalizeHexColor("#ABC")).toBe("#aabbcc");
    expect(normalizeHexColor("336699")).toBe("#336699");
    expect(normalizeHexColor("  #A1B2C3  ")).toBe("#a1b2c3");
  });

  it("rejects unsupported color strings", () => {
    expect(normalizeHexColor("red")).toBeNull();
    expect(normalizeHexColor("#12")).toBeNull();
    expect(normalizeHexColor("#12345g")).toBeNull();
  });

  it("returns the current editable fill color", () => {
    expect(getNodeFillColor(sampleDocument.nodes["rectangle-hero"])).toBe(
      "#e4e4e7",
    );

    expect(getNodeFillColor(sampleDocument.nodes["text-title"])).toBeNull();
  });

  it("updates rectangle fill immutably", () => {
    const result = updateNodeFillColor(
      sampleDocument,
      "rectangle-hero",
      "#2563EB",
    );

    expect(result).not.toBe(sampleDocument);

    const node = result.nodes["rectangle-hero"];

    expect(node.type).toBe("rectangle");

    if (node.type !== "rectangle") {
      return;
    }

    expect(node.fill?.color).toBe("#2563eb");

    const originalNode = sampleDocument.nodes["rectangle-hero"];

    expect(originalNode.type).toBe("rectangle");

    if (originalNode.type !== "rectangle") {
      return;
    }

    expect(originalNode.fill?.color).toBe("#e4e4e7");
  });

  it("creates a solid fill when an editable shape has no fill", () => {
    const rectangle = sampleDocument.nodes["rectangle-hero"];

    if (rectangle.type !== "rectangle") {
      throw new Error("Expected rectangle fixture.");
    }

    const document = {
      ...sampleDocument,

      nodes: {
        ...sampleDocument.nodes,

        [rectangle.id]: {
          ...rectangle,
          fill: null,
        },
      },
    };

    const result = updateNodeFillColor(document, rectangle.id, "#22c55e");
    const nextNode = result.nodes[rectangle.id];

    expect(nextNode.type).toBe("rectangle");

    if (nextNode.type !== "rectangle") {
      return;
    }

    expect(nextNode.fill).toEqual({
      type: "solid",
      color: "#22c55e",
    });
  });

  it("does not update locked or unsupported nodes", () => {
    const rectangle = sampleDocument.nodes["rectangle-hero"];

    const lockedDocument = {
      ...sampleDocument,

      nodes: {
        ...sampleDocument.nodes,

        [rectangle.id]: {
          ...rectangle,
          locked: true,
        },
      },
    };

    expect(updateNodeFillColor(lockedDocument, rectangle.id, "#000000")).toBe(
      lockedDocument,
    );

    expect(updateNodeFillColor(sampleDocument, "text-title", "#000000")).toBe(
      sampleDocument,
    );
  });

  it("returns the same document when the normalized color did not change", () => {
    expect(
      updateNodeFillColor(sampleDocument, "rectangle-hero", "#E4E4E7"),
    ).toBe(sampleDocument);
  });
});
