import {
  RENDER_INVALIDATION,
  type RenderInvalidationMask,
} from "./renderInvalidation";

export interface DirtyRenderLayers {
  document: boolean;

  overlay: boolean;
}

const DOCUMENT_LAYER_MASK =
  RENDER_INVALIDATION.document |
  RENDER_INVALIDATION.camera |
  RENDER_INVALIDATION.viewport |
  RENDER_INVALIDATION.textEditing;

const OVERLAY_LAYER_MASK =
  RENDER_INVALIDATION.document |
  RENDER_INVALIDATION.selection |
  RENDER_INVALIDATION.camera |
  RENDER_INVALIDATION.viewport |
  RENDER_INVALIDATION.guides |
  RENDER_INVALIDATION.marquee |
  RENDER_INVALIDATION.textEditing;

export function getDirtyRenderLayers(
  mask: RenderInvalidationMask,
): DirtyRenderLayers {
  return {
    document: (mask & DOCUMENT_LAYER_MASK) !== 0,

    overlay: (mask & OVERLAY_LAYER_MASK) !== 0,
  };
}

export function requiresDocumentLayerRender(
  mask: RenderInvalidationMask,
): boolean {
  return getDirtyRenderLayers(mask).document;
}

export function requiresOverlayLayerRender(
  mask: RenderInvalidationMask,
): boolean {
  return getDirtyRenderLayers(mask).overlay;
}
