import { describe, expect, it } from "vitest";

import {
  DEFAULT_EDITOR_TOOL,
  EDITOR_TOOL_DEFINITIONS,
  getEditorToolDefinition,
  isCreationTool,
  isShapeCreationTool,
} from "./editorTool";

describe("editor tools", () => {
  it("uses select as the default tool", () => {
    expect(DEFAULT_EDITOR_TOOL).toBe("select");
  });

  it("contains unique tool ids", () => {
    const ids = EDITOR_TOOL_DEFINITIONS.map((tool) => tool.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("distinguishes selection from creation tools", () => {
    expect(isCreationTool("select")).toBe(false);

    expect(isCreationTool("rectangle")).toBe(true);

    expect(isCreationTool("ellipse")).toBe(true);

    expect(isCreationTool("text")).toBe(true);

    expect(isCreationTool("frame")).toBe(true);
  });

  it("distinguishes drawable shape tools from text", () => {
    expect(isShapeCreationTool("rectangle")).toBe(true);

    expect(isShapeCreationTool("ellipse")).toBe(true);

    expect(isShapeCreationTool("frame")).toBe(true);

    expect(isShapeCreationTool("text")).toBe(false);

    expect(isShapeCreationTool("select")).toBe(false);
  });

  it("returns tool metadata", () => {
    expect(getEditorToolDefinition("rectangle")).toEqual({
      id: "rectangle",
      label: "Rectangle",
      icon: "□",
      shortcut: "R",
    });
  });
});
