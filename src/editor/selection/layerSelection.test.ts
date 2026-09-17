import { describe, expect, it } from "vitest";

import { sampleDocument } from "@/editor/document/sampleDocument";

import type { SelectionState } from "./selection";
import {
  getNodeSubtreeIds,
  removeNodeSubtreeFromSelection,
} from "./selectionHierarchy";

describe("layer selection helpers", () => {
  it("collects an entire frame subtree", () => {
    const nodeIds = getNodeSubtreeIds(sampleDocument, "frame-main");

    expect(nodeIds).toEqual([
      "frame-main",
      "rectangle-hero",
      "ellipse-decoration",
      "text-title",
    ]);
  });

  it("returns only a leaf node for a non-frame", () => {
    expect(getNodeSubtreeIds(sampleDocument, "text-title")).toEqual([
      "text-title",
    ]);
  });

  it("removes a node from selection", () => {
    const selection: SelectionState = {
      selectedNodeIds: ["rectangle-hero", "text-title"],
    };

    expect(
      removeNodeSubtreeFromSelection(
        sampleDocument,
        selection,
        "rectangle-hero",
      ),
    ).toEqual({
      selectedNodeIds: ["text-title"],
    });
  });

  it("removes selected descendants when a frame becomes unavailable", () => {
    const selection: SelectionState = {
      selectedNodeIds: ["rectangle-hero", "text-title"],
    };

    expect(
      removeNodeSubtreeFromSelection(sampleDocument, selection, "frame-main"),
    ).toEqual({
      selectedNodeIds: [],
    });
  });

  it("preserves the same selection when the subtree was not selected", () => {
    const selection: SelectionState = {
      selectedNodeIds: ["text-title"],
    };

    const result = removeNodeSubtreeFromSelection(
      sampleDocument,
      selection,
      "rectangle-hero",
    );

    expect(result).toBe(selection);
  });
});
