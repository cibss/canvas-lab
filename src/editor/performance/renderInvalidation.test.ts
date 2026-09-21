import { describe, expect, it } from "vitest";

import {
  addRenderInvalidation,
  consumeRenderInvalidation,
  createRenderInvalidationState,
  getRenderInvalidationNames,
  hasRenderInvalidation,
  queueRenderInvalidation,
  requiresCanvasRender,
  requiresTextOverlaySync,
  RENDER_INVALIDATION,
  type RenderInvalidationMask,
} from "./renderInvalidation";

describe("render invalidation", () => {
  it("starts with no pending invalidation", () => {
    const state = createRenderInvalidationState();

    expect(state.pendingMask).toBe(RENDER_INVALIDATION.none);
  });

  it("combines multiple invalidation reasons", () => {
    let mask: RenderInvalidationMask = RENDER_INVALIDATION.none;

    mask = addRenderInvalidation(mask, RENDER_INVALIDATION.document);

    mask = addRenderInvalidation(mask, RENDER_INVALIDATION.camera);

    expect(hasRenderInvalidation(mask, RENDER_INVALIDATION.document)).toBe(
      true,
    );

    expect(hasRenderInvalidation(mask, RENDER_INVALIDATION.camera)).toBe(true);

    expect(hasRenderInvalidation(mask, RENDER_INVALIDATION.selection)).toBe(
      false,
    );
  });

  it("does not duplicate the same invalidation", () => {
    const initialState = createRenderInvalidationState();

    const documentState = queueRenderInvalidation(
      initialState,
      RENDER_INVALIDATION.document,
    );

    const duplicateState = queueRenderInvalidation(
      documentState,
      RENDER_INVALIDATION.document,
    );

    expect(duplicateState).toBe(documentState);
  });

  it("coalesces invalidations before consumption", () => {
    let state = createRenderInvalidationState();

    state = queueRenderInvalidation(state, RENDER_INVALIDATION.document);

    state = queueRenderInvalidation(state, RENDER_INVALIDATION.selection);

    state = queueRenderInvalidation(state, RENDER_INVALIDATION.guides);

    const consumed = consumeRenderInvalidation(state);

    expect(getRenderInvalidationNames(consumed.mask)).toEqual([
      "document",
      "selection",
      "guides",
    ]);

    expect(consumed.state.pendingMask).toBe(RENDER_INVALIDATION.none);
  });

  it("recognizes invalidations that require a canvas render", () => {
    expect(requiresCanvasRender(RENDER_INVALIDATION.document)).toBe(true);

    expect(requiresCanvasRender(RENDER_INVALIDATION.selection)).toBe(true);

    expect(requiresCanvasRender(RENDER_INVALIDATION.camera)).toBe(true);

    expect(requiresCanvasRender(RENDER_INVALIDATION.guides)).toBe(true);

    expect(requiresCanvasRender(RENDER_INVALIDATION.marquee)).toBe(true);
  });

  it("does not render the canvas for a text-overlay-only invalidation", () => {
    expect(requiresCanvasRender(RENDER_INVALIDATION.textOverlay)).toBe(false);
  });

  it("syncs the text overlay when camera or viewport changes", () => {
    const mask: RenderInvalidationMask =
      RENDER_INVALIDATION.camera | RENDER_INVALIDATION.viewport;

    expect(requiresTextOverlaySync(mask)).toBe(true);
  });

  it("does not sync the text overlay for selection-only changes", () => {
    expect(requiresTextOverlaySync(RENDER_INVALIDATION.selection)).toBe(false);
  });

  it("can require both canvas rendering and text overlay synchronization", () => {
    const mask: RenderInvalidationMask =
      RENDER_INVALIDATION.camera | RENDER_INVALIDATION.selection;

    expect(requiresCanvasRender(mask)).toBe(true);

    expect(requiresTextOverlaySync(mask)).toBe(true);
  });

  it("returns readable invalidation names for diagnostics", () => {
    const mask: RenderInvalidationMask =
      RENDER_INVALIDATION.document |
      RENDER_INVALIDATION.camera |
      RENDER_INVALIDATION.marquee;

    expect(getRenderInvalidationNames(mask)).toEqual([
      "document",
      "camera",
      "marquee",
    ]);
  });
});
