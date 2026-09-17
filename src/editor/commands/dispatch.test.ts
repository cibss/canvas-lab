import { describe, expect, it } from "vitest";

import { deleteNodes, moveNodesBy } from "@/editor/document/documentOperations";
import { sampleDocument } from "@/editor/document/sampleDocument";
import {
  clearSelection,
  createSelectionState,
  selectSingleNode,
} from "@/editor/selection/selection";
import { createEditorState } from "@/editor/state/editorState";

import { dispatchEditorCommand } from "./dispatch";

describe("dispatchEditorCommand", () => {
  it("applies a document change and records one history command", () => {
    const selection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    const state = createEditorState(sampleDocument, selection);

    const nextDocument = moveNodesBy(
      state.document,
      state.selection.selectedNodeIds,
      { x: 1, y: 0 },
    );

    const nextState = dispatchEditorCommand(state, {
      kind: "move",
      label: "Nudge selection",
      nextDocument,
    });

    expect(nextState.document).toBe(nextDocument);
    expect(nextState.history.undoStack).toHaveLength(1);
    expect(nextState.history.undoStack[0].kind).toBe("move");
    expect(nextState.history.undoStack[0].label).toBe("Nudge selection");
  });

  it("does not create history for a no-op document change", () => {
    const state = createEditorState(sampleDocument);

    const nextState = dispatchEditorCommand(state, {
      kind: "move",
      label: "Nudge selection",
      nextDocument: state.document,
    });

    expect(nextState).toBe(state);
    expect(nextState.history.undoStack).toHaveLength(0);
  });

  it("can update selection without creating a command when document is unchanged", () => {
    const state = createEditorState(sampleDocument);

    const nextSelection = selectSingleNode(state.selection, "text-title");

    const nextState = dispatchEditorCommand(state, {
      kind: "update",
      label: "Selection change",
      nextDocument: state.document,
      nextSelection,
    });

    expect(nextState.selection.selectedNodeIds).toEqual(["text-title"]);
    expect(nextState.history.undoStack).toHaveLength(0);
  });

  it("stores delete before and after selection snapshots", () => {
    const selection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    const state = createEditorState(sampleDocument, selection);

    const nextDocument = deleteNodes(
      state.document,
      state.selection.selectedNodeIds,
    );

    const nextSelection = clearSelection(state.selection);

    const nextState = dispatchEditorCommand(state, {
      kind: "delete",
      label: "Delete selection",
      nextDocument,
      nextSelection,
    });

    expect(nextState.history.undoStack).toHaveLength(1);

    const command = nextState.history.undoStack[0];

    expect(command.before.selection.selectedNodeIds).toEqual([
      "rectangle-hero",
    ]);
    expect(command.after.selection.selectedNodeIds).toEqual([]);
    expect(command.after.document.nodes["rectangle-hero"]).toBeUndefined();
  });
});
