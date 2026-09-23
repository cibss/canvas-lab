import { describe, expect, it } from "vitest";

import { dispatchEditorCommand } from "@/editor/commands/dispatch";
import { updateNodeFillColor } from "@/editor/document/nodeFill";
import { sampleDocument } from "@/editor/document/sampleDocument";
import {
  createSelectionState,
  selectSingleNode,
} from "@/editor/selection/selection";
import {
  createEditorState,
  redoEditorState,
  undoEditorState,
} from "@/editor/state/editorState";

describe("node fill history", () => {
  it("restores shape fill through undo and redo", () => {
    const selection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    let state = createEditorState(sampleDocument, selection);

    const nextDocument = updateNodeFillColor(
      state.document,
      "rectangle-hero",
      "#2563eb",
    );

    state = dispatchEditorCommand(state, {
      kind: "update",
      label: "Update fill color",
      nextDocument,
    });

    const updatedNode = state.document.nodes["rectangle-hero"];

    expect(updatedNode.type).toBe("rectangle");

    if (updatedNode.type !== "rectangle") {
      return;
    }

    expect(updatedNode.fill?.color).toBe("#2563eb");
    expect(state.history.undoStack).toHaveLength(1);

    state = undoEditorState(state);

    const undoneNode = state.document.nodes["rectangle-hero"];

    expect(undoneNode.type).toBe("rectangle");

    if (undoneNode.type !== "rectangle") {
      return;
    }

    expect(undoneNode.fill?.color).toBe("#e4e4e7");

    state = redoEditorState(state);

    const redoneNode = state.document.nodes["rectangle-hero"];

    expect(redoneNode.type).toBe("rectangle");

    if (redoneNode.type !== "rectangle") {
      return;
    }

    expect(redoneNode.fill?.color).toBe("#2563eb");
  });
});
