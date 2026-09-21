import {
  RENDER_INVALIDATION,
  type RenderInvalidationMask,
} from "./renderInvalidation";

export interface RenderFrameDriver {
  requestFrame: (callback: () => void) => number;

  cancelFrame: (frameId: number) => void;
}

export interface RenderInvalidationSchedulerOptions extends RenderFrameDriver {
  onFlush: (mask: RenderInvalidationMask) => void;
}

export interface RenderInvalidationScheduler {
  request: (mask: RenderInvalidationMask) => void;

  cancel: () => void;

  getPendingMask: () => RenderInvalidationMask;
}

export function createRenderInvalidationScheduler({
  requestFrame,
  cancelFrame,
  onFlush,
}: RenderInvalidationSchedulerOptions): RenderInvalidationScheduler {
  let pendingMask: RenderInvalidationMask = RENDER_INVALIDATION.none;

  let scheduledFrameId: number | null = null;

  const flush = () => {
    scheduledFrameId = null;

    const mask = pendingMask;

    pendingMask = RENDER_INVALIDATION.none;

    if (mask === RENDER_INVALIDATION.none) {
      return;
    }

    onFlush(mask);
  };

  return {
    request(mask) {
      if (mask === RENDER_INVALIDATION.none) {
        return;
      }

      pendingMask |= mask;

      if (scheduledFrameId !== null) {
        return;
      }

      scheduledFrameId = requestFrame(flush);
    },

    cancel() {
      if (scheduledFrameId !== null) {
        cancelFrame(scheduledFrameId);
      }

      scheduledFrameId = null;
      pendingMask = RENDER_INVALIDATION.none;
    },

    getPendingMask() {
      return pendingMask;
    },
  };
}
