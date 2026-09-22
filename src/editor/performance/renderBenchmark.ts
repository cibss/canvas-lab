export interface RenderBenchmarkSummary {
  sampleCount: number;

  averageRenderMs: number;

  medianRenderMs: number;

  p95RenderMs: number;

  maxRenderMs: number;

  averageFrameIntervalMs: number;

  observedFps: number;
}

export interface RunRenderBenchmarkOptions {
  renderFrame: (frameIndex: number) => void;

  warmupFrames?: number;

  measuredFrames?: number;

  signal?: AbortSignal;
}

const DEFAULT_WARMUP_FRAMES = 20;

const DEFAULT_MEASURED_FRAMES = 120;

function getAverage(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  let total = 0;

  for (const value of values) {
    total += value;
  }

  return total / values.length;
}

function getPercentile(values: readonly number[], percentile: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((first, second) => first - second);

  const index = Math.min(
    sorted.length - 1,

    Math.max(
      0,

      Math.ceil(percentile * sorted.length) - 1,
    ),
  );

  return sorted[index];
}

export function summarizeRenderBenchmark(
  renderDurations: readonly number[],
  frameIntervals: readonly number[],
): RenderBenchmarkSummary {
  const averageFrameIntervalMs = getAverage(frameIntervals);

  return {
    sampleCount: renderDurations.length,

    averageRenderMs: getAverage(renderDurations),

    medianRenderMs: getPercentile(renderDurations, 0.5),

    p95RenderMs: getPercentile(renderDurations, 0.95),

    maxRenderMs: renderDurations.length > 0 ? Math.max(...renderDurations) : 0,

    averageFrameIntervalMs,

    observedFps: averageFrameIntervalMs > 0 ? 1000 / averageFrameIntervalMs : 0,
  };
}

function waitForAnimationFrame(signal?: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Render benchmark aborted."));

      return;
    }

    const frameId = requestAnimationFrame((timestamp) => {
      signal?.removeEventListener("abort", handleAbort);

      resolve(timestamp);
    });

    const handleAbort = () => {
      cancelAnimationFrame(frameId);

      reject(new Error("Render benchmark aborted."));
    };

    signal?.addEventListener("abort", handleAbort, {
      once: true,
    });
  });
}

export async function runRenderBenchmark({
  renderFrame,
  warmupFrames = DEFAULT_WARMUP_FRAMES,
  measuredFrames = DEFAULT_MEASURED_FRAMES,
  signal,
}: RunRenderBenchmarkOptions): Promise<RenderBenchmarkSummary> {
  for (let frameIndex = 0; frameIndex < warmupFrames; frameIndex += 1) {
    await waitForAnimationFrame(signal);

    renderFrame(frameIndex);
  }

  const renderDurations: number[] = [];

  const frameIntervals: number[] = [];

  let previousFrameTimestamp: number | null = null;

  for (let frameIndex = 0; frameIndex < measuredFrames; frameIndex += 1) {
    const frameTimestamp = await waitForAnimationFrame(signal);

    if (previousFrameTimestamp !== null) {
      frameIntervals.push(frameTimestamp - previousFrameTimestamp);
    }

    previousFrameTimestamp = frameTimestamp;

    const startTime = performance.now();

    renderFrame(frameIndex);

    const endTime = performance.now();

    renderDurations.push(endTime - startTime);
  }

  return summarizeRenderBenchmark(renderDurations, frameIntervals);
}
