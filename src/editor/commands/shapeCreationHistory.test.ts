import { describe, expect, it } from "vitest";

import {
  createShapeNodeId,
  insertRootShape,
} from "@/editor/document/shapeCreation";
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

describe("shape creation history", () => {
  it("creates, undoes, and redoes a shape as one command", () => {
    let state = createEditorState(sampleDocument, createSelectionState());

    const transaction = beginGestureTransaction(
      "create",
      "Create Rectangle",
      state.document,
      state.selection,
    );

    const nodeId = createShapeNodeId(state.document, "rectangle");

    const nextDocument = insertRootShape(state.document, "rectangle", nodeId, {
      x: 400,
      y: 300,

      width: 200,
      height: 120,
    });

    const nextSelection = selectSingleNode(state.selection, nodeId);

    state = commitGestureTransaction(state, {
      transaction,

      nextDocument,

      nextSelection,
    });

    expect(state.document.nodes[nodeId]).toBeDefined();

    expect(state.selection.selectedNodeIds).toEqual([nodeId]);

    expect(state.history.undoStack).toHaveLength(1);

    expect(state.history.undoStack[0].kind).toBe("create");

    state = undoEditorState(state);

    expect(state.document).toBe(sampleDocument);

    expect(state.selection.selectedNodeIds).toEqual([]);

    state = redoEditorState(state);

    expect(state.document.nodes[nodeId]).toBeDefined();

    expect(state.selection.selectedNodeIds).toEqual([nodeId]);
  });
});
