import { EDITOR_TOOL_DEFINITIONS, type EditorTool } from "./editorTool";

export interface EditorToolShortcutInput {
  key: string;

  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export function getEditorToolFromShortcut(
  input: EditorToolShortcutInput,
): EditorTool | null {
  if (input.metaKey || input.ctrlKey || input.altKey) {
    return null;
  }

  const key = input.key.toLowerCase();

  const definition = EDITOR_TOOL_DEFINITIONS.find(
    (tool) => tool.shortcut.toLowerCase() === key,
  );

  return definition?.id ?? null;
}
