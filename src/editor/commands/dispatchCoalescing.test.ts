import { describe, expect, it } from "vitest";

import { moveNodesBy } from "@/editor/document/documentOperations";
import { sampleDocument } from "@/editor/document/sampleDocument";
import {
  createSelectionState,
  selectSingleNode,
} from "@/editor/selection/selection";
import {
  createEditorState,
  setEditorSelection,
  undoEditorState,
} from "@/editor/state/editorState";

import { dispatchEditorCommand } from "./dispatch";

describe("dispatch command coalescing", () => {
  it("coalesces repeated keyboard nudges into one undo step", () => {
    const selection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    let state = createEditorState(sampleDocument, selection);

    for (let index = 0; index < 3; index += 1) {
      const nextDocument = moveNodesBy(
        state.document,
        state.selection.selectedNodeIds,
        {
          x: 1,
          y: 0,
        },
      );

      state = dispatchEditorCommand(state, {
        kind: "move",

        label: "Nudge selection",

        nextDocument,

        coalesce: {
          key: "keyboard-nudge",

          committedAt: 1000 + index * 100,
        },
      });
    }

    expect(state.history.undoStack).toHaveLength(1);

    expect(state.document.nodes["rectangle-hero"].x).toBe(
      sampleDocument.nodes["rectangle-hero"].x + 3,
    );

    const undone = undoEditorState(state);

    expect(undone.document).toBe(sampleDocument);
  });

  it("selection changes break keyboard nudge coalescing", () => {
    const rectangleSelection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    let state = createEditorState(sampleDocument, rectangleSelection);

    const firstDocument = moveNodesBy(
      state.document,
      state.selection.selectedNodeIds,
      {
        x: 1,
        y: 0,
      },
    );

    state = dispatchEditorCommand(state, {
      kind: "move",

      label: "Nudge selection",

      nextDocument: firstDocument,

      coalesce: {
        key: "keyboard-nudge",

        committedAt: 1000,
      },
    });

    const textSelection = selectSingleNode(state.selection, "text-title");

    state = setEditorSelection(state, textSelection);

    state = setEditorSelection(state, rectangleSelection);

    const secondDocument = moveNodesBy(
      state.document,
      state.selection.selectedNodeIds,
      {
        x: 1,
        y: 0,
      },
    );

    state = dispatchEditorCommand(state, {
      kind: "move",

      label: "Nudge selection",

      nextDocument: secondDocument,

      coalesce: {
        key: "keyboard-nudge",

        committedAt: 1100,
      },
    });

    expect(state.history.undoStack).toHaveLength(2);
  });
});
