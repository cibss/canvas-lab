import type { EditorSnapshot } from "@/editor/commands/command";
import {
  createEditorHistory,
  redoEditorHistory,
  undoEditorHistory,
  type EditorHistory,
} from "@/editor/commands/history";
import type { EditorDocument } from "@/editor/document/types";
import {
  createSelectionState,
  type SelectionState,
} from "@/editor/selection/selection";

export interface EditorState {
  document: EditorDocument;
  selection: SelectionState;
  history: EditorHistory;
}

function cloneSelection(selection: SelectionState): SelectionState {
  return {
    selectedNodeIds: [...selection.selectedNodeIds],
  };
}

export function createEditorState(
  document: EditorDocument,
  selection: SelectionState = createSelectionState(),
  history: EditorHistory = createEditorHistory(),
): EditorState {
  return {
    document,
    selection: cloneSelection(selection),
    history,
  };
}

export function setEditorSelection(
  state: EditorState,
  selection: SelectionState,
): EditorState {
  if (state.selection === selection) {
    return state;
  }

  return {
    ...state,
    selection: cloneSelection(selection),
  };
}

export function replaceEditorDocument(
  state: EditorState,
  document: EditorDocument,
): EditorState {
  if (state.document === document) {
    return state;
  }

  return {
    ...state,
    document,
  };
}

export function applyEditorSnapshot(
  state: EditorState,
  snapshot: EditorSnapshot,
): EditorState {
  return {
    ...state,
    document: snapshot.document,
    selection: cloneSelection(snapshot.selection),
  };
}

export function undoEditorState(state: EditorState): EditorState {
  const result = undoEditorHistory(state.history);

  if (!result.snapshot) {
    return state;
  }

  return {
    document: result.snapshot.document,
    selection: cloneSelection(result.snapshot.selection),
    history: result.history,
  };
}

export function redoEditorState(state: EditorState): EditorState {
  const result = redoEditorHistory(state.history);

  if (!result.snapshot) {
    return state;
  }

  return {
    document: result.snapshot.document,
    selection: cloneSelection(result.snapshot.selection),
    history: result.history,
  };
}
