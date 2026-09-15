import { describe, expect, it } from "vitest";

import {
  addNodesToSelection,
  clearSelection,
  createSelectionState,
  isNodeSelected,
  selectNodes,
  selectSingleNode,
  toggleNodeSelection,
} from "./selection";

describe("selection", () => {
  it("creates an empty selection", () => {
    expect(createSelectionState()).toEqual({
      selectedNodeIds: [],
    });
  });

  it("selects a single node", () => {
    const selection = createSelectionState();

    const nextSelection = selectSingleNode(selection, "rectangle-hero");

    expect(nextSelection).toEqual({
      selectedNodeIds: ["rectangle-hero"],
    });
  });

  it("selects multiple nodes", () => {
    const selection = createSelectionState();

    const nextSelection = selectNodes(selection, [
      "rectangle-hero",
      "text-title",
    ]);

    expect(nextSelection).toEqual({
      selectedNodeIds: ["rectangle-hero", "text-title"],
    });
  });

  it("removes duplicate node ids", () => {
    const selection = createSelectionState();

    const nextSelection = selectNodes(selection, [
      "rectangle-hero",
      "rectangle-hero",
    ]);

    expect(nextSelection).toEqual({
      selectedNodeIds: ["rectangle-hero"],
    });
  });

  it("adds nodes to an existing selection", () => {
    const selection = {
      selectedNodeIds: ["rectangle-hero"],
    };

    const nextSelection = addNodesToSelection(selection, [
      "text-title",
      "ellipse-decoration",
    ]);

    expect(nextSelection).toEqual({
      selectedNodeIds: ["rectangle-hero", "text-title", "ellipse-decoration"],
    });
  });

  it("toggles a node into the selection", () => {
    const selection = createSelectionState();

    const nextSelection = toggleNodeSelection(selection, "text-title");

    expect(nextSelection).toEqual({
      selectedNodeIds: ["text-title"],
    });
  });

  it("toggles a selected node out of the selection", () => {
    const selection = {
      selectedNodeIds: ["rectangle-hero", "text-title"],
    };

    const nextSelection = toggleNodeSelection(selection, "text-title");

    expect(nextSelection).toEqual({
      selectedNodeIds: ["rectangle-hero"],
    });
  });

  it("does not mutate the previous selection", () => {
    const selection = {
      selectedNodeIds: ["text-title"],
    };

    selectSingleNode(selection, "rectangle-hero");

    expect(selection).toEqual({
      selectedNodeIds: ["text-title"],
    });
  });

  it("clears the selection", () => {
    const selection = {
      selectedNodeIds: ["rectangle-hero"],
    };

    expect(clearSelection(selection)).toEqual({
      selectedNodeIds: [],
    });
  });

  it("checks whether a node is selected", () => {
    const selection = {
      selectedNodeIds: ["rectangle-hero"],
    };

    expect(isNodeSelected(selection, "rectangle-hero")).toBe(true);

    expect(isNodeSelected(selection, "text-title")).toBe(false);
  });
});
