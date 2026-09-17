export type EditorTool = "select" | "rectangle" | "ellipse" | "text" | "frame";

export interface EditorToolDefinition {
  id: EditorTool;

  label: string;

  icon: string;

  shortcut: string;
}

export const DEFAULT_EDITOR_TOOL: EditorTool = "select";

export const EDITOR_TOOL_DEFINITIONS: readonly EditorToolDefinition[] = [
  {
    id: "select",
    label: "Select",
    icon: "↖",
    shortcut: "V",
  },
  {
    id: "rectangle",
    label: "Rectangle",
    icon: "□",
    shortcut: "R",
  },
  {
    id: "ellipse",
    label: "Ellipse",
    icon: "○",
    shortcut: "O",
  },
  {
    id: "text",
    label: "Text",
    icon: "T",
    shortcut: "T",
  },
  {
    id: "frame",
    label: "Frame",
    icon: "▣",
    shortcut: "F",
  },
];

export function isCreationTool(tool: EditorTool): boolean {
  return tool !== "select";
}

export function getEditorToolDefinition(
  tool: EditorTool,
): EditorToolDefinition {
  const definition = EDITOR_TOOL_DEFINITIONS.find(
    (candidate) => candidate.id === tool,
  );

  if (!definition) {
    throw new Error(`Unknown editor tool: ${tool}`);
  }

  return definition;
}
