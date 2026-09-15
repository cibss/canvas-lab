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
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,

    save: vi.fn(),
    restore: vi.fn(),

    setTransform: vi.fn(),

    fillRect: vi.fn(),
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

    expect(context.fillRect).not.toHaveBeenCalled();
  });

  it("draws the transform bounds for a selected node", () => {
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

  it("draws eight resize handles", () => {
    const context = createMockContext();

    const renderer = new SelectionOverlayRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    const selection: SelectionState = {
      selectedNodeIds: ["text-title"],
    };

    renderer.render(sampleDocument, selection, defaultCamera);

    expect(context.fillRect).toHaveBeenCalledTimes(8);
  });

  it("draws combined bounds for multiple selected nodes", () => {
    const context = createMockContext();

    const renderer = new SelectionOverlayRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    const selection: SelectionState = {
      selectedNodeIds: ["rectangle-hero", "ellipse-decoration", "text-title"],
    };

    renderer.render(sampleDocument, selection, defaultCamera);

    expect(context.strokeRect).toHaveBeenCalledWith(184, 144, 1072, 320);
  });

  it("keeps handle size visually stable when zoomed", () => {
    const context = createMockContext();

    const renderer = new SelectionOverlayRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    const selection: SelectionState = {
      selectedNodeIds: ["text-title"],
    };

    const camera: CameraState = {
      offsetX: 0,
      offsetY: 0,
      zoom: 2,
    };

    renderer.render(sampleDocument, selection, camera);

    expect(context.fillRect).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      4,
      4,
    );
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
