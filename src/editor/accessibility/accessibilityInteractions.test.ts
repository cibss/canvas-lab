import { describe, expect, it } from "vitest";

import {
  getDeleteAnnouncement,
  getEditorActionAnnouncement,
  getHistoryAnnouncement,
  getNodeStateAnnouncement,
  getSelectionAnnouncement,
} from "./announcements";
import {
  createAccessibleObjectEntries,
  getAccessibleFocusRecoveryTarget,
  getAccessibleFocusTarget,
} from "./focusModel";
import { getKeyboardEditableTextNodeId } from "./focusSafety";

import { dispatchEditorCommand } from "@/editor/commands/dispatch";
import { deleteNodes } from "@/editor/document/documentOperations";
import {
  setNodeLocked,
  setNodeVisibility,
} from "@/editor/document/nodeMetadata";
import {
  createShapeNodeId,
  insertRootShape,
} from "@/editor/document/shapeCreation";
import { sampleDocument } from "@/editor/document/sampleDocument";
import {
  clearSelection,
  createSelectionState,
  selectSingleNode,
} from "@/editor/selection/selection";
import { removeNodeSubtreeFromSelection } from "@/editor/selection/selectionHierarchy";
import { createEditorState, undoEditorState } from "@/editor/state/editorState";

describe("accessibility interactions", () => {
  it("keeps keyboard focus navigation separate from document selection", () => {
    const entries = createAccessibleObjectEntries(sampleDocument);

    const selection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    const firstFocusedNodeId = getAccessibleFocusTarget(
      entries,
      "frame-main",
      "ArrowDown",
    );

    expect(firstFocusedNodeId).toBe("rectangle-hero");

    const secondFocusedNodeId = getAccessibleFocusTarget(
      entries,
      firstFocusedNodeId,
      "ArrowDown",
    );

    expect(secondFocusedNodeId).toBe("ellipse-decoration");

    /*
     * Merely navigating focus must not
     * mutate the current selection.
     */
    expect(selection.selectedNodeIds).toEqual(["rectangle-hero"]);

    /*
     * Activation is the explicit bridge
     * from focus to selection.
     */
    const activatedSelection = selectSingleNode(
      selection,
      secondFocusedNodeId ?? "ellipse-decoration",
    );

    expect(activatedSelection.selectedNodeIds).toEqual(["ellipse-decoration"]);

    expect(getSelectionAnnouncement(sampleDocument, activatedSelection)).toBe(
      "Decoration selected.",
    );
  });

  it("adds newly created objects to semantic navigation immediately", () => {
    const nodeId = createShapeNodeId(sampleDocument, "rectangle");

    const document = insertRootShape(sampleDocument, "rectangle", nodeId, {
      x: 420,
      y: 320,
      width: 240,
      height: 140,
    });

    const selection = selectSingleNode(createSelectionState(), nodeId);

    const entries = createAccessibleObjectEntries(document);

    expect(entries.map((entry) => entry.node.id)).toContain(nodeId);

    const semanticNode = entries.find((entry) => entry.node.id === nodeId);

    expect(semanticNode).toBeDefined();

    expect(semanticNode?.parentId).toBeNull();

    expect(getEditorActionAnnouncement(document, selection, "create")).toBe(
      "Rectangle 1 created.",
    );
  });

  it("recovers keyboard focus when a focused object is hidden and Undo restores its selection", () => {
    const initialSelection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    let state = createEditorState(sampleDocument, initialSelection);

    const previousEntries = createAccessibleObjectEntries(state.document);

    const hiddenDocument = setNodeVisibility(
      state.document,
      "rectangle-hero",
      false,
    );

    const hiddenSelection = removeNodeSubtreeFromSelection(
      state.document,
      state.selection,
      "rectangle-hero",
    );

    state = dispatchEditorCommand(state, {
      kind: "update",

      label: "Hide object",

      nextDocument: hiddenDocument,

      nextSelection: hiddenSelection,
    });

    expect(state.document.nodes["rectangle-hero"].visible).toBe(false);

    expect(state.selection.selectedNodeIds).toEqual([]);

    const nextEntries = createAccessibleObjectEntries(state.document);

    expect(nextEntries.map((entry) => entry.node.id)).not.toContain(
      "rectangle-hero",
    );

    expect(
      getAccessibleFocusRecoveryTarget(
        previousEntries,
        nextEntries,
        "rectangle-hero",
      ),
    ).toBe("ellipse-decoration");

    expect(getNodeStateAnnouncement("Hero Background", "hide")).toBe(
      "Hero Background hidden.",
    );

    const hideCommand =
      state.history.undoStack[state.history.undoStack.length - 1];

    expect(hideCommand).toBeDefined();

    expect(getHistoryAnnouncement("undo", hideCommand.label)).toBe(
      "Undid Hide object.",
    );

    state = undoEditorState(state);

    expect(state.document.nodes["rectangle-hero"].visible).toBe(true);

    expect(state.selection.selectedNodeIds).toEqual(["rectangle-hero"]);

    expect(
      createAccessibleObjectEntries(state.document).map(
        (entry) => entry.node.id,
      ),
    ).toContain("rectangle-hero");
  });

  it("keeps locked text discoverable while preventing keyboard editing", () => {
    const selection = selectSingleNode(createSelectionState(), "text-title");

    expect(
      getKeyboardEditableTextNodeId(sampleDocument, selection, "select"),
    ).toBe("text-title");

    const lockedDocument = setNodeLocked(sampleDocument, "text-title", true);

    const entries = createAccessibleObjectEntries(lockedDocument);

    const semanticText = entries.find(
      (entry) => entry.node.id === "text-title",
    );

    /*
     * Locked means editing restriction,
     * not hidden content.
     */
    expect(semanticText).toBeDefined();

    expect(semanticText?.node.locked).toBe(true);

    expect(
      getKeyboardEditableTextNodeId(lockedDocument, selection, "select"),
    ).toBeNull();

    const unlockedDocument = setNodeLocked(lockedDocument, "text-title", false);

    expect(
      getKeyboardEditableTextNodeId(unlockedDocument, selection, "select"),
    ).toBe("text-title");
  });

  it("recovers focus after deleting the focused object and Undo restores it", () => {
    const nodeId = createShapeNodeId(sampleDocument, "rectangle");

    const documentWithRectangle = insertRootShape(
      sampleDocument,
      "rectangle",
      nodeId,
      {
        x: 500,
        y: 420,
        width: 180,
        height: 100,
      },
    );

    const selection = selectSingleNode(createSelectionState(), nodeId);

    let state = createEditorState(documentWithRectangle, selection);

    const previousEntries = createAccessibleObjectEntries(state.document);

    expect(previousEntries[previousEntries.length - 1].node.id).toBe(nodeId);

    expect(getDeleteAnnouncement(state.document, state.selection)).toBe(
      "Rectangle 1 deleted.",
    );

    const deletedDocument = deleteNodes(
      state.document,
      state.selection.selectedNodeIds,
    );

    state = dispatchEditorCommand(state, {
      kind: "delete",

      label: "Delete selection",

      nextDocument: deletedDocument,

      nextSelection: clearSelection(state.selection),
    });

    const nextEntries = createAccessibleObjectEntries(state.document);

    expect(nextEntries.map((entry) => entry.node.id)).not.toContain(nodeId);

    /*
     * Rectangle 1 was the last item.
     * Recovery therefore chooses the nearest
     * surviving item before it.
     */
    expect(
      getAccessibleFocusRecoveryTarget(previousEntries, nextEntries, nodeId),
    ).toBe("text-title");

    expect(state.selection.selectedNodeIds).toEqual([]);

    state = undoEditorState(state);

    expect(state.document.nodes[nodeId]).toBeDefined();

    expect(state.selection.selectedNodeIds).toEqual([nodeId]);

    expect(
      createAccessibleObjectEntries(state.document).map(
        (entry) => entry.node.id,
      ),
    ).toContain(nodeId);
  });
});
