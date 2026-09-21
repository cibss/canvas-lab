import type { EditorDocument, NodeId } from "@/editor/document/types";
import type { SelectionState } from "@/editor/selection/selection";
import type { EditorTool } from "@/editor/tools/editorTool";

export type TextEditorExitReason =
  | "keyboard-commit"
  | "keyboard-cancel"
  | "canvas-pointer"
  | "blur"
  | "window-blur";

export function shouldRestoreCanvasFocus(
  reason: TextEditorExitReason,
): boolean {
  return (
    reason === "keyboard-commit" ||
    reason === "keyboard-cancel" ||
    reason === "canvas-pointer"
  );
}

export function getKeyboardEditableTextNodeId(
  document: EditorDocument,
  selection: SelectionState,
  activeTool: EditorTool,
): NodeId | null {
  if (activeTool !== "select" || selection.selectedNodeIds.length !== 1) {
    return null;
  }

  const nodeId = selection.selectedNodeIds[0];

  const node = document.nodes[nodeId];

  if (!node || node.type !== "text" || !node.visible || node.locked) {
    return null;
  }

  return nodeId;
}
