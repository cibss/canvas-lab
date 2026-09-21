import { describe, expect, it } from "vitest";

import {
  setNodeLocked,
  setNodeVisibility,
} from "@/editor/document/nodeMetadata";
import { sampleDocument } from "@/editor/document/sampleDocument";
import {
  createSelectionState,
  selectSingleNode,
} from "@/editor/selection/selection";

import {
  getKeyboardEditableTextNodeId,
  shouldRestoreCanvasFocus,
} from "./focusSafety";

describe("focus safety", () => {
  it("restores canvas focus after keyboard text commit", () => {
    expect(shouldRestoreCanvasFocus("keyboard-commit")).toBe(true);
  });

  it("restores canvas focus after keyboard text cancel", () => {
    expect(shouldRestoreCanvasFocus("keyboard-cancel")).toBe(true);
  });

  it("restores canvas focus after clicking the canvas while editing", () => {
    expect(shouldRestoreCanvasFocus("canvas-pointer")).toBe(true);
  });

  it("preserves the browser focus destination after a normal blur", () => {
    expect(shouldRestoreCanvasFocus("blur")).toBe(false);
  });

  it("does not steal focus when the browser window loses focus", () => {
    expect(shouldRestoreCanvasFocus("window-blur")).toBe(false);
  });

  it("allows keyboard editing for one visible unlocked text node in Select mode", () => {
    const selection = selectSingleNode(createSelectionState(), "text-title");

    expect(
      getKeyboardEditableTextNodeId(sampleDocument, selection, "select"),
    ).toBe("text-title");
  });

  it("does not start keyboard text editing for non-text nodes", () => {
    const selection = selectSingleNode(
      createSelectionState(),
      "rectangle-hero",
    );

    expect(
      getKeyboardEditableTextNodeId(sampleDocument, selection, "select"),
    ).toBeNull();
  });

  it("does not start keyboard text editing outside Select mode", () => {
    const selection = selectSingleNode(createSelectionState(), "text-title");

    expect(
      getKeyboardEditableTextNodeId(sampleDocument, selection, "text"),
    ).toBeNull();
  });

  it("does not start keyboard text editing for hidden or locked text", () => {
    const selection = selectSingleNode(createSelectionState(), "text-title");

    const hiddenDocument = setNodeVisibility(
      sampleDocument,
      "text-title",
      false,
    );

    const lockedDocument = setNodeLocked(sampleDocument, "text-title", true);

    expect(
      getKeyboardEditableTextNodeId(hiddenDocument, selection, "select"),
    ).toBeNull();

    expect(
      getKeyboardEditableTextNodeId(lockedDocument, selection, "select"),
    ).toBeNull();
  });
});
