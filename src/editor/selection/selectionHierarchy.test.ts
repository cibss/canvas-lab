import { describe, expect, it } from "vitest";

import { sampleDocument } from "@/editor/document/sampleDocument";

import { getTopLevelSelectedNodeIds } from "./selectionHierarchy";

describe("getTopLevelSelectedNodeIds", () => {
  it("keeps sibling selections", () => {
    expect(
      getTopLevelSelectedNodeIds(sampleDocument, [
        "rectangle-hero",
        "text-title",
      ]),
    ).toEqual(["rectangle-hero", "text-title"]);
  });

  it("removes a selected child when its ancestor is also selected", () => {
    expect(
      getTopLevelSelectedNodeIds(sampleDocument, [
        "frame-main",
        "rectangle-hero",
        "text-title",
      ]),
    ).toEqual(["frame-main"]);
  });

  it("removes duplicate node ids", () => {
    expect(
      getTopLevelSelectedNodeIds(sampleDocument, ["text-title", "text-title"]),
    ).toEqual(["text-title"]);
  });

  it("ignores missing nodes", () => {
    expect(
      getTopLevelSelectedNodeIds(sampleDocument, [
        "missing-node",
        "text-title",
      ]),
    ).toEqual(["text-title"]);
  });
});
