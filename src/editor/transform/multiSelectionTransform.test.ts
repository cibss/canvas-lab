import { describe, expect, it } from "vitest";

import type { EditorDocument } from "@/editor/document/types";
import type { SelectionState } from "@/editor/selection/selection";

import {
  createMultiSelectionTransformSession,
  resizeMultiSelection,
  rotateMultiSelection,
  translateMultiSelection,
} from "./multiSelectionTransform";

const document: EditorDocument = {
  schemaVersion: 1,

  id: "multi-transform",
  name: "Multi Transform",

  rootNodeIds: ["left", "right"],

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
  },
};

const selection: SelectionState = {
  selectedNodeIds: ["left", "right"],
};

describe("multi-selection transform", () => {
  it("creates a transform session from combined selection bounds", () => {
    const session = createMultiSelectionTransformSession(document, selection);

    expect(session).not.toBeNull();

    if (!session) {
      return;
    }

    expect(session.initialBounds).toEqual({
      x: 0,
      y: 0,

      width: 300,
      height: 100,

      centerX: 150,
      centerY: 50,
    });

    expect(session.nodes).toHaveLength(2);
  });

  it("moves all selected nodes together", () => {
    const session = createMultiSelectionTransformSession(document, selection);

    expect(session).not.toBeNull();

    if (!session) {
      return;
    }

    const result = translateMultiSelection(document, session, {
      x: 50,
      y: 25,
    });

    expect(result.nodes.left.x).toBeCloseTo(50);

    expect(result.nodes.left.y).toBeCloseTo(25);

    expect(result.nodes.right.x).toBeCloseTo(250);

    expect(result.nodes.right.y).toBeCloseTo(25);
  });

  it("resizes node positions and sizes proportionally within the group bounds", () => {
    const session = createMultiSelectionTransformSession(document, selection);

    expect(session).not.toBeNull();

    if (!session) {
      return;
    }

    const result = resizeMultiSelection(document, session, "east", {
      x: 600,
      y: 50,
    });

    expect(result.nodes.left.x).toBeCloseTo(0);

    expect(result.nodes.left.width).toBeCloseTo(200);

    expect(result.nodes.right.x).toBeCloseTo(400);

    expect(result.nodes.right.width).toBeCloseTo(200);
  });

  it("rotates nodes around the combined selection center", () => {
    const session = createMultiSelectionTransformSession(document, selection);

    expect(session).not.toBeNull();

    if (!session) {
      return;
    }

    const result = rotateMultiSelection(document, session, 180);

    expect(result.nodes.left.x).toBeCloseTo(200);

    expect(result.nodes.left.y).toBeCloseTo(0);

    expect(result.nodes.left.rotation).toBeCloseTo(180);

    expect(result.nodes.right.x).toBeCloseTo(0);

    expect(result.nodes.right.y).toBeCloseTo(0);

    expect(result.nodes.right.rotation).toBeCloseTo(180);
  });

  it("forces proportional group resizing when a selected node is rotated", () => {
    const rotatedDocument: EditorDocument = {
      ...document,

      nodes: {
        ...document.nodes,

        right: {
          ...document.nodes.right,

          rotation: 30,
        },
      },
    };

    const session = createMultiSelectionTransformSession(
      rotatedDocument,
      selection,
    );

    expect(session).not.toBeNull();

    if (!session) {
      return;
    }

    expect(session.requiresUniformScaling).toBe(true);

    const result = resizeMultiSelection(rotatedDocument, session, "east", {
      x: session.initialBounds.x + session.initialBounds.width * 2,

      y: session.initialBounds.centerY,
    });

    const leftScale = result.nodes.left.width / document.nodes.left.width;

    expect(result.nodes.left.height / document.nodes.left.height).toBeCloseTo(
      leftScale,
    );
  });
});
