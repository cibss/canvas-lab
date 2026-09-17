import { describe, expect, it } from "vitest";

import { moveNodeBy } from "@/editor/document/documentOperations";
import { sampleDocument } from "@/editor/document/sampleDocument";
import type { SelectionState } from "@/editor/selection/selection";

import { createEditorCommand, createEditorSnapshot } from "./command";

describe("editor command", () => {
  it("creates a snapshot without cloning the immutable document", () => {
    const selection: SelectionState = {
      selectedNodeIds: ["rectangle-hero"],
    };

    const snapshot = createEditorSnapshot(sampleDocument, selection);

    expect(snapshot.document).toBe(sampleDocument);

    expect(snapshot.selection).not.toBe(selection);

    expect(snapshot.selection.selectedNodeIds).not.toBe(
      selection.selectedNodeIds,
    );

    expect(snapshot.selection.selectedNodeIds).toEqual(["rectangle-hero"]);
  });

  it("keeps a snapshot selection stable if the source array later changes", () => {
    const selection: SelectionState = {
      selectedNodeIds: ["rectangle-hero"],
    };

    const snapshot = createEditorSnapshot(sampleDocument, selection);

    selection.selectedNodeIds.push("text-title");

    expect(snapshot.selection.selectedNodeIds).toEqual(["rectangle-hero"]);
  });

  it("creates a command for a document change", () => {
    const selection: SelectionState = {
      selectedNodeIds: ["rectangle-hero"],
    };

    const movedDocument = moveNodeBy(sampleDocument, "rectangle-hero", {
      x: 10,
      y: 20,
    });

    const command = createEditorCommand({
      kind: "move",

      label: "Move Rectangle",

      before: createEditorSnapshot(sampleDocument, selection),

      after: createEditorSnapshot(movedDocument, selection),
    });

    expect(command).not.toBeNull();

    expect(command?.kind).toBe("move");

    expect(command?.label).toBe("Move Rectangle");

    expect(command?.before.document).toBe(sampleDocument);

    expect(command?.after.document).toBe(movedDocument);
  });

  it("does not create a command when the document did not change", () => {
    const beforeSelection: SelectionState = {
      selectedNodeIds: ["rectangle-hero"],
    };

    const afterSelection: SelectionState = {
      selectedNodeIds: ["text-title"],
    };

    const command = createEditorCommand({
      kind: "update",

      label: "Selection Change",

      before: createEditorSnapshot(sampleDocument, beforeSelection),

      after: createEditorSnapshot(sampleDocument, afterSelection),
    });

    expect(command).toBeNull();
  });
});
