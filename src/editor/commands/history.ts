import type { EditorCommand, EditorSnapshot } from "./command";

export const DEFAULT_HISTORY_LIMIT = 100;

export const DEFAULT_HISTORY_COALESCE_WINDOW_MS = 500;

export interface HistoryCoalescingState {
  key: string;
  committedAt: number;
}

export interface CommitEditorCommandOptions {
  coalesceKey?: string;

  committedAt?: number;

  coalesceWindowMs?: number;
}

export interface EditorHistory {
  undoStack: EditorCommand[];

  redoStack: EditorCommand[];

  limit: number;

  coalescing: HistoryCoalescingState | null;
}

export interface HistoryStepResult {
  history: EditorHistory;

  snapshot: EditorSnapshot | null;

  command: EditorCommand | null;
}

function areSnapshotsSelectionsEqual(
  left: EditorSnapshot,
  right: EditorSnapshot,
): boolean {
  const leftIds = left.selection.selectedNodeIds;

  const rightIds = right.selection.selectedNodeIds;

  if (leftIds.length !== rightIds.length) {
    return false;
  }

  return leftIds.every((nodeId, index) => nodeId === rightIds[index]);
}

function normalizeCommittedAt(committedAt: number | undefined): number {
  if (committedAt !== undefined && Number.isFinite(committedAt)) {
    return committedAt;
  }

  return Date.now();
}

function normalizeCoalesceWindow(windowMs: number | undefined): number {
  if (windowMs === undefined || !Number.isFinite(windowMs)) {
    return DEFAULT_HISTORY_COALESCE_WINDOW_MS;
  }

  return Math.max(0, windowMs);
}

function getCoalesceKey(key: string | undefined): string | null {
  if (!key) {
    return null;
  }

  const normalized = key.trim();

  return normalized.length > 0 ? normalized : null;
}

export function createEditorHistory(
  limit = DEFAULT_HISTORY_LIMIT,
): EditorHistory {
  const normalizedLimit = Math.max(1, Math.floor(limit));

  return {
    undoStack: [],

    redoStack: [],

    limit: normalizedLimit,

    coalescing: null,
  };
}

export function canUndo(history: EditorHistory): boolean {
  return history.undoStack.length > 0;
}

export function canRedo(history: EditorHistory): boolean {
  return history.redoStack.length > 0;
}

export function breakEditorHistoryCoalescing(
  history: EditorHistory,
): EditorHistory {
  if (history.coalescing === null) {
    return history;
  }

  return {
    ...history,

    coalescing: null,
  };
}

export function commitEditorCommand(
  history: EditorHistory,
  command: EditorCommand,
  options: CommitEditorCommandOptions = {},
): EditorHistory {
  const coalesceKey = getCoalesceKey(options.coalesceKey);

  const committedAt = normalizeCommittedAt(options.committedAt);

  const coalesceWindowMs = normalizeCoalesceWindow(options.coalesceWindowMs);

  const previousCommand = history.undoStack[history.undoStack.length - 1];

  const previousCoalescing = history.coalescing;

  const elapsed = previousCoalescing
    ? committedAt - previousCoalescing.committedAt
    : Number.POSITIVE_INFINITY;

  const canCoalesce =
    coalesceKey !== null &&
    previousCommand !== undefined &&
    previousCoalescing !== null &&
    previousCoalescing.key === coalesceKey &&
    history.redoStack.length === 0 &&
    elapsed >= 0 &&
    elapsed <= coalesceWindowMs &&
    previousCommand.kind === command.kind &&
    previousCommand.label === command.label &&
    previousCommand.after.document === command.before.document &&
    areSnapshotsSelectionsEqual(previousCommand.after, command.before);

  if (canCoalesce) {
    const mergedCommand: EditorCommand = {
      ...command,

      before: previousCommand.before,
    };

    return {
      ...history,

      undoStack: [...history.undoStack.slice(0, -1), mergedCommand],

      redoStack: [],

      coalescing: {
        key: coalesceKey,

        committedAt,
      },
    };
  }

  const undoStack = [...history.undoStack, command];

  const limitedUndoStack =
    undoStack.length > history.limit
      ? undoStack.slice(-history.limit)
      : undoStack;

  return {
    ...history,

    undoStack: limitedUndoStack,

    redoStack: [],

    coalescing: coalesceKey
      ? {
          key: coalesceKey,

          committedAt,
        }
      : null,
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

      coalescing: null,
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

      coalescing: null,
    },

    snapshot: command.after,

    command,
  };
}
