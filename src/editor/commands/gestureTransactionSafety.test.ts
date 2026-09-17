import { describe, expect, it } from "vitest";

import { dispatchEditorCommand } from "@/editor/commands/dispatch";
import { moveNodeBy } from "@/editor/document/documentOperations";
import { sampleDocument } from "@/editor/document/sampleDocument";
import {
  createSelectionState,
  selectSingleNode,
} from "@/editor/selection/selection";
import {
  createEditorState,
  setEditorSelection,
} from "@/editor/state/editorState";

import {
  beginGestureTransaction,
  commitGestureTransaction,
} from "./gestureTransaction";

describe("gesture transaction safety", () => {
  it("rejects a gesture commit when the document changed after the gesture started", () => {
    const selection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    const initialState = createEditorState(sampleDocument, selection);

    const transaction = beginGestureTransaction(
      "move",
      "Move selection",
      initialState.document,
      initialState.selection,
    );

    const concurrentDocument = moveNodeBy(
      initialState.document,
      "rectangle-hero",
      {
        x: 10,
        y: 0,
      },
    );

    const concurrentState = dispatchEditorCommand(initialState, {
      kind: "move",

      label: "Concurrent move",

      nextDocument: concurrentDocument,
    });

    const gestureDocument = moveNodeBy(
      initialState.document,
      "rectangle-hero",
      {
        x: 100,
        y: 0,
      },
    );

    const result = commitGestureTransaction(concurrentState, {
      transaction,

      nextDocument: gestureDocument,

      nextSelection: selection,
    });

    expect(result).toBe(concurrentState);

    expect(result.document).toBe(concurrentDocument);
  });

  it("rejects a gesture commit when the selection changed after the gesture started", () => {
    const rectangleSelection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    const initialState = createEditorState(sampleDocument, rectangleSelection);

    const transaction = beginGestureTransaction(
      "move",
      "Move selection",
      initialState.document,
      initialState.selection,
    );

    const textSelection = selectSingleNode(rectangleSelection, "text-title");

    const selectionChangedState = setEditorSelection(
      initialState,
      textSelection,
    );

    const gestureDocument = moveNodeBy(
      initialState.document,
      "rectangle-hero",
      {
        x: 100,
        y: 0,
      },
    );

    const result = commitGestureTransaction(selectionChangedState, {
      transaction,

      nextDocument: gestureDocument,

      nextSelection: rectangleSelection,
    });

    expect(result).toBe(selectionChangedState);

    expect(result.selection.selectedNodeIds).toEqual(["text-title"]);
  });
});
