import { describe, expect, it } from "vitest";

import {
  RENDER_INVALIDATION,
  type RenderInvalidationMask,
} from "./renderInvalidation";
import { createRenderInvalidationScheduler } from "./renderScheduler";

function createTestFrameDriver() {
  let nextFrameId = 1;

  const callbacks = new Map<number, () => void>();

  const cancelledFrameIds: number[] = [];

  return {
    requestFrame(callback: () => void) {
      const frameId = nextFrameId;

      nextFrameId += 1;

      callbacks.set(frameId, callback);

      return frameId;
    },

    cancelFrame(frameId: number) {
      callbacks.delete(frameId);

      cancelledFrameIds.push(frameId);
    },

    flushNextFrame() {
      const firstEntry = callbacks.entries().next().value as
        | [number, () => void]
        | undefined;

      if (!firstEntry) {
        return;
      }

      const [frameId, callback] = firstEntry;

      callbacks.delete(frameId);

      callback();
    },

    getScheduledFrameCount() {
      return callbacks.size;
    },

    getCancelledFrameIds() {
      return [...cancelledFrameIds];
    },
  };
}

describe("render invalidation scheduler", () => {
  it("schedules one frame for one invalidation", () => {
    const driver = createTestFrameDriver();

    const flushedMasks: RenderInvalidationMask[] = [];

    const scheduler = createRenderInvalidationScheduler({
      requestFrame: driver.requestFrame,

      cancelFrame: driver.cancelFrame,

      onFlush(mask) {
        flushedMasks.push(mask);
      },
    });

    scheduler.request(RENDER_INVALIDATION.document);

    expect(driver.getScheduledFrameCount()).toBe(1);

    driver.flushNextFrame();

    expect(flushedMasks).toEqual([RENDER_INVALIDATION.document]);
  });

  it("coalesces multiple invalidations into the same frame", () => {
    const driver = createTestFrameDriver();

    const flushedMasks: RenderInvalidationMask[] = [];

    const scheduler = createRenderInvalidationScheduler({
      requestFrame: driver.requestFrame,

      cancelFrame: driver.cancelFrame,

      onFlush(mask) {
        flushedMasks.push(mask);
      },
    });

    scheduler.request(RENDER_INVALIDATION.document);

    scheduler.request(RENDER_INVALIDATION.selection);

    scheduler.request(RENDER_INVALIDATION.camera);

    expect(driver.getScheduledFrameCount()).toBe(1);

    expect(scheduler.getPendingMask()).toBe(
      RENDER_INVALIDATION.document |
        RENDER_INVALIDATION.selection |
        RENDER_INVALIDATION.camera,
    );

    driver.flushNextFrame();

    expect(flushedMasks).toEqual([
      RENDER_INVALIDATION.document |
        RENDER_INVALIDATION.selection |
        RENDER_INVALIDATION.camera,
    ]);

    expect(scheduler.getPendingMask()).toBe(RENDER_INVALIDATION.none);
  });

  it("schedules another frame after the previous frame flushes", () => {
    const driver = createTestFrameDriver();

    const flushedMasks: RenderInvalidationMask[] = [];

    const scheduler = createRenderInvalidationScheduler({
      requestFrame: driver.requestFrame,

      cancelFrame: driver.cancelFrame,

      onFlush(mask) {
        flushedMasks.push(mask);
      },
    });

    scheduler.request(RENDER_INVALIDATION.document);

    driver.flushNextFrame();

    scheduler.request(RENDER_INVALIDATION.guides);

    expect(driver.getScheduledFrameCount()).toBe(1);

    driver.flushNextFrame();

    expect(flushedMasks).toEqual([
      RENDER_INVALIDATION.document,
      RENDER_INVALIDATION.guides,
    ]);
  });

  it("can schedule a follow-up frame from inside a flush", () => {
    const driver = createTestFrameDriver();

    const flushedMasks: RenderInvalidationMask[] = [];

    const schedulerRef: {
      current: ReturnType<typeof createRenderInvalidationScheduler> | null;
    } = {
      current: null,
    };

    const scheduler = createRenderInvalidationScheduler({
      requestFrame: driver.requestFrame,

      cancelFrame: driver.cancelFrame,

      onFlush(mask) {
        flushedMasks.push(mask);

        if (mask === RENDER_INVALIDATION.document) {
          schedulerRef.current?.request(RENDER_INVALIDATION.textOverlay);
        }
      },
    });

    schedulerRef.current = scheduler;

    scheduler.request(RENDER_INVALIDATION.document);

    driver.flushNextFrame();

    expect(driver.getScheduledFrameCount()).toBe(1);

    driver.flushNextFrame();

    expect(flushedMasks).toEqual([
      RENDER_INVALIDATION.document,
      RENDER_INVALIDATION.textOverlay,
    ]);
  });

  it("ignores an empty invalidation mask", () => {
    const driver = createTestFrameDriver();

    const scheduler = createRenderInvalidationScheduler({
      requestFrame: driver.requestFrame,

      cancelFrame: driver.cancelFrame,

      onFlush() {
        throw new Error("Empty invalidation should not flush.");
      },
    });

    scheduler.request(RENDER_INVALIDATION.none);

    expect(driver.getScheduledFrameCount()).toBe(0);
  });

  it("cancels the scheduled frame and clears pending work", () => {
    const driver = createTestFrameDriver();

    const scheduler = createRenderInvalidationScheduler({
      requestFrame: driver.requestFrame,

      cancelFrame: driver.cancelFrame,

      onFlush() {
        throw new Error("Cancelled work should not flush.");
      },
    });

    scheduler.request(RENDER_INVALIDATION.document);

    scheduler.cancel();

    expect(driver.getScheduledFrameCount()).toBe(0);

    expect(driver.getCancelledFrameIds()).toEqual([1]);

    expect(scheduler.getPendingMask()).toBe(RENDER_INVALIDATION.none);
  });
});
