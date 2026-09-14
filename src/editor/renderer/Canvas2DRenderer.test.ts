import { describe, expect, it, vi } from "vitest";

import type { CameraState } from "@/editor/camera/types";
import { sampleDocument } from "@/editor/document/sampleDocument";

import { Canvas2DRenderer } from "./Canvas2DRenderer";

const defaultCamera: CameraState = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
};

function createMockContext() {
  const context = {
    canvas: {
      width: 1440,
      height: 900,
    },

    globalAlpha: 1,

    fillStyle: "",
    font: "",
    textBaseline: "alphabetic",
    textAlign: "start",

    save: vi.fn(),
    restore: vi.fn(),

    setTransform: vi.fn(),
    clearRect: vi.fn(),

    translate: vi.fn(),
    rotate: vi.fn(),

    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),

    fillRect: vi.fn(),

    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),

    ellipse: vi.fn(),

    fill: vi.fn(),
    fillText: vi.fn(),
  };

  return context;
}

describe("Canvas2DRenderer", () => {
  it("clears the canvas before rendering", () => {
    const context = createMockContext();

    const renderer = new Canvas2DRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    renderer.render(sampleDocument, defaultCamera);

    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 1440, 900);
  });

  it("applies the camera transform", () => {
    const context = createMockContext();

    const renderer = new Canvas2DRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    const camera: CameraState = {
      offsetX: -200,
      offsetY: 50,
      zoom: 2,
    };

    renderer.render(sampleDocument, camera, 2);

    expect(context.setTransform).toHaveBeenCalledWith(4, 0, 0, 4, -400, 100);
  });

  it("renders the root frame", () => {
    const context = createMockContext();

    const renderer = new Canvas2DRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    renderer.render(sampleDocument, defaultCamera);

    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 1200, 720);
  });

  it("renders rectangle and ellipse paths", () => {
    const context = createMockContext();

    const renderer = new Canvas2DRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    renderer.render(sampleDocument, defaultCamera);

    expect(context.fill).toHaveBeenCalledTimes(2);
    expect(context.ellipse).toHaveBeenCalledTimes(1);
  });

  it("renders the document text", () => {
    const context = createMockContext();

    const renderer = new Canvas2DRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    renderer.render(sampleDocument, defaultCamera);

    expect(context.fillText).toHaveBeenCalledWith(
      "Design without limits.",
      0,
      0,
      560,
    );
  });

  it("isolates rendering state", () => {
    const context = createMockContext();

    const renderer = new Canvas2DRenderer(
      context as unknown as CanvasRenderingContext2D,
    );

    renderer.render(sampleDocument, defaultCamera);

    expect(context.save).toHaveBeenCalled();
    expect(context.restore).toHaveBeenCalled();

    expect(context.save.mock.calls.length).toBe(
      context.restore.mock.calls.length,
    );
  });
});
