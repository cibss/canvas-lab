import { describe, expect, it } from "vitest";

import { deleteNodes, moveNodeBy } from "@/editor/document/documentOperations";
import { sampleDocument } from "@/editor/document/sampleDocument";
import {
  clearSelection,
  type SelectionState,
} from "@/editor/selection/selection";

import {
  createEditorCommand,
  createEditorSnapshot,
  type EditorCommand,
} from "./command";
import {
  canRedo,
  canUndo,
  commitEditorCommand,
  createEditorHistory,
  redoEditorHistory,
  undoEditorHistory,
} from "./history";

const rectangleSelection: SelectionState = {
  selectedNodeIds: ["rectangle-hero"],
};

function createMoveCommand(x: number, y: number): EditorCommand {
  const afterDocument = moveNodeBy(sampleDocument, "rectangle-hero", {
    x,
    y,
  });

  const command = createEditorCommand({
    kind: "move",

    label: "Move Rectangle",

    before: createEditorSnapshot(sampleDocument, rectangleSelection),

    after: createEditorSnapshot(afterDocument, rectangleSelection),
  });

  if (!command) {
    throw new Error("Expected move command.");
  }

  return command;
}

describe("editor history", () => {
  it("starts with empty undo and redo stacks", () => {
    const history = createEditorHistory();

    expect(canUndo(history)).toBe(false);

    expect(canRedo(history)).toBe(false);

    expect(history.undoStack).toEqual([]);

    expect(history.redoStack).toEqual([]);
  });

  it("commits a command to the undo stack", () => {
    const command = createMoveCommand(10, 20);

    const history = commitEditorCommand(createEditorHistory(), command);

    expect(history.undoStack).toEqual([command]);

    expect(canUndo(history)).toBe(true);

    expect(canRedo(history)).toBe(false);
  });

  it("undoes a command and returns its before snapshot", () => {
    const command = createMoveCommand(10, 20);

    const history = commitEditorCommand(createEditorHistory(), command);

    const result = undoEditorHistory(history);

    expect(result.command).toBe(command);

    expect(result.snapshot).toBe(command.before);

    expect(result.history.undoStack).toEqual([]);

    expect(result.history.redoStack).toEqual([command]);
  });

  it("redoes an undone command and returns its after snapshot", () => {
    const command = createMoveCommand(10, 20);

    const committed = commitEditorCommand(createEditorHistory(), command);

    const undone = undoEditorHistory(committed);

    const redone = redoEditorHistory(undone.history);

    expect(redone.command).toBe(command);

    expect(redone.snapshot).toBe(command.after);

    expect(redone.history.undoStack).toEqual([command]);

    expect(redone.history.redoStack).toEqual([]);
  });

  it("returns no snapshot when undo is unavailable", () => {
    const history = createEditorHistory();

    const result = undoEditorHistory(history);

    expect(result.history).toBe(history);

    expect(result.snapshot).toBeNull();

    expect(result.command).toBeNull();
  });

  it("returns no snapshot when redo is unavailable", () => {
    const history = createEditorHistory();

    const result = redoEditorHistory(history);

    expect(result.history).toBe(history);

    expect(result.snapshot).toBeNull();

    expect(result.command).toBeNull();
  });

  it("preserves undo and redo order across multiple commands", () => {
    const moveRight = createMoveCommand(10, 0);

    const moveDown = createMoveCommand(0, 20);

    let history = createEditorHistory();

    history = commitEditorCommand(history, moveRight);

    history = commitEditorCommand(history, moveDown);

    const undoMoveDown = undoEditorHistory(history);

    expect(undoMoveDown.command).toBe(moveDown);

    const undoMoveRight = undoEditorHistory(undoMoveDown.history);

    expect(undoMoveRight.command).toBe(moveRight);

    const redoMoveRight = redoEditorHistory(undoMoveRight.history);

    expect(redoMoveRight.command).toBe(moveRight);

    const redoMoveDown = redoEditorHistory(redoMoveRight.history);

    expect(redoMoveDown.command).toBe(moveDown);
  });

  it("clears redo history after a new command is committed", () => {
    const firstCommand = createMoveCommand(10, 0);

    const secondCommand = createMoveCommand(20, 0);

    let history = commitEditorCommand(createEditorHistory(), firstCommand);

    history = undoEditorHistory(history).history;

    expect(canRedo(history)).toBe(true);

    history = commitEditorCommand(history, secondCommand);

    expect(canRedo(history)).toBe(false);

    expect(history.redoStack).toEqual([]);
  });

  it("restores the selection associated with a deleted node", () => {
    const afterDocument = deleteNodes(sampleDocument, ["rectangle-hero"]);

    const afterSelection = clearSelection(rectangleSelection);

    const command = createEditorCommand({
      kind: "delete",

      label: "Delete Rectangle",

      before: createEditorSnapshot(sampleDocument, rectangleSelection),

      after: createEditorSnapshot(afterDocument, afterSelection),
    });

    expect(command).not.toBeNull();

    if (!command) {
      return;
    }

    const history = commitEditorCommand(createEditorHistory(), command);

    const undo = undoEditorHistory(history);

    expect(undo.snapshot?.document.nodes["rectangle-hero"]).toBeDefined();

    expect(undo.snapshot?.selection.selectedNodeIds).toEqual([
      "rectangle-hero",
    ]);
  });

  it("enforces the configured history limit", () => {
    const first = createMoveCommand(10, 0);

    const second = createMoveCommand(20, 0);

    const third = createMoveCommand(30, 0);

    let history = createEditorHistory(2);

    history = commitEditorCommand(history, first);

    history = commitEditorCommand(history, second);

    history = commitEditorCommand(history, third);

    expect(history.undoStack).toEqual([second, third]);

    expect(history.undoStack).toHaveLength(2);
  });

  it("normalizes invalid history limits", () => {
    const history = createEditorHistory(0);

    expect(history.limit).toBe(1);
  });
});
