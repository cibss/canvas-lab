import { describe, expect, it, vi } from "vitest";

import type { CameraState } from "@/editor/camera/types";
import type { MarqueeState } from "@/editor/selection/marquee";

import { MarqueeOverlayRenderer } from "./MarqueeOverlayRenderer";

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
    setLineDash: vi.fn(),

    fillRect: vi.fn(),
    strokeRect: vi.fn(),
  };
}

describe("MarqueeOverlayRenderer", () => {
  it("does not render without a marquee", () => {
    const context = createMockContext();

    const renderer = new MarqueeOverlayRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    renderer.render(null, defaultCamera);

    expect(context.fillRect).not.toHaveBeenCalled();

    expect(context.strokeRect).not.toHaveBeenCalled();
  });

  it("renders normalized marquee bounds", () => {
    const context = createMockContext();

    const renderer = new MarqueeOverlayRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    const marquee: MarqueeState = {
      start: {
        x: 500,
        y: 400,
      },

      current: {
        x: 100,
        y: 150,
      },
    };

    renderer.render(marquee, defaultCamera);

    expect(context.fillRect).toHaveBeenCalledWith(100, 150, 400, 250);

    expect(context.strokeRect).toHaveBeenCalledWith(100, 150, 400, 250);
  });
});
