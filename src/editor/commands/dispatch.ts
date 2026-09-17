import {
  createEditorCommand,
  createEditorSnapshot,
  type EditorCommandKind,
} from "@/editor/commands/command";
import {
  commitEditorCommand,
  type CommitEditorCommandOptions,
} from "@/editor/commands/history";
import type { EditorDocument } from "@/editor/document/types";
import type { SelectionState } from "@/editor/selection/selection";
import type { EditorState } from "@/editor/state/editorState";

export interface DispatchCommandCoalescing {
  key: string;

  committedAt?: number;

  windowMs?: number;
}

export interface DispatchEditorCommandInput {
  kind: EditorCommandKind;

  label: string;

  nextDocument: EditorDocument;

  nextSelection?: SelectionState;

  coalesce?: DispatchCommandCoalescing;
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

function createCommitOptions(
  input: DispatchEditorCommandInput,
): CommitEditorCommandOptions {
  if (!input.coalesce) {
    return {};
  }

  return {
    coalesceKey: input.coalesce.key,

    committedAt: input.coalesce.committedAt,

    coalesceWindowMs: input.coalesce.windowMs,
  };
}

export function dispatchEditorCommand(
  state: EditorState,
  input: DispatchEditorCommandInput,
): EditorState {
  const nextSelection = input.nextSelection ?? state.selection;

  const command = createEditorCommand({
    kind: input.kind,

    label: input.label,

    before: createEditorSnapshot(state.document, state.selection),

    after: createEditorSnapshot(input.nextDocument, nextSelection),
  });

  if (!command) {
    if (
      state.document === input.nextDocument &&
      areSelectionsEqual(state.selection, nextSelection)
    ) {
      return state;
    }

    return {
      ...state,

      document: input.nextDocument,

      selection: {
        selectedNodeIds: [...nextSelection.selectedNodeIds],
      },
    };
  }

  return {
    document: command.after.document,

    selection: command.after.selection,

    history: commitEditorCommand(
      state.history,
      command,
      createCommitOptions(input),
    ),
  };
}
