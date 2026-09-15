import { describe, expect, it, vi } from "vitest";

import type { CameraState } from "@/editor/camera/types";
import { sampleDocument } from "@/editor/document/sampleDocument";
import type { SelectionState } from "@/editor/selection/selection";

import { SelectionOverlayRenderer } from "./SelectionOverlayRenderer";

const defaultCamera: CameraState = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
};

function createMockContext() {
  return {
    strokeStyle: "",
    lineWidth: 1,

    save: vi.fn(),
    restore: vi.fn(),

    setTransform: vi.fn(),
    strokeRect: vi.fn(),
  };
}

describe("SelectionOverlayRenderer", () => {
  it("does not draw when nothing is selected", () => {
    const context = createMockContext();

    const renderer = new SelectionOverlayRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    const selection: SelectionState = {
      selectedNodeIds: [],
    };

    renderer.render(sampleDocument, selection, defaultCamera);

    expect(context.strokeRect).not.toHaveBeenCalled();
  });

  it("draws the selected node using world bounds", () => {
    const context = createMockContext();

    const renderer = new SelectionOverlayRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    const selection: SelectionState = {
      selectedNodeIds: ["text-title"],
    };

    renderer.render(sampleDocument, selection, defaultCamera);

    expect(context.strokeRect).toHaveBeenCalledWith(232, 232, 560, 72);
  });

  it("applies the camera transform", () => {
    const context = createMockContext();

    const renderer = new SelectionOverlayRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    const camera: CameraState = {
      offsetX: -100,
      offsetY: 40,
      zoom: 2,
    };

    const selection: SelectionState = {
      selectedNodeIds: ["rectangle-hero"],
    };

    renderer.render(sampleDocument, selection, camera, 2);

    expect(context.setTransform).toHaveBeenCalledWith(4, 0, 0, 4, -200, 80);
  });
});
