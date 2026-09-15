import { describe, expect, it, vi } from "vitest";

import type { CameraState } from "@/editor/camera/types";
import type { EditorDocument } from "@/editor/document/types";
import type { SelectionState } from "@/editor/selection/selection";
import { RESIZE_HANDLE_VISUAL_SIZE } from "@/editor/transform/resizeHandles";
import { ROTATION_HANDLE_VISUAL_SIZE } from "@/editor/transform/rotationHandle";

import { SelectionOverlayRenderer } from "./SelectionOverlayRenderer";

const document: EditorDocument = {
  schemaVersion: 1,

  id: "rotation-overlay",
  name: "Rotation Overlay",

  rootNodeIds: ["rectangle"],

  nodes: {
    rectangle: {
      id: "rectangle",
      type: "rectangle",
      name: "Rectangle",

      parentId: null,

      x: 100,
      y: 100,

      width: 200,
      height: 100,

      rotation: 45,
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

const camera: CameraState = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
};

function createMockContext() {
  return {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,

    save: vi.fn(),
    restore: vi.fn(),

    setTransform: vi.fn(),

    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),

    fillRect: vi.fn(),
    strokeRect: vi.fn(),
  };
}

describe("rotated selection overlay", () => {
  it("draws an oriented selection path", () => {
    const context = createMockContext();

    const renderer = new SelectionOverlayRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    const selection: SelectionState = {
      selectedNodeIds: ["rectangle"],
    };

    renderer.render(document, selection, camera);

    expect(context.beginPath).toHaveBeenCalledTimes(1);

    expect(context.moveTo).toHaveBeenCalled();

    expect(context.lineTo).toHaveBeenCalledTimes(3);

    expect(context.stroke).toHaveBeenCalled();
  });

  it("renders eight resize handles", () => {
    const context = createMockContext();

    const renderer = new SelectionOverlayRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    renderer.render(
      document,
      {
        selectedNodeIds: ["rectangle"],
      },
      camera,
    );

    const resizeHandleCalls = context.fillRect.mock.calls.filter(
      ([, , width, height]) =>
        width === RESIZE_HANDLE_VISUAL_SIZE &&
        height === RESIZE_HANDLE_VISUAL_SIZE,
    );

    expect(resizeHandleCalls).toHaveLength(8);
  });

  it("renders one rotation handle", () => {
    const context = createMockContext();

    const renderer = new SelectionOverlayRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    renderer.render(
      document,
      {
        selectedNodeIds: ["rectangle"],
      },
      camera,
    );

    const rotationHandleCalls = context.fillRect.mock.calls.filter(
      ([, , width, height]) =>
        width === ROTATION_HANDLE_VISUAL_SIZE &&
        height === ROTATION_HANDLE_VISUAL_SIZE,
    );

    expect(rotationHandleCalls).toHaveLength(1);
  });
});
