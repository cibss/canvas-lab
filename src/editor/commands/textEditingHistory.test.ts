import { describe, expect, it } from "vitest";

import {
  createTextNodeId,
  insertRootText,
  updateTextNodeContent,
} from "@/editor/document/textEditing";
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

describe("text editing history", () => {
  it("creates text as one undoable command", () => {
    let state = createEditorState(sampleDocument, createSelectionState());

    const transaction = beginGestureTransaction(
      "create",
      "Create Text",
      state.document,
      state.selection,
    );

    const nodeId = createTextNodeId(state.document);

    let nextDocument = insertRootText(state.document, nodeId, {
      x: 400,
      y: 300,
    });

    nextDocument = updateTextNodeContent(
      nextDocument,
      nodeId,
      "Hello CanvasLab",
    );

    const nextSelection = selectSingleNode(state.selection, nodeId);

    state = commitGestureTransaction(state, {
      transaction,

      nextDocument,

      nextSelection,
    });

    expect(state.history.undoStack).toHaveLength(1);

    expect(state.history.undoStack[0].kind).toBe("create");

    expect(state.document.nodes[nodeId]).toBeDefined();

    state = undoEditorState(state);

    expect(state.document).toBe(sampleDocument);

    expect(state.document.nodes[nodeId]).toBeUndefined();

    state = redoEditorState(state);

    const redoneNode = state.document.nodes[nodeId];

    expect(redoneNode.type).toBe("text");

    if (redoneNode.type !== "text") {
      return;
    }

    expect(redoneNode.content).toBe("Hello CanvasLab");
  });

  it("edits existing text as one undoable command", () => {
    const selection = selectSingleNode(createSelectionState(), "text-title");

    let state = createEditorState(sampleDocument, selection);

    const originalNode = state.document.nodes["text-title"];

    expect(originalNode.type).toBe("text");

    if (originalNode.type !== "text") {
      return;
    }

    const originalContent = originalNode.content;

    const transaction = beginGestureTransaction(
      "update",
      "Edit Text",
      state.document,
      state.selection,
    );

    const editedDocument = updateTextNodeContent(
      state.document,
      "text-title",
      "Edited from CanvasLab",
    );

    state = commitGestureTransaction(state, {
      transaction,

      nextDocument: editedDocument,

      nextSelection: selection,
    });

    expect(state.history.undoStack).toHaveLength(1);

    expect(state.history.undoStack[0].kind).toBe("update");

    state = undoEditorState(state);

    const undoneNode = state.document.nodes["text-title"];

    expect(undoneNode.type).toBe("text");

    if (undoneNode.type !== "text") {
      return;
    }

    expect(undoneNode.content).toBe(originalContent);

    state = redoEditorState(state);

    const redoneNode = state.document.nodes["text-title"];

    expect(redoneNode.type).toBe("text");

    if (redoneNode.type !== "text") {
      return;
    }

    expect(redoneNode.content).toBe("Edited from CanvasLab");
  });
});
