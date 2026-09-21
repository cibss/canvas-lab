import { describe, expect, it } from "vitest";

import { updateNodeProperty } from "@/editor/document/nodeProperties";
import {
  createShapeNodeId,
  insertRootShape,
} from "@/editor/document/shapeCreation";
import { sampleDocument } from "@/editor/document/sampleDocument";
import {
  createSelectionState,
  selectNodes,
  selectSingleNode,
} from "@/editor/selection/selection";

import {
  getDeleteAnnouncement,
  getEditorActionAnnouncement,
  getHistoryAnnouncement,
  getNodeStateAnnouncement,
  getPropertyAnnouncement,
  getRenameAnnouncement,
  getSelectionAnnouncement,
} from "./announcements";

describe("accessibility announcements", () => {
  it("announces an empty selection", () => {
    expect(
      getSelectionAnnouncement(sampleDocument, createSelectionState()),
    ).toBe("Selection cleared.");
  });

  it("announces a single selection by name", () => {
    const selection = selectSingleNode(createSelectionState(), "text-title");

    expect(getSelectionAnnouncement(sampleDocument, selection)).toBe(
      "Hero Title selected.",
    );
  });

  it("announces multiple selected objects", () => {
    const selection = selectNodes(createSelectionState(), [
      "rectangle-hero",
      "text-title",
    ]);

    expect(getSelectionAnnouncement(sampleDocument, selection)).toBe(
      "2 objects selected.",
    );
  });

  it("announces a moved object with its position", () => {
    const selection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    expect(
      getEditorActionAnnouncement(sampleDocument, selection, "move"),
    ).toContain("Hero Background moved to X");
  });

  it("announces a created shape", () => {
    const nodeId = createShapeNodeId(sampleDocument, "rectangle");

    const document = insertRootShape(sampleDocument, "rectangle", nodeId, {
      x: 400,
      y: 300,
      width: 200,
      height: 120,
    });

    const selection = selectSingleNode(createSelectionState(), nodeId);

    expect(getEditorActionAnnouncement(document, selection, "create")).toBe(
      "Rectangle 1 created.",
    );
  });

  it("announces deletion", () => {
    const selection = selectSingleNode(createSelectionState(), "text-title");

    expect(getDeleteAnnouncement(sampleDocument, selection)).toBe(
      "Hero Title deleted.",
    );
  });

  it("announces node state changes", () => {
    expect(getNodeStateAnnouncement("Hero Background", "hide")).toBe(
      "Hero Background hidden.",
    );

    expect(getNodeStateAnnouncement("Hero Background", "lock")).toBe(
      "Hero Background locked.",
    );
  });

  it("announces a rename", () => {
    expect(getRenameAnnouncement("Rectangle 1", "Card")).toBe(
      "Rectangle 1 renamed to Card.",
    );
  });

  it("announces normalized property values", () => {
    const document = updateNodeProperty(
      sampleDocument,
      "rectangle-hero",
      "opacity",
      0.5,
    );

    const node = document.nodes["rectangle-hero"];

    expect(getPropertyAnnouncement(node, "opacity")).toBe(
      "Hero Background opacity 50 percent.",
    );
  });

  it("announces undo and redo", () => {
    expect(getHistoryAnnouncement("undo", "Resize selection")).toBe(
      "Undid Resize selection.",
    );

    expect(getHistoryAnnouncement("redo", "Resize selection")).toBe(
      "Redid Resize selection.",
    );
  });
});
