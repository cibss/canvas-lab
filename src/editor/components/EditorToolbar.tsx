import { useRef, type KeyboardEvent } from "react";

import {
  getToolbarFocusIndex,
  isToolbarNavigationKey,
} from "@/editor/accessibility/toolbarNavigation";
import {
  EDITOR_TOOL_DEFINITIONS,
  type EditorTool,
} from "@/editor/tools/editorTool";

import accessibilityStyles from "./EditorToolbar.module.css";
import styles from "./EditorShell.module.css";

interface EditorToolbarProps {
  activeTool: EditorTool;

  onToolChange: (tool: EditorTool) => void;
}

export function EditorToolbar({
  activeTool,
  onToolChange,
}: EditorToolbarProps) {
  const toolRefs = useRef(new Map<EditorTool, HTMLDivElement>());

  const activeToolIndex = EDITOR_TOOL_DEFINITIONS.findIndex(
    (tool) => tool.id === activeTool,
  );

  const focusToolAtIndex = (index: number) => {
    const definition = EDITOR_TOOL_DEFINITIONS[index];

    if (!definition) {
      return;
    }

    toolRefs.current.get(definition.id)?.focus();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,

    tool: EditorTool,

    index: number,
  ) => {
    if (isToolbarNavigationKey(event.key)) {
      event.preventDefault();
      event.stopPropagation();

      const nextIndex = getToolbarFocusIndex(
        index,
        event.key,
        EDITOR_TOOL_DEFINITIONS.length,
      );

      if (nextIndex >= 0) {
        focusToolAtIndex(nextIndex);
      }

      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    onToolChange(tool);
  };

  return (
    <aside
      className={styles.toolbar}
      role="toolbar"
      aria-label="Editor tools"
      aria-orientation="vertical"
    >
      {EDITOR_TOOL_DEFINITIONS.map((tool, index) => {
        const active = tool.id === activeTool;

        return (
          <div
            key={tool.id}
            ref={(element) => {
              if (element) {
                toolRefs.current.set(tool.id, element);

                return;
              }

              toolRefs.current.delete(tool.id);
            }}
            className={`${styles.tool} ${
              active ? styles.activeTool : ""
            } ${accessibilityStyles.toolButton}`}
            role="button"
            tabIndex={index === activeToolIndex ? 0 : -1}
            aria-label={`${tool.label} tool`}
            aria-pressed={active}
            aria-keyshortcuts={tool.shortcut}
            title={`${tool.label} (${tool.shortcut})`}
            onClick={() => {
              onToolChange(tool.id);
            }}
            onKeyDown={(event) => {
              handleKeyDown(event, tool.id, index);
            }}
          >
            <span aria-hidden="true">{tool.icon}</span>
          </div>
        );
      })}
    </aside>
  );
}
