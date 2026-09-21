import { describe, expect, it } from "vitest";

import type {
  EditorDocument,
  FrameNode,
  NodeId,
  RectangleNode,
} from "@/editor/document/types";

import {
  createViewportRenderDocument,
  createWorldBounds,
  doWorldBoundsIntersect,
} from "./viewportCulling";

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
    visible: true,
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

    id: "viewport-culling-test",

    name: "Viewport Culling Test",

    rootNodeIds,

    nodes,
  };
}

describe("viewport culling", () => {
  it("creates normalized world bounds from any two points", () => {
    expect(
      createWorldBounds(
        {
          x: 100,
          y: 200,
        },
        {
          x: -50,
          y: 20,
        },
      ),
    ).toEqual({
      minX: -50,
      minY: 20,
      maxX: 100,
      maxY: 200,
    });
  });

  it("detects intersecting world bounds", () => {
    const viewport = createWorldBounds(
      {
        x: 0,
        y: 0,
      },
      {
        x: 500,
        y: 500,
      },
    );

    expect(
      doWorldBoundsIntersect(viewport, {
        minX: 100,
        minY: 100,
        maxX: 200,
        maxY: 200,
      }),
    ).toBe(true);

    expect(
      doWorldBoundsIntersect(viewport, {
        minX: 600,
        minY: 600,
        maxX: 700,
        maxY: 700,
      }),
    ).toBe(false);
  });

  it("treats touching edges as visible", () => {
    expect(
      doWorldBoundsIntersect(
        {
          minX: 0,
          minY: 0,
          maxX: 100,
          maxY: 100,
        },
        {
          minX: 100,
          minY: 20,
          maxX: 200,
          maxY: 80,
        },
      ),
    ).toBe(true);
  });

  it("culls root objects outside the viewport without mutating the source document", () => {
    const visible = createRectangle("visible", null, 50, 50);

    const offscreen = createRectangle("offscreen", null, 1000, 1000);

    const document = createDocument([visible.id, offscreen.id], {
      [visible.id]: visible,

      [offscreen.id]: offscreen,
    });

    const result = createViewportRenderDocument(document, {
      minX: 0,
      minY: 0,
      maxX: 500,
      maxY: 500,
    });

    expect(result.document.nodes["visible"].visible).toBe(true);

    expect(result.document.nodes["offscreen"].visible).toBe(false);

    expect(document.nodes["offscreen"].visible).toBe(true);

    expect(result.culledNodeIds).toEqual(["offscreen"]);
  });

  it("reuses the original document when nothing needs to be culled", () => {
    const rectangle = createRectangle("rectangle", null, 50, 50);

    const document = createDocument([rectangle.id], {
      [rectangle.id]: rectangle,
    });

    const result = createViewportRenderDocument(document, {
      minX: 0,
      minY: 0,
      maxX: 500,
      maxY: 500,
    });

    expect(result.document).toBe(document);

    expect(result.culledNodeIds).toEqual([]);
  });

  it("keeps a non-clipping offscreen frame when a child extends into the viewport", () => {
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

    const result = createViewportRenderDocument(document, {
      minX: 0,
      minY: 0,
      maxX: 200,
      maxY: 200,
    });

    expect(result.document.nodes["frame"].visible).toBe(true);

    expect(result.document.nodes["child"].visible).toBe(true);
  });

  it("prunes an offscreen clipped frame subtree", () => {
    const frame = createFrame("frame", ["child"], {
      x: 1000,
      y: 0,
      width: 100,
      height: 100,
      clipContent: true,
    });

    const child = createRectangle("child", frame.id, -950, 20, 50, 50);

    const document = createDocument([frame.id], {
      [frame.id]: frame,

      [child.id]: child,
    });

    const result = createViewportRenderDocument(document, {
      minX: 0,
      minY: 0,
      maxX: 200,
      maxY: 200,
    });

    expect(result.document.nodes["frame"].visible).toBe(false);

    /*
     * The child itself does not need
     * to be cloned or modified.
     * The renderer cannot reach it
     * once its clipped parent is
     * hidden in the render document.
     */
    expect(result.document.nodes["child"].visible).toBe(true);

    expect(result.culledNodeIds).toEqual(["frame"]);
  });

  it("does not treat already-hidden nodes as viewport culling work", () => {
    const rectangle = {
      ...createRectangle("hidden", null, 1000, 1000),

      visible: false,
    };

    const document = createDocument([rectangle.id], {
      [rectangle.id]: rectangle,
    });

    const result = createViewportRenderDocument(document, {
      minX: 0,
      minY: 0,
      maxX: 500,
      maxY: 500,
    });

    expect(result.document).toBe(document);

    expect(result.culledNodeIds).toEqual([]);
  });
});
