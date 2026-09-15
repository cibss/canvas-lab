import { describe, expect, it } from "vitest";

import { getNodeWorldGeometry } from "@/editor/document/nodeGeometry";
import { moveNodesBy } from "@/editor/document/documentOperations";
import type { EditorDocument } from "@/editor/document/types";
import type { SelectionState } from "@/editor/selection/selection";

import {
  createMultiSelectionTransformSession,
  resizeMultiSelection,
  rotateMultiSelection,
  translateMultiSelection,
} from "./multiSelectionTransform";
import { createNodeResizeSession, resizeNodeWithSession } from "./nodeResize";
import { normalizeRotation, rotateNodeTo } from "./rotation";
import { getSelectionBounds } from "./selectionBounds";
import {
  createSnapCandidates,
  snapAngle,
  snapBoundsTranslation,
} from "./snapping";

function createDocument(): EditorDocument {
  return {
    schemaVersion: 1,

    id: "transform-engine",
    name: "Transform Engine",

    rootNodeIds: ["left", "right", "target"],

    nodes: {
      left: {
        id: "left",
        type: "rectangle",
        name: "Left",

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

      right: {
        id: "right",
        type: "rectangle",
        name: "Right",

        parentId: null,

        x: 200,
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

        x: 500,
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
}

describe("transform engine integration", () => {
  it("keeps single-node geometry consistent after resize then rotation", () => {
    const document = createDocument();

    const resizeSession = createNodeResizeSession(
      document,
      "left",
      "south-east",
    );

    expect(resizeSession).not.toBeNull();

    if (!resizeSession) {
      return;
    }

    const resized = resizeNodeWithSession(document, resizeSession, {
      x: 150,
      y: 150,
    });

    expect(resized.nodes.left.width).toBeCloseTo(150);

    expect(resized.nodes.left.height).toBeCloseTo(150);

    const rotated = rotateNodeTo(resized, "left", 45);

    const geometry = getNodeWorldGeometry(rotated, "left");

    expect(geometry).not.toBeNull();

    if (!geometry) {
      return;
    }

    expect(geometry.center.x).toBeCloseTo(75);

    expect(geometry.center.y).toBeCloseTo(75);

    expect(geometry.rotation).toBeCloseTo(45);
  });

  it("keeps a world-space drag correct after a node has been rotated", () => {
    const document = rotateNodeTo(createDocument(), "left", 45);

    const before = getNodeWorldGeometry(document, "left");

    expect(before).not.toBeNull();

    if (!before) {
      return;
    }

    const moved = moveNodesBy(document, ["left"], {
      x: 50,
      y: 25,
    });

    const after = getNodeWorldGeometry(moved, "left");

    expect(after).not.toBeNull();

    if (!after) {
      return;
    }

    expect(after.center.x - before.center.x).toBeCloseTo(50);

    expect(after.center.y - before.center.y).toBeCloseTo(25);

    expect(after.rotation).toBeCloseTo(45);
  });

  it("moves a multi-selection as one world-space group", () => {
    const document = createDocument();

    const selection: SelectionState = {
      selectedNodeIds: ["left", "right"],
    };

    const session = createMultiSelectionTransformSession(document, selection);

    expect(session).not.toBeNull();

    if (!session) {
      return;
    }

    const moved = translateMultiSelection(document, session, {
      x: 50,
      y: 25,
    });

    const bounds = getSelectionBounds(moved, selection);

    expect(bounds).not.toBeNull();

    if (!bounds) {
      return;
    }

    expect(bounds.x).toBeCloseTo(50);

    expect(bounds.y).toBeCloseTo(25);

    expect(bounds.width).toBeCloseTo(300);

    expect(bounds.height).toBeCloseTo(100);
  });

  it("resizes then rotates a multi-selection around the group center", () => {
    const document = createDocument();

    const selection: SelectionState = {
      selectedNodeIds: ["left", "right"],
    };

    const resizeSession = createMultiSelectionTransformSession(
      document,
      selection,
    );

    expect(resizeSession).not.toBeNull();

    if (!resizeSession) {
      return;
    }

    const resized = resizeMultiSelection(document, resizeSession, "east", {
      x: 600,
      y: 50,
    });

    const resizedBounds = getSelectionBounds(resized, selection);

    expect(resizedBounds).not.toBeNull();

    if (!resizedBounds) {
      return;
    }

    expect(resizedBounds.width).toBeCloseTo(600);

    const rotationSession = createMultiSelectionTransformSession(
      resized,
      selection,
    );

    expect(rotationSession).not.toBeNull();

    if (!rotationSession) {
      return;
    }

    const rotated = rotateMultiSelection(resized, rotationSession, 90);

    expect(rotated.nodes.left.rotation).toBeCloseTo(90);

    expect(rotated.nodes.right.rotation).toBeCloseTo(90);

    const leftGeometry = getNodeWorldGeometry(rotated, "left");

    const rightGeometry = getNodeWorldGeometry(rotated, "right");

    expect(leftGeometry).not.toBeNull();

    expect(rightGeometry).not.toBeNull();

    if (!leftGeometry || !rightGeometry) {
      return;
    }

    expect(leftGeometry.center.x).toBeCloseTo(rightGeometry.center.x);
  });

  it("snaps a multi-selection translation without changing its size", () => {
    const document = createDocument();

    const selection: SelectionState = {
      selectedNodeIds: ["left", "right"],
    };

    const initialBounds = getSelectionBounds(document, selection);

    expect(initialBounds).not.toBeNull();

    if (!initialBounds) {
      return;
    }

    const candidates = createSnapCandidates(
      document,
      selection.selectedNodeIds,
    );

    const snapped = snapBoundsTranslation(
      initialBounds,
      {
        x: 194,
        y: 20,
      },
      candidates,
      1,
    );

    expect(snapped.delta.x).toBeCloseTo(200);

    const session = createMultiSelectionTransformSession(document, selection);

    expect(session).not.toBeNull();

    if (!session) {
      return;
    }

    const moved = translateMultiSelection(document, session, snapped.delta);

    const finalBounds = getSelectionBounds(moved, selection);

    expect(finalBounds).not.toBeNull();

    if (!finalBounds) {
      return;
    }

    expect(finalBounds.width).toBeCloseTo(initialBounds.width);

    expect(finalBounds.height).toBeCloseTo(initialBounds.height);

    expect(finalBounds.x).toBeCloseTo(200);
  });

  it("preserves scale when rotated nodes require uniform multi-resize", () => {
    const document = rotateNodeTo(createDocument(), "right", 30);

    const selection: SelectionState = {
      selectedNodeIds: ["left", "right"],
    };

    const session = createMultiSelectionTransformSession(document, selection);

    expect(session).not.toBeNull();

    if (!session) {
      return;
    }

    expect(session.requiresUniformScaling).toBe(true);

    const resized = resizeMultiSelection(document, session, "east", {
      x: session.initialBounds.x + session.initialBounds.width * 2,

      y: session.initialBounds.centerY,
    });

    const leftScaleX = resized.nodes.left.width / document.nodes.left.width;

    const leftScaleY = resized.nodes.left.height / document.nodes.left.height;

    const rightScaleX = resized.nodes.right.width / document.nodes.right.width;

    const rightScaleY =
      resized.nodes.right.height / document.nodes.right.height;

    expect(leftScaleX).toBeCloseTo(leftScaleY);

    expect(rightScaleX).toBeCloseTo(rightScaleY);

    expect(leftScaleX).toBeCloseTo(rightScaleX);
  });

  it("keeps rotation snapping normalized across 360 degrees", () => {
    expect(normalizeRotation(snapAngle(358, 15))).toBe(0);

    expect(normalizeRotation(snapAngle(367, 15))).toBe(0);

    expect(normalizeRotation(snapAngle(-14, 15))).toBe(345);
  });
});
