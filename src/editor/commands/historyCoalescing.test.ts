import { describe, expect, it } from "vitest";

import {
  createEditorCommand,
  createEditorSnapshot,
  type EditorCommand,
} from "@/editor/commands/command";
import { deleteNodes, moveNodeBy } from "@/editor/document/documentOperations";
import { sampleDocument } from "@/editor/document/sampleDocument";
import type { EditorDocument } from "@/editor/document/types";
import type { SelectionState } from "@/editor/selection/selection";

import {
  breakEditorHistoryCoalescing,
  commitEditorCommand,
  createEditorHistory,
  undoEditorHistory,
} from "./history";

const selection: SelectionState = {
  selectedNodeIds: ["rectangle-hero"],
};

function createMoveCommand(
  beforeDocument: EditorDocument,

  deltaX: number,
): {
  command: EditorCommand;

  afterDocument: EditorDocument;
} {
  const afterDocument = moveNodeBy(beforeDocument, "rectangle-hero", {
    x: deltaX,
    y: 0,
  });

  const command = createEditorCommand({
    kind: "move",

    label: "Nudge selection",

    before: createEditorSnapshot(beforeDocument, selection),

    after: createEditorSnapshot(afterDocument, selection),
  });

  if (!command) {
    throw new Error("Expected move command.");
  }

  return {
    command,
    afterDocument,
  };
}

describe("history coalescing", () => {
  it("merges contiguous commands with the same coalescing key", () => {
    const first = createMoveCommand(sampleDocument, 1);

    const second = createMoveCommand(first.afterDocument, 1);

    let history = createEditorHistory();

    history = commitEditorCommand(history, first.command, {
      coalesceKey: "keyboard-nudge",

      committedAt: 1000,
    });

    history = commitEditorCommand(history, second.command, {
      coalesceKey: "keyboard-nudge",

      committedAt: 1100,
    });

    expect(history.undoStack).toHaveLength(1);

    const merged = history.undoStack[0];

    expect(merged.before.document).toBe(sampleDocument);

    expect(merged.after.document).toBe(second.afterDocument);
  });

  it("does not merge commands outside the coalescing window", () => {
    const first = createMoveCommand(sampleDocument, 1);

    const second = createMoveCommand(first.afterDocument, 1);

    let history = createEditorHistory();

    history = commitEditorCommand(history, first.command, {
      coalesceKey: "keyboard-nudge",

      committedAt: 1000,

      coalesceWindowMs: 500,
    });

    history = commitEditorCommand(history, second.command, {
      coalesceKey: "keyboard-nudge",

      committedAt: 1501,

      coalesceWindowMs: 500,
    });

    expect(history.undoStack).toHaveLength(2);
  });

  it("does not merge after an explicit coalescing barrier", () => {
    const first = createMoveCommand(sampleDocument, 1);

    const second = createMoveCommand(first.afterDocument, 1);

    let history = createEditorHistory();

    history = commitEditorCommand(history, first.command, {
      coalesceKey: "keyboard-nudge",

      committedAt: 1000,
    });

    history = breakEditorHistoryCoalescing(history);

    history = commitEditorCommand(history, second.command, {
      coalesceKey: "keyboard-nudge",

      committedAt: 1100,
    });

    expect(history.undoStack).toHaveLength(2);
  });

  it("does not merge across an undo branch", () => {
    const first = createMoveCommand(sampleDocument, 1);

    const deletedDocument = deleteNodes(first.afterDocument, ["text-title"]);

    const deleteCommand = createEditorCommand({
      kind: "delete",

      label: "Delete selection",

      before: createEditorSnapshot(first.afterDocument, selection),

      after: createEditorSnapshot(deletedDocument, selection),
    });

    if (!deleteCommand) {
      throw new Error("Expected delete command.");
    }

    let history = createEditorHistory();

    history = commitEditorCommand(history, first.command, {
      coalesceKey: "keyboard-nudge",

      committedAt: 1000,
    });

    history = commitEditorCommand(history, deleteCommand);

    history = undoEditorHistory(history).history;

    const second = createMoveCommand(first.afterDocument, 1);

    history = commitEditorCommand(history, second.command, {
      coalesceKey: "keyboard-nudge",

      committedAt: 1100,
    });

    expect(history.undoStack).toHaveLength(2);

    expect(history.redoStack).toEqual([]);
  });
});
