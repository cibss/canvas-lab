"use client";

import { useEffect, useRef } from "react";

import { createCamera } from "@/editor/camera/camera";
import type { CameraState } from "@/editor/camera/types";
import type { EditorDocument } from "@/editor/document/types";
import { Canvas2DRenderer } from "@/editor/renderer/Canvas2DRenderer";

import styles from "./EditorCanvas.module.css";

interface EditorCanvasProps {
  document: EditorDocument;
}

export function EditorCanvas({ document }: EditorCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const cameraRef = useRef<CameraState>(createCamera());

  useEffect(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;

    if (!viewport || !canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const renderer = new Canvas2DRenderer(context);

    const render = () => {
      const viewportRect = viewport.getBoundingClientRect();

      const viewportWidth = Math.max(1, Math.floor(viewportRect.width));

      const viewportHeight = Math.max(1, Math.floor(viewportRect.height));

      const pixelRatio = window.devicePixelRatio || 1;

      const canvasWidth = Math.round(viewportWidth * pixelRatio);

      const canvasHeight = Math.round(viewportHeight * pixelRatio);

      if (canvas.width !== canvasWidth) {
        canvas.width = canvasWidth;
      }

      if (canvas.height !== canvasHeight) {
        canvas.height = canvasHeight;
      }

      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;

      renderer.render(document, cameraRef.current, pixelRatio);
    };

    render();

    const resizeObserver = new ResizeObserver(render);

    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
    };
  }, [document]);

  return (
    <div ref={viewportRef} className={styles.viewport}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="CanvasLab design canvas"
      />
    </div>
  );
}
