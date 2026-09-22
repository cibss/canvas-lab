import { describe, expect, it } from "vitest";

import { createCamera, zoomCameraAtPoint } from "@/editor/camera/camera";
import type { EditorDocument, RectangleNode } from "@/editor/document/types";

import {
  createWebGpuRectangleScene,
  decodeWebGpuHexColor,
  WEBGPU_RECTANGLE_INSTANCE_FLOATS,
} from "./webGpuRectangleScene";

function createRectangle(
  overrides: Partial<RectangleNode> = {},
): RectangleNode {
  return {
    id: "rectangle",

    type: "rectangle",

    name: "Rectangle",

    parentId: null,

    x: 10,
    y: 20,
    width: 100,
    height: 50,
    rotation: 90,
    opacity: 0.5,
    visible: true,
    locked: false,

    fill: {
      type: "solid",

      color: "#336699",
    },

    cornerRadius: 0,

    ...overrides,
  };
}

function createDocument(node: RectangleNode): EditorDocument {
  return {
    schemaVersion: 1,

    id: "webgpu-scene-test",

    name: "WebGPU Scene Test",

    rootNodeIds: [node.id],

    nodes: {
      [node.id]: node,
    },
  };
}

describe("WebGPU rectangle scene", () => {
  it("packs one root rectangle into one GPU instance", () => {
    const document = createDocument(createRectangle());

    const scene = createWebGpuRectangleScene(document, createCamera());

    expect(scene.instanceCount).toBe(1);

    expect(scene.instanceData).toHaveLength(WEBGPU_RECTANGLE_INSTANCE_FLOATS);

    expect(scene.instanceData[2]).toBeCloseTo(100);

    expect(scene.instanceData[3]).toBeCloseTo(50);

    expect(scene.instanceData[4]).toBeCloseTo(Math.PI / 2);
  });

  it("scales instance size with camera zoom", () => {
    const document = createDocument(createRectangle());

    const camera = zoomCameraAtPoint(
      createCamera(),
      {
        x: 0,
        y: 0,
      },
      2,
    );

    const scene = createWebGpuRectangleScene(document, camera);

    expect(scene.instanceData[2]).toBeCloseTo(200);

    expect(scene.instanceData[3]).toBeCloseTo(100);
  });

  it("ignores hidden rectangles", () => {
    const document = createDocument(
      createRectangle({
        visible: false,
      }),
    );

    expect(
      createWebGpuRectangleScene(document, createCamera()).instanceCount,
    ).toBe(0);
  });

  it("ignores nested rectangles in the experiment renderer", () => {
    const document = createDocument(
      createRectangle({
        parentId: "frame",
      }),
    );

    expect(
      createWebGpuRectangleScene(document, createCamera()).instanceCount,
    ).toBe(0);
  });

  it("ignores rectangles without a fill", () => {
    const document = createDocument(
      createRectangle({
        fill: null,
      }),
    );

    expect(
      createWebGpuRectangleScene(document, createCamera()).instanceCount,
    ).toBe(0);
  });

  it("decodes full and shorthand hex colors", () => {
    expect(decodeWebGpuHexColor("#336699", 0.5)).toEqual([
      0x33 / 255,
      0x66 / 255,
      0x99 / 255,
      0.5,
    ]);

    expect(decodeWebGpuHexColor("#abc")).toEqual([
      0xaa / 255,
      0xbb / 255,
      0xcc / 255,
      1,
    ]);
  });

  it("falls back safely for unsupported color strings", () => {
    const color = decodeWebGpuHexColor("not-a-color", 2);

    expect(color[3]).toBe(1);

    expect(color.slice(0, 3)).toEqual([0.376, 0.647, 0.98]);
  });
});
