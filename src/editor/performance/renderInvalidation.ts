export const RENDER_INVALIDATION = {
  none: 0,

  document: 1 << 0,

  selection: 1 << 1,

  camera: 1 << 2,

  viewport: 1 << 3,

  guides: 1 << 4,

  marquee: 1 << 5,

  textOverlay: 1 << 6,
} as const;

export type RenderInvalidationFlag = Exclude<
  (typeof RENDER_INVALIDATION)[keyof typeof RENDER_INVALIDATION],
  typeof RENDER_INVALIDATION.none
>;

export type RenderInvalidationMask = number;

export type RenderInvalidationName = Exclude<
  keyof typeof RENDER_INVALIDATION,
  "none"
>;

export interface RenderInvalidationState {
  pendingMask: RenderInvalidationMask;
}

const invalidationEntries = Object.entries(RENDER_INVALIDATION).filter(
  (entry): entry is [RenderInvalidationName, RenderInvalidationFlag] =>
    entry[0] !== "none",
);

export function createRenderInvalidationState(): RenderInvalidationState {
  return {
    pendingMask: RENDER_INVALIDATION.none,
  };
}

export function addRenderInvalidation(
  mask: RenderInvalidationMask,
  flag: RenderInvalidationFlag,
): RenderInvalidationMask {
  return mask | flag;
}

export function queueRenderInvalidation(
  state: RenderInvalidationState,
  flag: RenderInvalidationFlag,
): RenderInvalidationState {
  const nextMask = addRenderInvalidation(state.pendingMask, flag);

  if (nextMask === state.pendingMask) {
    return state;
  }

  return {
    pendingMask: nextMask,
  };
}

export function hasRenderInvalidation(
  mask: RenderInvalidationMask,
  flag: RenderInvalidationFlag,
): boolean {
  return (mask & flag) !== 0;
}

export function consumeRenderInvalidation(state: RenderInvalidationState): {
  mask: RenderInvalidationMask;

  state: RenderInvalidationState;
} {
  return {
    mask: state.pendingMask,

    state: createRenderInvalidationState(),
  };
}

export function getRenderInvalidationNames(
  mask: RenderInvalidationMask,
): RenderInvalidationName[] {
  return invalidationEntries
    .filter(([, flag]) => hasRenderInvalidation(mask, flag))
    .map(([name]) => name);
}

export function requiresCanvasRender(mask: RenderInvalidationMask): boolean {
  const canvasMask =
    RENDER_INVALIDATION.document |
    RENDER_INVALIDATION.selection |
    RENDER_INVALIDATION.camera |
    RENDER_INVALIDATION.viewport |
    RENDER_INVALIDATION.guides |
    RENDER_INVALIDATION.marquee;

  return (mask & canvasMask) !== 0;
}

export function requiresTextOverlaySync(mask: RenderInvalidationMask): boolean {
  const overlayMask =
    RENDER_INVALIDATION.document |
    RENDER_INVALIDATION.camera |
    RENDER_INVALIDATION.viewport |
    RENDER_INVALIDATION.textOverlay;

  return (mask & overlayMask) !== 0;
}
