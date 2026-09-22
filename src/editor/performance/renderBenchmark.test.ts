import { describe, expect, it } from "vitest";

import { summarizeRenderBenchmark } from "./renderBenchmark";

describe("render benchmark summary", () => {
  it("summarizes render durations", () => {
    const summary = summarizeRenderBenchmark([1, 2, 3, 4, 5], [16, 17, 16, 17]);

    expect(summary.sampleCount).toBe(5);

    expect(summary.averageRenderMs).toBe(3);

    expect(summary.medianRenderMs).toBe(3);

    expect(summary.p95RenderMs).toBe(5);

    expect(summary.maxRenderMs).toBe(5);

    expect(summary.averageFrameIntervalMs).toBe(16.5);

    expect(summary.observedFps).toBeCloseTo(1000 / 16.5);
  });

  it("handles empty samples safely", () => {
    expect(summarizeRenderBenchmark([], [])).toEqual({
      sampleCount: 0,

      averageRenderMs: 0,

      medianRenderMs: 0,

      p95RenderMs: 0,

      maxRenderMs: 0,

      averageFrameIntervalMs: 0,

      observedFps: 0,
    });
  });

  it("calculates the nearest-rank p95 value", () => {
    const values = Array.from(
      {
        length: 100,
      },

      (_, index) => index + 1,
    );

    expect(summarizeRenderBenchmark(values, []).p95RenderMs).toBe(95);
  });
});
