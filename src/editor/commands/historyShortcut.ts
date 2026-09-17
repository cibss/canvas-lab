export type HistoryShortcutAction = "undo" | "redo";

export interface HistoryShortcutInput {
  key: string;

  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export function getHistoryShortcut(
  input: HistoryShortcutInput,
): HistoryShortcutAction | null {
  if (input.altKey) {
    return null;
  }

  const hasPrimaryModifier = input.metaKey || input.ctrlKey;

  if (!hasPrimaryModifier) {
    return null;
  }

  const key = input.key.toLowerCase();

  if (key === "z" && input.shiftKey) {
    return "redo";
  }

  if (key === "z" && !input.shiftKey) {
    return "undo";
  }

  if (key === "y" && !input.shiftKey) {
    return "redo";
  }

  return null;
}
