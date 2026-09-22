import { describe, expect, it } from "vitest";

import type {
  EditorDocument,
  FrameNode,
  NodeId,
  RectangleNode,
} from "@/editor/document/types";
import { hitTestDocument } from "@/editor/selection/hitTest";

import {
  createSpatialHitTestDocument,
  createSpatialIndex,
  querySpatialIndexAtPoint,
} from "./spatialIndex";

function createRectangle(
  id: NodeId,
  parentId: NodeId | null,
  x: number,
  y: number,
  width = 100,
  height = 100,
): RectangleNode {
  return {
    id,

    type: "rectangle",

    name: id,

    parentId,

    x,

    y,

    width,

    height,

    rotation: 0,

    opacity: 1,

    visible: true,

    locked: false,

    fill: null,

    cornerRadius: 0,
  };
}

function createFrame(
  id: NodeId,
  childIds: NodeId[],
  options: {
    x?: number;

    y?: number;

    width?: number;

    height?: number;

    clipContent?: boolean;

    visible?: boolean;
  } = {},
): FrameNode {
  return {
    id,

    type: "frame",

    name: id,

    parentId: null,

    x: options.x ?? 0,

    y: options.y ?? 0,

    width: options.width ?? 100,

    height: options.height ?? 100,

    rotation: 0,

    opacity: 1,

    visible: options.visible ?? true,

    locked: false,

    childIds,

    fill: null,

    clipContent: options.clipContent ?? false,
  };
}

function createDocument(
  rootNodeIds: NodeId[],
  nodes: EditorDocument["nodes"],
): EditorDocument {
  return {
    schemaVersion: 1,

    id: "spatial-index-test",

    name: "Spatial Index Test",

    rootNodeIds,

    nodes,
  };
}

describe("spatial index", () => {
  it("returns only objects whose world bounds contain the query point", () => {
    const near = createRectangle("near", null, 10, 10, 100, 100);

    const far = createRectangle("far", null, 5000, 5000, 100, 100);

    const document = createDocument([near.id, far.id], {
      [near.id]: near,

      [far.id]: far,
    });

    const index = createSpatialIndex(document);

    expect(
      querySpatialIndexAtPoint(index, {
        x: 50,
        y: 50,
      }),
    ).toEqual(["near"]);
  });

  it("filters objects that share a grid cell but do not contain the point", () => {
    const rectangle = createRectangle("rectangle", null, 0, 0, 50, 50);

    const document = createDocument([rectangle.id], {
      [rectangle.id]: rectangle,
    });

    const index = createSpatialIndex(document, {
      cellSize: 256,
    });

    /*
     * x=200 is still inside the same
     * 256px grid cell, but outside
     * the rectangle's actual AABB.
     */
    expect(
      querySpatialIndexAtPoint(index, {
        x: 200,
        y: 20,
      }),
    ).toEqual([]);
  });

  it("does not index descendants of a hidden parent", () => {
    const frame = createFrame("frame", ["child"], {
      visible: false,
    });

    const child = createRectangle("child", frame.id, 10, 10, 50, 50);

    const document = createDocument([frame.id], {
      [frame.id]: frame,

      [child.id]: child,
    });

    const index = createSpatialIndex(document);

    expect(index.indexedNodeIds).toEqual([]);

    expect(
      querySpatialIndexAtPoint(index, {
        x: 20,
        y: 20,
      }),
    ).toEqual([]);
  });

  it("uses the overflow bucket for very large objects", () => {
    const giant = createRectangle("giant", null, 0, 0, 1000, 1000);

    const document = createDocument([giant.id], {
      [giant.id]: giant,
    });

    const index = createSpatialIndex(document, {
      cellSize: 100,

      maxCellsPerNode: 4,
    });

    expect(index.overflowNodeIds).toEqual(["giant"]);

    expect(
      querySpatialIndexAtPoint(index, {
        x: 900,
        y: 900,
      }),
    ).toEqual(["giant"]);

    expect(
      querySpatialIndexAtPoint(index, {
        x: 1200,
        y: 1200,
      }),
    ).toEqual([]);
  });

  it("includes ancestors required by the precise hit-test", () => {
    const frame = createFrame("frame", ["child"], {
      x: 1000,

      y: 0,

      width: 100,

      height: 100,

      clipContent: false,
    });

    const child = createRectangle("child", frame.id, -950, 20, 50, 50);

    const document = createDocument([frame.id], {
      [frame.id]: frame,

      [child.id]: child,
    });

    const point = {
      x: 75,
      y: 40,
    };

    const index = createSpatialIndex(document, {
      cellSize: 100,
    });

    const candidateNodeIds = querySpatialIndexAtPoint(index, point);

    expect(candidateNodeIds).toEqual(["child"]);

    const candidateDocument = createSpatialHitTestDocument(
      document,
      candidateNodeIds,
    );

    expect(candidateDocument.rootNodeIds).toEqual(["frame"]);

    const candidateFrame = candidateDocument.nodes["frame"];

    expect(candidateFrame.type).toBe("frame");

    if (candidateFrame.type !== "frame") {
      return;
    }

    expect(candidateFrame.childIds).toEqual(["child"]);

    expect(hitTestDocument(candidateDocument, point)).toBe(
      hitTestDocument(document, point),
    );
  });

  it("preserves precise hit-test semantics for overlapping objects", () => {
    const bottom = createRectangle("bottom", null, 0, 0, 200, 200);

    const top = createRectangle("top", null, 50, 50, 200, 200);

    const document = createDocument([bottom.id, top.id], {
      [bottom.id]: bottom,

      [top.id]: top,
    });

    const point = {
      x: 100,
      y: 100,
    };

    const fullHit = hitTestDocument(document, point);

    const index = createSpatialIndex(document);

    const candidateNodeIds = querySpatialIndexAtPoint(index, point);

    const candidateDocument = createSpatialHitTestDocument(
      document,
      candidateNodeIds,
    );

    const indexedHit = hitTestDocument(candidateDocument, point);

    expect(indexedHit).toBe(fullHit);
  });

  it("creates a much smaller hit-test document for sparse content", () => {
    const first = createRectangle("first", null, 0, 0, 100, 100);

    const second = createRectangle("second", null, 2000, 0, 100, 100);

    const third = createRectangle("third", null, 4000, 0, 100, 100);

    const document = createDocument([first.id, second.id, third.id], {
      [first.id]: first,

      [second.id]: second,

      [third.id]: third,
    });

    const index = createSpatialIndex(document);

    const candidateNodeIds = querySpatialIndexAtPoint(index, {
      x: 50,
      y: 50,
    });

    const candidateDocument = createSpatialHitTestDocument(
      document,
      candidateNodeIds,
    );

    expect(candidateNodeIds).toEqual(["first"]);

    expect(Object.keys(candidateDocument.nodes)).toEqual(["first"]);

    expect(candidateDocument.rootNodeIds).toEqual(["first"]);
  });
});
