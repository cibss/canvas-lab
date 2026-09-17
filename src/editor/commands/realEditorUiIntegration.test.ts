import { describe, expect, it } from "vitest";

import { dispatchEditorCommand } from "@/editor/commands/dispatch";
import {
  beginGestureTransaction,
  commitGestureTransaction,
} from "@/editor/commands/gestureTransaction";
import {
  setNodeVisibility,
  updateNodeName,
} from "@/editor/document/nodeMetadata";
import { updateNodeProperty } from "@/editor/document/nodeProperties";
import {
  createShapeNodeId,
  insertRootShape,
} from "@/editor/document/shapeCreation";
import { sampleDocument } from "@/editor/document/sampleDocument";
import {
  createTextNodeId,
  insertRootText,
  updateTextNodeContent,
} from "@/editor/document/textEditing";
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

describe("real editor UI integration", () => {
  it("supports a complete shape editing lifecycle through history", () => {
    const initialSelection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    let state = createEditorState(sampleDocument, initialSelection);

    /*
     * CREATE
     */
    const createTransaction = beginGestureTransaction(
      "create",
      "Create Rectangle",
      state.document,
      state.selection,
    );

    const nodeId = createShapeNodeId(state.document, "rectangle");

    const createdDocument = insertRootShape(
      state.document,
      "rectangle",
      nodeId,
      {
        x: 400,
        y: 300,
        width: 160,
        height: 100,
      },
    );

    const createdSelection = selectSingleNode(state.selection, nodeId);

    state = commitGestureTransaction(state, {
      transaction: createTransaction,

      nextDocument: createdDocument,

      nextSelection: createdSelection,
    });

    expect(state.document.nodes[nodeId]).toBeDefined();

    expect(state.selection.selectedNodeIds).toEqual([nodeId]);

    /*
     * PROPERTY EDIT
     */
    const resizedDocument = updateNodeProperty(
      state.document,
      nodeId,
      "width",
      420,
    );

    state = dispatchEditorCommand(state, {
      kind: "update",

      label: "Update width",

      nextDocument: resizedDocument,
    });

    expect(state.document.nodes[nodeId].width).toBe(420);

    /*
     * RENAME
     */
    const originalName = state.document.nodes[nodeId].name;

    const renamedDocument = updateNodeName(
      state.document,
      nodeId,
      "Portfolio Card",
    );

    state = dispatchEditorCommand(state, {
      kind: "update",

      label: "Rename object",

      nextDocument: renamedDocument,
    });

    expect(state.document.nodes[nodeId].name).toBe("Portfolio Card");

    /*
     * HIDE
     */
    const hiddenDocument = setNodeVisibility(state.document, nodeId, false);

    const hiddenSelection = removeNodeSubtreeFromSelection(
      state.document,
      state.selection,
      nodeId,
    );

    state = dispatchEditorCommand(state, {
      kind: "update",

      label: "Hide object",

      nextDocument: hiddenDocument,

      nextSelection: hiddenSelection,
    });

    expect(state.document.nodes[nodeId].visible).toBe(false);

    expect(state.selection.selectedNodeIds).toEqual([]);

    expect(state.history.undoStack).toHaveLength(4);

    /*
     * UNDO HIDE
     */
    state = undoEditorState(state);

    expect(state.document.nodes[nodeId].visible).toBe(true);

    expect(state.selection.selectedNodeIds).toEqual([nodeId]);

    /*
     * UNDO RENAME
     */
    state = undoEditorState(state);

    expect(state.document.nodes[nodeId].name).toBe(originalName);

    /*
     * UNDO PROPERTY EDIT
     */
    state = undoEditorState(state);

    expect(state.document.nodes[nodeId].width).toBe(160);

    /*
     * UNDO CREATION
     */
    state = undoEditorState(state);

    expect(state.document.nodes[nodeId]).toBeUndefined();

    expect(state.selection.selectedNodeIds).toEqual(["rectangle-hero"]);

    /*
     * REDO ENTIRE TIMELINE
     */
    state = redoEditorState(state);

    state = redoEditorState(state);

    state = redoEditorState(state);

    state = redoEditorState(state);

    expect(state.document.nodes[nodeId].width).toBe(420);

    expect(state.document.nodes[nodeId].name).toBe("Portfolio Card");

    expect(state.document.nodes[nodeId].visible).toBe(false);

    expect(state.selection.selectedNodeIds).toEqual([]);

    expect(state.history.redoStack).toEqual([]);
  });

  it("supports text creation and editing as separate history actions", () => {
    let state = createEditorState(sampleDocument, createSelectionState());

    /*
     * CREATE TEXT
     */
    const createTransaction = beginGestureTransaction(
      "create",
      "Create Text",
      state.document,
      state.selection,
    );

    const nodeId = createTextNodeId(state.document);

    let createdDocument = insertRootText(state.document, nodeId, {
      x: 500,
      y: 350,
    });

    createdDocument = updateTextNodeContent(createdDocument, nodeId, "Hello");

    const selection = selectSingleNode(state.selection, nodeId);

    state = commitGestureTransaction(state, {
      transaction: createTransaction,

      nextDocument: createdDocument,

      nextSelection: selection,
    });

    /*
     * EDIT TEXT
     */
    const editTransaction = beginGestureTransaction(
      "update",
      "Edit Text",
      state.document,
      state.selection,
    );

    const editedDocument = updateTextNodeContent(
      state.document,
      nodeId,
      "Hello CanvasLab",
    );

    state = commitGestureTransaction(state, {
      transaction: editTransaction,

      nextDocument: editedDocument,

      nextSelection: state.selection,
    });

    const editedNode = state.document.nodes[nodeId];

    expect(editedNode.type).toBe("text");

    if (editedNode.type !== "text") {
      return;
    }

    expect(editedNode.content).toBe("Hello CanvasLab");

    expect(state.history.undoStack).toHaveLength(2);

    /*
     * UNDO EDIT
     */
    state = undoEditorState(state);

    const originalText = state.document.nodes[nodeId];

    expect(originalText.type).toBe("text");

    if (originalText.type !== "text") {
      return;
    }

    expect(originalText.content).toBe("Hello");

    /*
     * UNDO CREATE
     */
    state = undoEditorState(state);

    expect(state.document.nodes[nodeId]).toBeUndefined();

    /*
     * REDO CREATE + EDIT
     */
    state = redoEditorState(state);

    state = redoEditorState(state);

    const finalNode = state.document.nodes[nodeId];

    expect(finalNode.type).toBe("text");

    if (finalNode.type !== "text") {
      return;
    }

    expect(finalNode.content).toBe("Hello CanvasLab");
  });
});
