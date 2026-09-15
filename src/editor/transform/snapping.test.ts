import { describe, expect, it } from "vitest";

import type { EditorDocument } from "@/editor/document/types";

import {
  createSnapCandidates,
  snapAngle,
  snapBoundsTranslation,
  snapResizePoint,
} from "./snapping";

const document: EditorDocument = {
  schemaVersion: 1,

  id: "snapping-test",
  name: "Snapping Test",

  rootNodeIds: ["moving", "target"],

  nodes: {
    moving: {
      id: "moving",
      type: "rectangle",
      name: "Moving",

      parentId: null,

      x: 0,
      y: 0,

      width: 100,
      height: 100,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#000000",
      },

      cornerRadius: 0,
    },

    target: {
      id: "target",
      type: "rectangle",
      name: "Target",

      parentId: null,

      x: 200,
      y: 50,

      width: 100,
      height: 100,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#000000",
      },

      cornerRadius: 0,
    },
  },
};

describe("snapping", () => {
  it("excludes the selected node from snap candidates", () => {
    const candidates = createSnapCandidates(document, ["moving"]);

    expect(candidates.some((candidate) => candidate.nodeId === "moving")).toBe(
      false,
    );

    expect(
      candidates.filter((candidate) => candidate.nodeId === "target"),
    ).toHaveLength(6);
  });

  it("snaps translated bounds to a nearby target edge", () => {
    const candidates = createSnapCandidates(document, ["moving"]);

    const result = snapBoundsTranslation(
      {
        x: 0,
        y: 0,

        width: 100,
        height: 100,
      },
      {
        x: 94,
        y: 20,
      },
      candidates,
      1,
    );

    expect(result.delta).toEqual({
      x: 100,
      y: 20,
    });

    expect(result.guides).toHaveLength(1);

    expect(result.guides[0]).toMatchObject({
      orientation: "vertical",

      position: 200,
    });
  });

  it("does not snap outside the screen-space threshold", () => {
    const candidates = createSnapCandidates(document, ["moving"]);

    const result = snapBoundsTranslation(
      {
        x: 0,
        y: 0,

        width: 100,
        height: 100,
      },
      {
        x: 93,
        y: 20,
      },
      candidates,
      1,
    );

    expect(result.delta).toEqual({
      x: 93,
      y: 20,
    });

    expect(result.guides).toEqual([]);
  });

  it("converts the snap threshold through camera zoom", () => {
    const candidates = createSnapCandidates(document, ["moving"]);

    const snapped = snapBoundsTranslation(
      {
        x: 0,
        y: 0,

        width: 100,
        height: 100,
      },
      {
        x: 97,
        y: 20,
      },
      candidates,
      2,
    );

    expect(snapped.delta).toEqual({
      x: 100,
      y: 20,
    });

    const notSnapped = snapBoundsTranslation(
      {
        x: 0,
        y: 0,

        width: 100,
        height: 100,
      },
      {
        x: 96,
        y: 20,
      },
      candidates,
      2,
    );

    expect(notSnapped.delta).toEqual({
      x: 96,
      y: 20,
    });
  });

  it("snaps both horizontal and vertical translation", () => {
    const candidates = createSnapCandidates(document, ["moving"]);

    const result = snapBoundsTranslation(
      {
        x: 0,
        y: 0,

        width: 100,
        height: 100,
      },
      {
        x: 94,
        y: 44,
      },
      candidates,
      1,
    );

    expect(result.delta).toEqual({
      x: 100,
      y: 50,
    });

    expect(result.guides).toHaveLength(2);
  });

  it("snaps only the axes affected by a resize handle", () => {
    const candidates = createSnapCandidates(document, ["moving"]);

    const result = snapResizePoint(
      {
        x: 196,
        y: 1000,
      },
      "east",
      candidates,
      1,
    );

    expect(result.point.x).toBe(200);

    expect(result.point.y).toBe(1000);

    expect(result.matches).toHaveLength(1);
  });

  it("snaps angles to the nearest increment", () => {
    expect(snapAngle(22, 15)).toBe(15);

    expect(snapAngle(23, 15)).toBe(30);

    expect(snapAngle(-7, 15)).toBe(-0);
  });
});
