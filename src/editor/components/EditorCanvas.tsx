"use client";

import { useEffect, useRef } from "react";

import type { EditorDocument } from "@/editor/document/types";
import { Canvas2DRenderer } from "@/editor/renderer/Canvas2DRenderer";

import styles from "./EditorCanvas.module.css";

const CANVAS_WIDTH = 1440;
const CANVAS_HEIGHT = 900;

interface EditorCanvasProps {
  document: EditorDocument;
}

export function EditorCanvas({ document }: EditorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = CANVAS_WIDTH * pixelRatio;
    canvas.height = CANVAS_HEIGHT * pixelRatio;

    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const renderer = new Canvas2DRenderer(context);

    renderer.render(document);
  }, [document]);

  return (
    <div className={styles.viewport}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="CanvasLab design canvas"
      />
    </div>
  );
}
