import {
  createEditorCommand,
  createEditorSnapshot,
  type EditorCommandKind,
  type EditorSnapshot,
} from "@/editor/commands/command";
import { commitEditorCommand } from "@/editor/commands/history";
import type { EditorDocument } from "@/editor/document/types";
import type { SelectionState } from "@/editor/selection/selection";
import type { EditorState } from "@/editor/state/editorState";

export type GestureCommandKind = Extract<
  EditorCommandKind,
  "move" | "resize" | "rotate"
>;

export interface GestureTransaction {
  kind: GestureCommandKind;

  label: string;

  before: EditorSnapshot;
}

export interface GestureTransactionCommit {
  transaction: GestureTransaction;

  nextDocument: EditorDocument;

  nextSelection: SelectionState;
}

function areSelectionsEqual(
  left: SelectionState,

  right: SelectionState,
): boolean {
  if (left.selectedNodeIds.length !== right.selectedNodeIds.length) {
    return false;
  }

  return left.selectedNodeIds.every(
    (nodeId, index) => nodeId === right.selectedNodeIds[index],
  );
}

function isTransactionStillCurrent(
  state: EditorState,

  transaction: GestureTransaction,
): boolean {
  return (
    state.document === transaction.before.document &&
    areSelectionsEqual(state.selection, transaction.before.selection)
  );
}

export function beginGestureTransaction(
  kind: GestureCommandKind,

  label: string,

  document: EditorDocument,

  selection: SelectionState,
): GestureTransaction {
  return {
    kind,

    label,

    before: createEditorSnapshot(document, selection),
  };
}

export function commitGestureTransaction(
  state: EditorState,

  input: GestureTransactionCommit,
): EditorState {
  if (!isTransactionStillCurrent(state, input.transaction)) {
    return state;
  }

  const command = createEditorCommand({
    kind: input.transaction.kind,

    label: input.transaction.label,

    before: input.transaction.before,

    after: createEditorSnapshot(input.nextDocument, input.nextSelection),
  });

  if (!command) {
    if (
      state.document === input.nextDocument &&
      areSelectionsEqual(state.selection, input.nextSelection)
    ) {
      return state;
    }

    return {
      ...state,

      document: input.nextDocument,

      selection: {
        selectedNodeIds: [...input.nextSelection.selectedNodeIds],
      },
    };
  }

  return {
    document: command.after.document,

    selection: command.after.selection,

    history: commitEditorCommand(state.history, command),
  };
}
