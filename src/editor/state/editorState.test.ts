import { describe, expect, it } from "vitest";

import {
  createEditorCommand,
  createEditorSnapshot,
} from "@/editor/commands/command";
import { commitEditorCommand } from "@/editor/commands/history";
import { moveNodeBy } from "@/editor/document/documentOperations";
import { sampleDocument } from "@/editor/document/sampleDocument";
import {
  createSelectionState,
  selectSingleNode,
} from "@/editor/selection/selection";

import {
  createEditorState,
  redoEditorState,
  replaceEditorDocument,
  setEditorSelection,
  undoEditorState,
} from "./editorState";

describe("editor state", () => {
  it("creates centralized document, selection, and history state", () => {
    const state = createEditorState(sampleDocument);

    expect(state.document).toBe(sampleDocument);
    expect(state.selection).toEqual(createSelectionState());
    expect(state.history.undoStack).toEqual([]);
    expect(state.history.redoStack).toEqual([]);
  });

  it("updates selection without creating history", () => {
    const initialState = createEditorState(sampleDocument);

    const nextSelection = selectSingleNode(
      initialState.selection,
      "rectangle-hero",
    );

    const nextState = setEditorSelection(initialState, nextSelection);

    expect(nextState.selection.selectedNodeIds).toEqual(["rectangle-hero"]);
    expect(nextState.history).toBe(initialState.history);
  });

  it("replaces an untracked document without creating history", () => {
    const initialState = createEditorState(sampleDocument);

    const movedDocument = moveNodeBy(sampleDocument, "rectangle-hero", {
      x: 10,
      y: 0,
    });

    const nextState = replaceEditorDocument(initialState, movedDocument);

    expect(nextState.document).toBe(movedDocument);
    expect(nextState.history).toBe(initialState.history);
  });

  it("applies undo and redo snapshots to editor state", () => {
    const selection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    const movedDocument = moveNodeBy(sampleDocument, "rectangle-hero", {
      x: 10,
      y: 0,
    });

    const command = createEditorCommand({
      kind: "move",
      label: "Move Rectangle",
      before: createEditorSnapshot(sampleDocument, selection),
      after: createEditorSnapshot(movedDocument, selection),
    });

    expect(command).not.toBeNull();

    if (!command) {
      return;
    }

    const state = createEditorState(
      movedDocument,
      selection,
      commitEditorCommand(createEditorState(sampleDocument).history, command),
    );

    const undone = undoEditorState(state);

    expect(undone.document).toBe(sampleDocument);
    expect(undone.selection.selectedNodeIds).toEqual(["rectangle-hero"]);

    const redone = redoEditorState(undone);

    expect(redone.document).toBe(movedDocument);
    expect(redone.selection.selectedNodeIds).toEqual(["rectangle-hero"]);
  });
});
