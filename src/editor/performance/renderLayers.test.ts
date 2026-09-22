import { describe, expect, it } from "vitest";

import {
  RENDER_INVALIDATION,
  type RenderInvalidationMask,
} from "./renderInvalidation";
import {
  getDirtyRenderLayers,
  requiresDocumentLayerRender,
  requiresOverlayLayerRender,
} from "./renderLayers";

describe("render layers", () => {
  it("does not dirty any canvas layer for an empty mask", () => {
    expect(getDirtyRenderLayers(RENDER_INVALIDATION.none)).toEqual({
      document: false,
      overlay: false,
    });
  });

  it("redraws both layers when the document changes", () => {
    expect(getDirtyRenderLayers(RENDER_INVALIDATION.document)).toEqual({
      document: true,
      overlay: true,
    });
  });

  it("redraws only the overlay for selection changes", () => {
    expect(getDirtyRenderLayers(RENDER_INVALIDATION.selection)).toEqual({
      document: false,
      overlay: true,
    });
  });

  it("redraws only the overlay for alignment guides", () => {
    expect(getDirtyRenderLayers(RENDER_INVALIDATION.guides)).toEqual({
      document: false,
      overlay: true,
    });
  });

  it("redraws only the overlay for marquee changes", () => {
    expect(getDirtyRenderLayers(RENDER_INVALIDATION.marquee)).toEqual({
      document: false,
      overlay: true,
    });
  });

  it("redraws both layers when the camera changes", () => {
    expect(getDirtyRenderLayers(RENDER_INVALIDATION.camera)).toEqual({
      document: true,
      overlay: true,
    });
  });

  it("redraws both layers when the viewport changes", () => {
    expect(getDirtyRenderLayers(RENDER_INVALIDATION.viewport)).toEqual({
      document: true,
      overlay: true,
    });
  });

  it("redraws both canvas layers when text editing mode changes", () => {
    expect(getDirtyRenderLayers(RENDER_INVALIDATION.textEditing)).toEqual({
      document: true,
      overlay: true,
    });
  });

  it("does not redraw canvas layers for a DOM text-overlay-only change", () => {
    expect(getDirtyRenderLayers(RENDER_INVALIDATION.textOverlay)).toEqual({
      document: false,
      overlay: false,
    });
  });

  it("combines multiple invalidations without dirtying unnecessary layers", () => {
    const mask: RenderInvalidationMask =
      RENDER_INVALIDATION.selection |
      RENDER_INVALIDATION.marquee |
      RENDER_INVALIDATION.textOverlay;

    expect(requiresDocumentLayerRender(mask)).toBe(false);

    expect(requiresOverlayLayerRender(mask)).toBe(true);
  });

  it("makes the document layer dirty when any document-affecting reason is present", () => {
    const mask: RenderInvalidationMask =
      RENDER_INVALIDATION.selection | RENDER_INVALIDATION.document;

    expect(requiresDocumentLayerRender(mask)).toBe(true);

    expect(requiresOverlayLayerRender(mask)).toBe(true);
  });
});
