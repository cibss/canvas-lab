import {
  EDITOR_TOOL_DEFINITIONS,
  type EditorTool,
} from "@/editor/tools/editorTool";

import styles from "./EditorShell.module.css";

interface EditorToolbarProps {
  activeTool: EditorTool;

  onToolChange: (tool: EditorTool) => void;
}

export function EditorToolbar({
  activeTool,
  onToolChange,
}: EditorToolbarProps) {
  return (
    <aside className={styles.toolbar} aria-label="Editor tools">
      {EDITOR_TOOL_DEFINITIONS.map((tool) => {
        const active = tool.id === activeTool;

        return (
          <div
            key={tool.id}
            className={`${styles.tool} ${active ? styles.activeTool : ""}`}
            role="button"
            tabIndex={0}
            aria-pressed={active}
            title={`${tool.label} (${tool.shortcut})`}
            onClick={() => onToolChange(tool.id)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") {
                return;
              }

              event.preventDefault();

              onToolChange(tool.id);
            }}
          >
            <span aria-hidden="true">{tool.icon}</span>
          </div>
        );
      })}
    </aside>
  );
}
