import { describe, expect, it } from "vitest";

import { dispatchEditorCommand } from "@/editor/commands/dispatch";
import {
  setNodeLocked,
  setNodeVisibility,
  updateNodeName,
} from "@/editor/document/nodeMetadata";
import { sampleDocument } from "@/editor/document/sampleDocument";
import {
  createSelectionState,
  selectSingleNode,
} from "@/editor/selection/selection";
import { removeNodeSubtreeFromSelection } from "@/editor/selection/selectionHierarchy";
import {
  createEditorState,
  redoEditorState,
  undoEditorState,
} from "@/editor/state/editorState";

describe("layer controls history", () => {
  it("renames a node through undo and redo", () => {
    const selection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    let state = createEditorState(sampleDocument, selection);

    const nextDocument = updateNodeName(
      state.document,
      "rectangle-hero",
      "Hero Card",
    );

    state = dispatchEditorCommand(state, {
      kind: "update",

      label: "Rename object",

      nextDocument,
    });

    expect(state.document.nodes["rectangle-hero"].name).toBe("Hero Card");

    state = undoEditorState(state);

    expect(state.document.nodes["rectangle-hero"].name).toBe(
      sampleDocument.nodes["rectangle-hero"].name,
    );

    state = redoEditorState(state);

    expect(state.document.nodes["rectangle-hero"].name).toBe("Hero Card");
  });

  it("restores selection when hiding a selected node is undone", () => {
    const selection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    let state = createEditorState(sampleDocument, selection);

    const nextDocument = setNodeVisibility(
      state.document,
      "rectangle-hero",
      false,
    );

    const nextSelection = removeNodeSubtreeFromSelection(
      state.document,
      state.selection,
      "rectangle-hero",
    );

    state = dispatchEditorCommand(state, {
      kind: "update",

      label: "Hide object",

      nextDocument,

      nextSelection,
    });

    expect(state.document.nodes["rectangle-hero"].visible).toBe(false);

    expect(state.selection.selectedNodeIds).toEqual([]);

    state = undoEditorState(state);

    expect(state.document.nodes["rectangle-hero"].visible).toBe(true);

    expect(state.selection.selectedNodeIds).toEqual(["rectangle-hero"]);

    state = redoEditorState(state);

    expect(state.document.nodes["rectangle-hero"].visible).toBe(false);

    expect(state.selection.selectedNodeIds).toEqual([]);
  });

  it("restores selection when locking a selected node is undone", () => {
    const selection = selectSingleNode(createSelectionState(), "text-title");

    let state = createEditorState(sampleDocument, selection);

    const nextDocument = setNodeLocked(state.document, "text-title", true);

    const nextSelection = removeNodeSubtreeFromSelection(
      state.document,
      state.selection,
      "text-title",
    );

    state = dispatchEditorCommand(state, {
      kind: "update",

      label: "Lock object",

      nextDocument,

      nextSelection,
    });

    expect(state.document.nodes["text-title"].locked).toBe(true);

    expect(state.selection.selectedNodeIds).toEqual([]);

    state = undoEditorState(state);

    expect(state.document.nodes["text-title"].locked).toBe(false);

    expect(state.selection.selectedNodeIds).toEqual(["text-title"]);
  });

  it("removes selected descendants when a frame is hidden", () => {
    const selection = {
      selectedNodeIds: ["rectangle-hero", "text-title"],
    };

    let state = createEditorState(sampleDocument, selection);

    const nextDocument = setNodeVisibility(state.document, "frame-main", false);

    const nextSelection = removeNodeSubtreeFromSelection(
      state.document,
      state.selection,
      "frame-main",
    );

    state = dispatchEditorCommand(state, {
      kind: "update",

      label: "Hide object",

      nextDocument,

      nextSelection,
    });

    expect(state.selection.selectedNodeIds).toEqual([]);

    expect(state.document.nodes["frame-main"].visible).toBe(false);
  });
});
