import { describe, expect, it } from "vitest";

import {
  clearSelection,
  createSelectionState,
  isNodeSelected,
  selectSingleNode,
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
