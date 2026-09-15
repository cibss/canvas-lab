import { describe, expect, it } from "vitest";

import { sampleDocument } from "@/editor/document/sampleDocument";
import type { SelectionState } from "@/editor/selection/selection";

import { getSelectionBounds } from "./selectionBounds";

describe("getSelectionBounds", () => {
  it("returns null for an empty selection", () => {
    const selection: SelectionState = {
      selectedNodeIds: [],
    };

    expect(getSelectionBounds(sampleDocument, selection)).toBeNull();
  });

  it("returns bounds for a single selected node", () => {
    const selection: SelectionState = {
      selectedNodeIds: ["text-title"],
    };

    expect(getSelectionBounds(sampleDocument, selection)).toEqual({
      x: 232,
      y: 232,

      width: 560,
      height: 72,

      centerX: 512,
      centerY: 268,
    });
  });

  it("returns combined bounds for multiple selected nodes", () => {
    const selection: SelectionState = {
      selectedNodeIds: ["rectangle-hero", "ellipse-decoration", "text-title"],
    };

    expect(getSelectionBounds(sampleDocument, selection)).toEqual({
      x: 184,
      y: 144,

      width: 1072,
      height: 320,

      centerX: 720,
      centerY: 304,
    });
  });

  it("ignores unknown node ids", () => {
    const selection: SelectionState = {
      selectedNodeIds: ["missing-node", "text-title"],
    };

    expect(getSelectionBounds(sampleDocument, selection)).toEqual({
      x: 232,
      y: 232,

      width: 560,
      height: 72,

      centerX: 512,
      centerY: 268,
    });
  });
});
