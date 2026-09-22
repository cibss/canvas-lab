"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createCamera, panCamera } from "@/editor/camera/camera";
import type { CameraState } from "@/editor/camera/types";
import { createStressDocument } from "@/editor/performance/stressDocument";
import { WebGpuRectangleRenderer } from "@/editor/renderer/webgpu/WebGpuRectangleRenderer";

import styles from "./WebGpuRectangleExperiment.module.css";

const EXPERIMENT_DOCUMENT = createStressDocument({
  columns: 80,
  rows: 48,
  nodeWidth: 10,
  nodeHeight: 10,
  spacingX: 12,
  spacingY: 12,
});

const EXPERIMENT_NODE_COUNT = Object.keys(EXPERIMENT_DOCUMENT.nodes).length;

type ExperimentStatus = "initializing" | "ready" | "unsupported" | "error";

export function WebGpuRectangleExperiment() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const rendererRef = useRef<WebGpuRectangleRenderer | null>(null);

  const cameraRef = useRef<CameraState>(createCamera());

  const [status, setStatus] = useState<ExperimentStatus>("initializing");

  const [errorMessage, setErrorMessage] = useState("");

  const [isAnimating, setIsAnimating] = useState(false);

  const renderExperiment = useCallback(() => {
    const canvas = canvasRef.current;

    const renderer = rendererRef.current;

    if (!canvas || !renderer) {
      return;
    }

    const rect = canvas.getBoundingClientRect();

    const pixelRatio = window.devicePixelRatio || 1;

    const width = Math.max(1, Math.round(rect.width * pixelRatio));

    const height = Math.max(1, Math.round(rect.height * pixelRatio));

    if (canvas.width !== width) {
      canvas.width = width;
    }

    if (canvas.height !== height) {
      canvas.height = height;
    }

    renderer.render(EXPERIMENT_DOCUMENT, cameraRef.current, pixelRatio);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    let disposed = false;

    const resizeObserver = new ResizeObserver(() => {
      renderExperiment();
    });

    resizeObserver.observe(canvas);

    const initialize = async () => {
      if (!WebGpuRectangleRenderer.isSupported()) {
        setStatus("unsupported");

        return;
      }

      try {
        const renderer = await WebGpuRectangleRenderer.create(canvas);

        if (disposed) {
          renderer.dispose();

          return;
        }

        rendererRef.current = renderer;

        setStatus("ready");

        requestAnimationFrame(renderExperiment);
      } catch (error) {
        setStatus("error");

        setErrorMessage(error instanceof Error ? error.message : String(error));
      }
    };

    void initialize();

    return () => {
      disposed = true;

      resizeObserver.disconnect();

      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [renderExperiment]);

  useEffect(() => {
    if (!isAnimating || status !== "ready") {
      return;
    }

    let frameId = 0;

    const animate = (timestamp: number) => {
      const baseCamera = createCamera();

      const offsetX = Math.sin(timestamp / 700) * 28;

      const offsetY = Math.cos(timestamp / 900) * 18;

      cameraRef.current = panCamera(baseCamera, offsetX, offsetY);

      renderExperiment();

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isAnimating, renderExperiment, status]);

  const resetCamera = () => {
    cameraRef.current = createCamera();

    renderExperiment();
  };

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>CanvasLab · Milestone 9</p>

            <h1>WebGPU Rectangle Experiment</h1>

            <p className={styles.description}>
              Isolated GPU prototype rendering{" "}
              {EXPERIMENT_NODE_COUNT.toLocaleString()} root rectangles with one
              instanced draw pipeline. The production editor still uses
              Canvas2D.
            </p>
          </div>

          <div className={styles.status} data-status={status}>
            {status}
          </div>
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            onClick={() => setIsAnimating((current) => !current)}
            disabled={status !== "ready"}
          >
            {isAnimating ? "Stop pan animation" : "Start pan animation"}
          </button>

          <button
            type="button"
            onClick={resetCamera}
            disabled={status !== "ready"}
          >
            Reset camera
          </button>
        </div>

        <div className={styles.canvasFrame}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            aria-label="WebGPU rectangle rendering experiment"
          />

          {status === "unsupported" ? (
            <div className={styles.message}>
              WebGPU is not available in this browser. The main CanvasLab editor
              remains unaffected because this experiment is isolated.
            </div>
          ) : null}

          {status === "error" ? (
            <div className={styles.message}>
              {errorMessage || "The WebGPU experiment could not start."}
            </div>
          ) : null}
        </div>

        <div className={styles.notes}>
          <strong>Experiment scope</strong>

          <span>
            Root rectangles only · solid fills · rotation · opacity · camera
            transform · GPU instancing
          </span>

          <span>
            No text, ellipse, frame clipping, hierarchy, selection overlay, or
            production renderer switching yet.
          </span>
        </div>
      </section>
    </main>
  );
}
