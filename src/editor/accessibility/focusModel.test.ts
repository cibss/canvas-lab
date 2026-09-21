import { describe, expect, it } from "vitest";

import { setNodeVisibility } from "@/editor/document/nodeMetadata";
import { sampleDocument } from "@/editor/document/sampleDocument";

import {
  createAccessibleObjectEntries,
  getAccessibleFocusRecoveryTarget,
  getAccessibleFocusTarget,
  resolveAccessibleFocusNodeId,
} from "./focusModel";

describe("accessibility focus model", () => {
  it("flattens visible objects in document order", () => {
    const entries = createAccessibleObjectEntries(sampleDocument);

    expect(entries.map((entry) => entry.node.id)).toEqual([
      "frame-main",
      "rectangle-hero",
      "ellipse-decoration",
      "text-title",
    ]);

    expect(entries.map((entry) => entry.depth)).toEqual([1, 2, 2, 2]);
  });

  it("omits hidden nodes from keyboard navigation", () => {
    const document = setNodeVisibility(
      sampleDocument,
      "ellipse-decoration",
      false,
    );

    const entries = createAccessibleObjectEntries(document);

    expect(entries.map((entry) => entry.node.id)).toEqual([
      "frame-main",
      "rectangle-hero",
      "text-title",
    ]);
  });

  it("falls back to the first visible object when focus is unavailable", () => {
    const entries = createAccessibleObjectEntries(sampleDocument);

    expect(resolveAccessibleFocusNodeId(entries, null)).toBe("frame-main");

    expect(resolveAccessibleFocusNodeId(entries, "missing-node")).toBe(
      "frame-main",
    );
  });

  it("moves vertically through visible objects", () => {
    const entries = createAccessibleObjectEntries(sampleDocument);

    expect(getAccessibleFocusTarget(entries, "frame-main", "ArrowDown")).toBe(
      "rectangle-hero",
    );

    expect(
      getAccessibleFocusTarget(entries, "rectangle-hero", "ArrowDown"),
    ).toBe("ellipse-decoration");

    expect(
      getAccessibleFocusTarget(entries, "ellipse-decoration", "ArrowUp"),
    ).toBe("rectangle-hero");
  });

  it("supports Home and End", () => {
    const entries = createAccessibleObjectEntries(sampleDocument);

    expect(
      getAccessibleFocusTarget(entries, "ellipse-decoration", "Home"),
    ).toBe("frame-main");

    expect(getAccessibleFocusTarget(entries, "frame-main", "End")).toBe(
      "text-title",
    );
  });

  it("moves right from a parent to its first child", () => {
    const entries = createAccessibleObjectEntries(sampleDocument);

    expect(getAccessibleFocusTarget(entries, "frame-main", "ArrowRight")).toBe(
      "rectangle-hero",
    );
  });

  it("moves left from a child to its parent", () => {
    const entries = createAccessibleObjectEntries(sampleDocument);

    expect(getAccessibleFocusTarget(entries, "text-title", "ArrowLeft")).toBe(
      "frame-main",
    );
  });

  it("keeps focus in place when horizontal navigation has no target", () => {
    const entries = createAccessibleObjectEntries(sampleDocument);

    expect(
      getAccessibleFocusTarget(entries, "rectangle-hero", "ArrowRight"),
    ).toBe("rectangle-hero");

    expect(getAccessibleFocusTarget(entries, "frame-main", "ArrowLeft")).toBe(
      "frame-main",
    );
  });

  it("recovers to the next object when the focused object disappears", () => {
    const previousEntries = createAccessibleObjectEntries(sampleDocument);

    const nextDocument = setNodeVisibility(
      sampleDocument,
      "rectangle-hero",
      false,
    );

    const nextEntries = createAccessibleObjectEntries(nextDocument);

    expect(
      getAccessibleFocusRecoveryTarget(
        previousEntries,
        nextEntries,
        "rectangle-hero",
      ),
    ).toBe("ellipse-decoration");
  });

  it("recovers to the previous available object when the last object disappears", () => {
    const previousEntries = createAccessibleObjectEntries(sampleDocument);

    const nextDocument = setNodeVisibility(sampleDocument, "text-title", false);

    const nextEntries = createAccessibleObjectEntries(nextDocument);

    expect(
      getAccessibleFocusRecoveryTarget(
        previousEntries,
        nextEntries,
        "text-title",
      ),
    ).toBe("ellipse-decoration");
  });

  it("returns null when no visible object remains", () => {
    const previousEntries = createAccessibleObjectEntries(sampleDocument);

    const nextDocument = setNodeVisibility(sampleDocument, "frame-main", false);

    const nextEntries = createAccessibleObjectEntries(nextDocument);

    expect(
      getAccessibleFocusRecoveryTarget(
        previousEntries,
        nextEntries,
        "frame-main",
      ),
    ).toBeNull();
  });
});
