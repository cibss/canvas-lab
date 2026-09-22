"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createCamera, panCamera } from "@/editor/camera/camera";
import type { CameraState } from "@/editor/camera/types";
import {
  runRenderBenchmark,
  type RenderBenchmarkSummary,
} from "@/editor/performance/renderBenchmark";
import { Canvas2DRenderer } from "@/editor/renderer/Canvas2DRenderer";
import { WebGpuRectangleRenderer } from "@/editor/renderer/webgpu/WebGpuRectangleRenderer";

import { createGpuBenchmarkDocument } from "./gpuBenchmarkDocument";

import styles from "./WebGpuRectangleExperiment.module.css";

type WorkloadId = "1000" | "4000" | "10000";

interface WorkloadDefinition {
  label: string;

  columns: number;

  rows: number;
}

const WORKLOADS: Record<WorkloadId, WorkloadDefinition> = {
  "1000": {
    label: "1,000 rectangles",

    columns: 40,

    rows: 25,
  },

  "4000": {
    label: "4,000 rectangles",

    columns: 80,

    rows: 50,
  },

  "10000": {
    label: "10,000 rectangles",

    columns: 100,

    rows: 100,
  },
};

type ExperimentStatus = "initializing" | "ready" | "unsupported" | "error";

interface ComparisonResult {
  canvas2d: RenderBenchmarkSummary;

  webgpu: RenderBenchmarkSummary;
}

function getBenchmarkCamera(frameIndex: number): CameraState {
  const camera = createCamera();

  const phase = frameIndex / 10;

  return panCamera(
    camera,

    Math.sin(phase) * 36,

    Math.cos(phase * 0.8) * 24,
  );
}

function resizeCanvas(canvas: HTMLCanvasElement): number {
  const rect = canvas.getBoundingClientRect();

  const pixelRatio = window.devicePixelRatio || 1;

  const width = Math.max(
    1,

    Math.round(rect.width * pixelRatio),
  );

  const height = Math.max(
    1,

    Math.round(rect.height * pixelRatio),
  );

  if (canvas.width !== width) {
    canvas.width = width;
  }

  if (canvas.height !== height) {
    canvas.height = height;
  }

  return pixelRatio;
}

function formatMilliseconds(value: number): string {
  return `${value.toFixed(2)} ms`;
}

function formatFps(value: number): string {
  return `${value.toFixed(1)} FPS`;
}

interface ResultCardProps {
  title: string;

  result: RenderBenchmarkSummary;
}

function ResultCard({ title, result }: ResultCardProps) {
  return (
    <article className={styles.resultCard}>
      <h3>{title}</h3>

      <dl className={styles.metrics}>
        <div>
          <dt>Average render call</dt>

          <dd>{formatMilliseconds(result.averageRenderMs)}</dd>
        </div>

        <div>
          <dt>Median</dt>

          <dd>{formatMilliseconds(result.medianRenderMs)}</dd>
        </div>

        <div>
          <dt>P95</dt>

          <dd>{formatMilliseconds(result.p95RenderMs)}</dd>
        </div>

        <div>
          <dt>Max</dt>

          <dd>{formatMilliseconds(result.maxRenderMs)}</dd>
        </div>

        <div>
          <dt>Average frame interval</dt>

          <dd>{formatMilliseconds(result.averageFrameIntervalMs)}</dd>
        </div>

        <div>
          <dt>Observed cadence</dt>

          <dd>{formatFps(result.observedFps)}</dd>
        </div>
      </dl>
    </article>
  );
}

export function WebGpuRectangleExperiment() {
  const canvas2dRef = useRef<HTMLCanvasElement>(null);

  const webGpuCanvasRef = useRef<HTMLCanvasElement>(null);

  const canvas2dRendererRef = useRef<Canvas2DRenderer | null>(null);

  const webGpuRendererRef = useRef<WebGpuRectangleRenderer | null>(null);

  const benchmarkAbortRef = useRef<AbortController | null>(null);

  const [status, setStatus] = useState<ExperimentStatus>("initializing");

  const [errorMessage, setErrorMessage] = useState("");

  const [workloadId, setWorkloadId] = useState<WorkloadId>("4000");

  const [isBenchmarking, setIsBenchmarking] = useState(false);

  const [comparison, setComparison] = useState<ComparisonResult | null>(null);

  const workload = WORKLOADS[workloadId];

  const document = useMemo(
    () =>
      createGpuBenchmarkDocument({
        columns: workload.columns,

        rows: workload.rows,
      }),

    [workload.columns, workload.rows],
  );

  const nodeCount = document.rootNodeIds.length;

  const renderPreview = useCallback(
    (camera: CameraState = createCamera()) => {
      const canvas2d = canvas2dRef.current;

      const webGpuCanvas = webGpuCanvasRef.current;

      const canvas2dRenderer = canvas2dRendererRef.current;

      const webGpuRenderer = webGpuRendererRef.current;

      if (canvas2d && canvas2dRenderer) {
        const pixelRatio = resizeCanvas(canvas2d);

        canvas2dRenderer.render(document, camera, pixelRatio);
      }

      if (webGpuCanvas && webGpuRenderer) {
        const pixelRatio = resizeCanvas(webGpuCanvas);

        webGpuRenderer.render(document, camera, pixelRatio);
      }
    },

    [document],
  );

  useEffect(() => {
    const canvas2d = canvas2dRef.current;

    const webGpuCanvas = webGpuCanvasRef.current;

    if (!canvas2d || !webGpuCanvas) {
      return;
    }

    const canvas2dContext = canvas2d.getContext("2d");

    if (!canvas2dContext) {
      setStatus("error");

      setErrorMessage("Canvas2D context could not be created.");

      return;
    }

    canvas2dRendererRef.current = new Canvas2DRenderer(canvas2dContext);

    let disposed = false;

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => renderPreview());
    });

    resizeObserver.observe(canvas2d);

    resizeObserver.observe(webGpuCanvas);

    const initialize = async () => {
      if (!WebGpuRectangleRenderer.isSupported()) {
        setStatus("unsupported");

        renderPreview();

        return;
      }

      try {
        const renderer = await WebGpuRectangleRenderer.create(webGpuCanvas);

        if (disposed) {
          renderer.dispose();

          return;
        }

        webGpuRendererRef.current = renderer;

        setStatus("ready");

        requestAnimationFrame(() => renderPreview());
      } catch (error) {
        setStatus("error");

        setErrorMessage(error instanceof Error ? error.message : String(error));

        renderPreview();
      }
    };

    void initialize();

    return () => {
      disposed = true;

      benchmarkAbortRef.current?.abort();

      resizeObserver.disconnect();

      webGpuRendererRef.current?.dispose();

      webGpuRendererRef.current = null;

      canvas2dRendererRef.current = null;
    };
  }, [renderPreview]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => renderPreview());

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [document, renderPreview]);

  const runComparison = async () => {
    const canvas2d = canvas2dRef.current;

    const webGpuCanvas = webGpuCanvasRef.current;

    const canvas2dRenderer = canvas2dRendererRef.current;

    const webGpuRenderer = webGpuRendererRef.current;

    if (!canvas2d || !webGpuCanvas || !canvas2dRenderer || !webGpuRenderer) {
      return;
    }

    benchmarkAbortRef.current?.abort();

    const abortController = new AbortController();

    benchmarkAbortRef.current = abortController;

    setIsBenchmarking(true);

    setComparison(null);

    try {
      const canvas2dPixelRatio = resizeCanvas(canvas2d);

      const webGpuPixelRatio = resizeCanvas(webGpuCanvas);

      /*
       * Run sequentially instead of rendering both
       * backends in the same animation frame.
       *
       * Otherwise Canvas2D work would influence
       * WebGPU frame cadence and vice versa.
       */
      const canvas2dResult = await runRenderBenchmark({
        signal: abortController.signal,

        renderFrame(frameIndex) {
          canvas2dRenderer.render(
            document,
            getBenchmarkCamera(frameIndex),
            canvas2dPixelRatio,
          );
        },
      });

      const webGpuResult = await runRenderBenchmark({
        signal: abortController.signal,

        renderFrame(frameIndex) {
          webGpuRenderer.render(
            document,
            getBenchmarkCamera(frameIndex),
            webGpuPixelRatio,
          );
        },
      });

      if (abortController.signal.aborted) {
        return;
      }

      setComparison({
        canvas2d: canvas2dResult,

        webgpu: webGpuResult,
      });

      renderPreview();
    } catch (error) {
      if (!abortController.signal.aborted) {
        setErrorMessage(error instanceof Error ? error.message : String(error));
      }
    } finally {
      if (benchmarkAbortRef.current === abortController) {
        benchmarkAbortRef.current = null;

        setIsBenchmarking(false);
      }
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>CanvasLab</p>

            <h1>Canvas2D vs WebGPU</h1>

            <p className={styles.description}>
              Same rectangle document, same camera path, same benchmark
              duration. Measurements represent synchronous main-thread
              render-call cost and observed requestAnimationFrame cadence — not
              raw GPU execution time.
            </p>
          </div>

          <div className={styles.status} data-status={status}>
            {status}
          </div>
        </div>

        <div className={styles.controls}>
          <label className={styles.workloadControl}>
            <span>Workload</span>

            <select
              value={workloadId}
              disabled={isBenchmarking}
              onChange={(event) => {
                setComparison(null);

                setWorkloadId(event.target.value as WorkloadId);
              }}
            >
              {(
                Object.entries(WORKLOADS) as Array<
                  [WorkloadId, WorkloadDefinition]
                >
              ).map(([id, definition]) => (
                <option key={id} value={id}>
                  {definition.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              void runComparison();
            }}
            disabled={status !== "ready" || isBenchmarking}
          >
            {isBenchmarking ? "Running comparison…" : "Run comparison"}
          </button>
        </div>

        <p className={styles.workloadNote}>
          Current workload: <strong>{nodeCount.toLocaleString()}</strong> plain
          root rectangles.
        </p>

        <div className={styles.canvasGrid}>
          <article className={styles.canvasPanel}>
            <div className={styles.canvasTitle}>
              <strong>Canvas2D</strong>

              <span>production backend</span>
            </div>

            <div className={styles.canvasFrame}>
              <canvas
                ref={canvas2dRef}
                className={styles.canvas}
                aria-label="Canvas2D rendering benchmark"
              />
            </div>
          </article>

          <article className={styles.canvasPanel}>
            <div className={styles.canvasTitle}>
              <strong>WebGPU</strong>

              <span>experiment backend</span>
            </div>

            <div className={styles.canvasFrame}>
              <canvas
                ref={webGpuCanvasRef}
                className={styles.canvas}
                aria-label="WebGPU rendering benchmark"
              />

              {status === "unsupported" ? (
                <div className={styles.message}>
                  WebGPU is not available in this browser.
                </div>
              ) : null}

              {status === "error" ? (
                <div className={styles.message}>
                  {errorMessage || "The WebGPU experiment could not start."}
                </div>
              ) : null}
            </div>
          </article>
        </div>

        {comparison ? (
          <section
            className={styles.resultsSection}
            aria-label="Renderer comparison results"
          >
            <div className={styles.resultsHeader}>
              <div>
                <h2>Comparison result</h2>

                <p>
                  {nodeCount.toLocaleString()} rectangles · 20 warm-up frames +
                  120 measured frames per renderer.
                </p>
              </div>
            </div>

            <div className={styles.resultsGrid}>
              <ResultCard title="Canvas2D" result={comparison.canvas2d} />

              <ResultCard title="WebGPU" result={comparison.webgpu} />
            </div>
          </section>
        ) : null}

        <div className={styles.notes}>
          <strong>How to read this</strong>

          <span>
            Lower render-call time means less synchronous main-thread work. P95
            is more useful than a single fastest frame because it exposes slower
            frames.
          </span>

          <span>
            Observed FPS is capped by display refresh rate, so two renderers may
            both show about 60 FPS even when their CPU cost differs
            substantially.
          </span>

          <span>
            WebGPU render-call time includes document-to-instance preparation,
            buffer upload, command encoding, and queue submission. It does not
            wait for GPU completion.
          </span>

          <span>
            This compares raw renderer backends. CanvasLab&apos;s production
            Canvas2D path also benefits from viewport culling and layered
            invalidation.
          </span>
        </div>
      </section>
    </main>
  );
}
