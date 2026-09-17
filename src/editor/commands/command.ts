import type { EditorDocument } from "@/editor/document/types";
import type { SelectionState } from "@/editor/selection/selection";

export type EditorCommandKind =
  | "move"
  | "resize"
  | "rotate"
  | "delete"
  | "update";

export interface EditorSnapshot {
  document: EditorDocument;

  selection: SelectionState;
}

export interface EditorCommand {
  kind: EditorCommandKind;

  label: string;

  before: EditorSnapshot;

  after: EditorSnapshot;
}

export interface CreateEditorCommandInput {
  kind: EditorCommandKind;

  label: string;

  before: EditorSnapshot;

  after: EditorSnapshot;
}

export function createEditorSnapshot(
  document: EditorDocument,
  selection: SelectionState,
): EditorSnapshot {
  return {
    document,

    selection: {
      selectedNodeIds: [...selection.selectedNodeIds],
    },
  };
}

export function createEditorCommand(
  input: CreateEditorCommandInput,
): EditorCommand | null {
  if (input.before.document === input.after.document) {
    return null;
  }

  return {
    kind: input.kind,

    label: input.label,

    before: input.before,

    after: input.after,
  };
}
