import { describe, expect, it } from "vitest";

import { dispatchEditorCommand } from "@/editor/commands/dispatch";
import { updateNodeProperty } from "@/editor/document/nodeProperties";
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

describe("node properties history", () => {
  it("commits one property edit as one history command", () => {
    const selection = selectSingleNode(createSelectionState(), "text-title");

    let state = createEditorState(sampleDocument, selection);

    const nextDocument = updateNodeProperty(
      state.document,
      "text-title",
      "width",
      640,
    );

    state = dispatchEditorCommand(state, {
      kind: "update",

      label: "Update width",

      nextDocument,
    });

    expect(state.document.nodes["text-title"].width).toBe(640);

    expect(state.history.undoStack).toHaveLength(1);

    expect(state.history.undoStack[0].kind).toBe("update");

    state = undoEditorState(state);

    expect(state.document.nodes["text-title"].width).toBe(
      sampleDocument.nodes["text-title"].width,
    );

    state = redoEditorState(state);

    expect(state.document.nodes["text-title"].width).toBe(640);
  });

  it("does not create history when the normalized value did not change", () => {
    const selection = selectSingleNode(createSelectionState(), "text-title");

    const state = createEditorState(sampleDocument, selection);

    const nextDocument = updateNodeProperty(
      state.document,
      "text-title",
      "rotation",
      360,
    );

    expect(nextDocument).toBe(state.document);

    const nextState = dispatchEditorCommand(state, {
      kind: "update",

      label: "Update rotation",

      nextDocument,
    });

    expect(nextState).toBe(state);

    expect(nextState.history.undoStack).toHaveLength(0);
  });

  it("restores opacity through undo and redo", () => {
    const selection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    let state = createEditorState(sampleDocument, selection);

    const nextDocument = updateNodeProperty(
      state.document,
      "rectangle-hero",
      "opacity",
      0.35,
    );

    state = dispatchEditorCommand(state, {
      kind: "update",

      label: "Update opacity",

      nextDocument,
    });

    expect(state.document.nodes["rectangle-hero"].opacity).toBe(0.35);

    state = undoEditorState(state);

    expect(state.document.nodes["rectangle-hero"].opacity).toBe(
      sampleDocument.nodes["rectangle-hero"].opacity,
    );

    state = redoEditorState(state);

    expect(state.document.nodes["rectangle-hero"].opacity).toBe(0.35);
  });
});
