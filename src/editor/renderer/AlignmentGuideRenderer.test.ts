import { describe, expect, it, vi } from "vitest";

import type { CameraState } from "@/editor/camera/types";
import type { SnapGuide } from "@/editor/transform/snapping";

import { AlignmentGuideRenderer } from "./AlignmentGuideRenderer";

const camera: CameraState = {
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

    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  };
}

describe("AlignmentGuideRenderer", () => {
  it("does not draw without guides", () => {
    const context = createMockContext();

    const renderer = new AlignmentGuideRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    renderer.render([], camera);

    expect(context.beginPath).not.toHaveBeenCalled();
  });

  it("draws vertical and horizontal guides", () => {
    const context = createMockContext();

    const renderer = new AlignmentGuideRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    const guides: SnapGuide[] = [
      {
        orientation: "vertical",

        position: 200,
        start: 50,
        end: 400,
      },
      {
        orientation: "horizontal",

        position: 300,
        start: 100,
        end: 500,
      },
    ];

    renderer.render(guides, camera);

    expect(context.beginPath).toHaveBeenCalledTimes(2);

    expect(context.moveTo).toHaveBeenNthCalledWith(1, 200, 50);

    expect(context.lineTo).toHaveBeenNthCalledWith(1, 200, 400);

    expect(context.moveTo).toHaveBeenNthCalledWith(2, 100, 300);

    expect(context.lineTo).toHaveBeenNthCalledWith(2, 500, 300);
  });

  it("applies camera zoom, offset, and pixel ratio", () => {
    const context = createMockContext();

    const renderer = new AlignmentGuideRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    renderer.render(
      [
        {
          orientation: "vertical",

          position: 200,
          start: 0,
          end: 100,
        },
      ],
      {
        offsetX: -50,
        offsetY: 25,
        zoom: 2,
      },
      2,
    );

    expect(context.setTransform).toHaveBeenCalledWith(4, 0, 0, 4, -100, 50);
  });
});
