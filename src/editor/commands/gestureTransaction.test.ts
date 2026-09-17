import { describe, expect, it } from "vitest";

import { moveNodeBy } from "@/editor/document/documentOperations";
import { sampleDocument } from "@/editor/document/sampleDocument";
import {
  createSelectionState,
  selectSingleNode,
} from "@/editor/selection/selection";
import {
  createEditorState,
  redoEditorState,
  undoEditorState,
} from "@/editor/state/editorState";

import {
  beginGestureTransaction,
  commitGestureTransaction,
} from "./gestureTransaction";

describe("gesture transactions", () => {
  it("captures the gesture start snapshot", () => {
    const selection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    const transaction = beginGestureTransaction(
      "move",
      "Move selection",
      sampleDocument,
      selection,
    );

    expect(transaction.kind).toBe("move");

    expect(transaction.label).toBe("Move selection");

    expect(transaction.before.document).toBe(sampleDocument);

    expect(transaction.before.selection.selectedNodeIds).toEqual([
      "rectangle-hero",
    ]);
  });

  it("commits one history command for the final gesture result", () => {
    const selection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    const state = createEditorState(sampleDocument, selection);

    const transaction = beginGestureTransaction(
      "move",
      "Move selection",
      state.document,
      state.selection,
    );

    const finalDocument = moveNodeBy(state.document, "rectangle-hero", {
      x: 120,
      y: 40,
    });

    const nextState = commitGestureTransaction(state, {
      transaction,
      nextDocument: finalDocument,
      nextSelection: selection,
    });

    expect(nextState.document).toBe(finalDocument);

    expect(nextState.history.undoStack).toHaveLength(1);

    expect(nextState.history.undoStack[0].kind).toBe("move");

    expect(nextState.history.undoStack[0].label).toBe("Move selection");

    expect(nextState.history.undoStack[0].before.document).toBe(sampleDocument);

    expect(nextState.history.undoStack[0].after.document).toBe(finalDocument);
  });

  it("does not create history for a gesture that made no document change", () => {
    const selection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    const state = createEditorState(sampleDocument, selection);

    const transaction = beginGestureTransaction(
      "move",
      "Move selection",
      state.document,
      state.selection,
    );

    const nextState = commitGestureTransaction(state, {
      transaction,

      nextDocument: state.document,

      nextSelection: state.selection,
    });

    expect(nextState).toBe(state);

    expect(nextState.history.undoStack).toHaveLength(0);
  });

  it("undoes and redoes a completed gesture as one history step", () => {
    const selection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    const state = createEditorState(sampleDocument, selection);

    const transaction = beginGestureTransaction(
      "move",
      "Move selection",
      state.document,
      state.selection,
    );

    const finalDocument = moveNodeBy(state.document, "rectangle-hero", {
      x: 80,
      y: 25,
    });

    const committed = commitGestureTransaction(state, {
      transaction,
      nextDocument: finalDocument,
      nextSelection: selection,
    });

    const undone = undoEditorState(committed);

    expect(undone.document).toBe(sampleDocument);

    expect(undone.history.undoStack).toHaveLength(0);

    expect(undone.history.redoStack).toHaveLength(1);

    const redone = redoEditorState(undone);

    expect(redone.document).toBe(finalDocument);

    expect(redone.history.undoStack).toHaveLength(1);

    expect(redone.history.redoStack).toHaveLength(0);
  });
});
