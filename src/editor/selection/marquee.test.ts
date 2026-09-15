import { describe, expect, it } from "vitest";

import type { EditorDocument } from "@/editor/document/types";
import { sampleDocument } from "@/editor/document/sampleDocument";

import { findNodesWithinMarquee, getMarqueeBounds } from "./marquee";

describe("marquee selection", () => {
  it("normalizes a marquee dragged from bottom-right to top-left", () => {
    expect(
      getMarqueeBounds({
        start: {
          x: 500,
          y: 400,
        },

        current: {
          x: 100,
          y: 150,
        },
      }),
    ).toEqual({
      x: 100,
      y: 150,
      width: 400,
      height: 250,
    });
  });

  it("finds a node fully contained by the marquee", () => {
    const result = findNodesWithinMarquee(sampleDocument, {
      x: 220,
      y: 220,
      width: 600,
      height: 100,
    });

    expect(result).toEqual(["text-title"]);
  });

  it("selects multiple child nodes", () => {
    const result = findNodesWithinMarquee(sampleDocument, {
      x: 170,
      y: 130,
      width: 1100,
      height: 400,
    });

    expect(result).toEqual([
      "rectangle-hero",
      "ellipse-decoration",
      "text-title",
    ]);
  });

  it("does not include a parent frame when its children are also candidates", () => {
    const result = findNodesWithinMarquee(sampleDocument, {
      x: 100,
      y: 60,
      width: 1250,
      height: 780,
    });

    expect(result).toEqual([
      "rectangle-hero",
      "ellipse-decoration",
      "text-title",
    ]);
  });

  it("ignores locked nodes", () => {
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

    const result = findNodesWithinMarquee(document, {
      x: 220,
      y: 220,
      width: 600,
      height: 100,
    });

    expect(result).toEqual([]);
  });
});
