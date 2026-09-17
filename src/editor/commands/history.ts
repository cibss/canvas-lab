import type { EditorCommand, EditorSnapshot } from "./command";

export const DEFAULT_HISTORY_LIMIT = 100;

export interface EditorHistory {
  undoStack: EditorCommand[];

  redoStack: EditorCommand[];

  limit: number;
}

export interface HistoryStepResult {
  history: EditorHistory;

  snapshot: EditorSnapshot | null;

  command: EditorCommand | null;
}

export function createEditorHistory(
  limit = DEFAULT_HISTORY_LIMIT,
): EditorHistory {
  const normalizedLimit = Math.max(1, Math.floor(limit));

  return {
    undoStack: [],
    redoStack: [],

    limit: normalizedLimit,
  };
}

export function canUndo(history: EditorHistory): boolean {
  return history.undoStack.length > 0;
}

export function canRedo(history: EditorHistory): boolean {
  return history.redoStack.length > 0;
}

export function commitEditorCommand(
  history: EditorHistory,
  command: EditorCommand,
): EditorHistory {
  const undoStack = [...history.undoStack, command];

  const limitedUndoStack =
    undoStack.length > history.limit
      ? undoStack.slice(-history.limit)
      : undoStack;

  return {
    ...history,

    undoStack: limitedUndoStack,

    redoStack: [],
  };
}

export function undoEditorHistory(history: EditorHistory): HistoryStepResult {
  if (!canUndo(history)) {
    return {
      history,

      snapshot: null,

      command: null,
    };
  }

  const command = history.undoStack[history.undoStack.length - 1];

  const nextUndoStack = history.undoStack.slice(0, -1);

  const nextRedoStack = [...history.redoStack, command];

  return {
    history: {
      ...history,

      undoStack: nextUndoStack,

      redoStack: nextRedoStack,
    },

    snapshot: command.before,

    command,
  };
}

export function redoEditorHistory(history: EditorHistory): HistoryStepResult {
  if (!canRedo(history)) {
    return {
      history,

      snapshot: null,

      command: null,
    };
  }

  const command = history.redoStack[history.redoStack.length - 1];

  const nextRedoStack = history.redoStack.slice(0, -1);

  const nextUndoStack = [...history.undoStack, command];

  return {
    history: {
      ...history,

      undoStack: nextUndoStack,

      redoStack: nextRedoStack,
    },

    snapshot: command.after,

    command,
  };
}
