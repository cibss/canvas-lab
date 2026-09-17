import { describe, expect, it } from "vitest";

import { dispatchEditorCommand } from "@/editor/commands/dispatch";
import {
  beginGestureTransaction,
  commitGestureTransaction,
} from "@/editor/commands/gestureTransaction";
import { deleteNodes, moveNodesBy } from "@/editor/document/documentOperations";
import { sampleDocument } from "@/editor/document/sampleDocument";
import {
  clearSelection,
  createSelectionState,
  selectSingleNode,
} from "@/editor/selection/selection";
import {
  createEditorState,
  redoEditorState,
  undoEditorState,
} from "@/editor/state/editorState";
import { rotateNodeTo } from "@/editor/transform/rotation";

describe("commands and undo/redo integration", () => {
  it("undoes and redoes a complete editor command timeline", () => {
    const selection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    let state = createEditorState(sampleDocument, selection);

    const initialX = sampleDocument.nodes["rectangle-hero"].x;

    /*
     * ACTION 1
     *
     * Two rapid keyboard nudges should become
     * one history command.
     */
    const firstNudge = moveNodesBy(
      state.document,
      state.selection.selectedNodeIds,
      {
        x: 1,
        y: 0,
      },
    );

    state = dispatchEditorCommand(state, {
      kind: "move",

      label: "Nudge selection",

      nextDocument: firstNudge,

      coalesce: {
        key: "keyboard-nudge",

        committedAt: 1000,
      },
    });

    const secondNudge = moveNodesBy(
      state.document,
      state.selection.selectedNodeIds,
      {
        x: 1,
        y: 0,
      },
    );

    state = dispatchEditorCommand(state, {
      kind: "move",

      label: "Nudge selection",

      nextDocument: secondNudge,

      coalesce: {
        key: "keyboard-nudge",

        committedAt: 1100,
      },
    });

    expect(state.document.nodes["rectangle-hero"].x).toBe(initialX + 2);

    expect(state.history.undoStack).toHaveLength(1);

    /*
     * ACTION 2
     *
     * Simulate one completed rotation gesture.
     */
    const rotationTransaction = beginGestureTransaction(
      "rotate",
      "Rotate selection",
      state.document,
      state.selection,
    );

    const rotatedDocument = rotateNodeTo(state.document, "rectangle-hero", 45);

    state = commitGestureTransaction(state, {
      transaction: rotationTransaction,

      nextDocument: rotatedDocument,

      nextSelection: state.selection,
    });

    expect(state.document.nodes["rectangle-hero"].rotation).toBe(45);

    expect(state.history.undoStack).toHaveLength(2);

    /*
     * ACTION 3
     *
     * Delete selection.
     */
    const deletedDocument = deleteNodes(
      state.document,
      state.selection.selectedNodeIds,
    );

    state = dispatchEditorCommand(state, {
      kind: "delete",

      label: "Delete selection",

      nextDocument: deletedDocument,

      nextSelection: clearSelection(state.selection),
    });

    expect(state.document.nodes["rectangle-hero"]).toBeUndefined();

    expect(state.selection.selectedNodeIds).toEqual([]);

    expect(state.history.undoStack).toHaveLength(3);

    /*
     * UNDO DELETE
     */
    state = undoEditorState(state);

    expect(state.document.nodes["rectangle-hero"]).toBeDefined();

    expect(state.document.nodes["rectangle-hero"].rotation).toBe(45);

    expect(state.selection.selectedNodeIds).toEqual(["rectangle-hero"]);

    /*
     * UNDO ROTATION
     */
    state = undoEditorState(state);

    expect(state.document.nodes["rectangle-hero"].rotation).toBe(0);

    expect(state.document.nodes["rectangle-hero"].x).toBe(initialX + 2);

    /*
     * UNDO COALESCED NUDGE
     */
    state = undoEditorState(state);

    expect(state.document).toBe(sampleDocument);

    expect(state.history.undoStack).toHaveLength(0);

    expect(state.history.redoStack).toHaveLength(3);

    /*
     * REDO NUDGE
     */
    state = redoEditorState(state);

    expect(state.document.nodes["rectangle-hero"].x).toBe(initialX + 2);

    /*
     * REDO ROTATION
     */
    state = redoEditorState(state);

    expect(state.document.nodes["rectangle-hero"].rotation).toBe(45);

    /*
     * REDO DELETE
     */
    state = redoEditorState(state);

    expect(state.document.nodes["rectangle-hero"]).toBeUndefined();

    expect(state.selection.selectedNodeIds).toEqual([]);

    expect(state.history.redoStack).toHaveLength(0);
  });

  it("clears the redo branch after a new command", () => {
    const selection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    let state = createEditorState(sampleDocument, selection);

    const movedDocument = moveNodesBy(
      state.document,
      state.selection.selectedNodeIds,
      {
        x: 10,
        y: 0,
      },
    );

    state = dispatchEditorCommand(state, {
      kind: "move",

      label: "Nudge selection",

      nextDocument: movedDocument,
    });

    state = undoEditorState(state);

    expect(state.history.redoStack).toHaveLength(1);

    const branchDocument = moveNodesBy(
      state.document,
      state.selection.selectedNodeIds,
      {
        x: 0,
        y: 10,
      },
    );

    state = dispatchEditorCommand(state, {
      kind: "move",

      label: "Nudge selection",

      nextDocument: branchDocument,
    });

    expect(state.history.redoStack).toEqual([]);

    expect(state.history.undoStack).toHaveLength(1);
  });
});
