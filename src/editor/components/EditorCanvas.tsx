"use client";

import { useEffect, useRef } from "react";

import {
  createCamera,
  panCamera,
  zoomCameraAtPoint,
} from "@/editor/camera/camera";
import type { CameraState, Point } from "@/editor/camera/types";
import type { EditorDocument } from "@/editor/document/types";
import { Canvas2DRenderer } from "@/editor/renderer/Canvas2DRenderer";

import styles from "./EditorCanvas.module.css";

interface EditorCanvasProps {
  document: EditorDocument;
}

const ZOOM_SENSITIVITY = 0.0015;

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
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

    let animationFrameId: number | null = null;

    let isSpacePressed = false;
    let isPanning = false;
    let activePointerId: number | null = null;

    let lastPointerPosition: Point = {
      x: 0,
      y: 0,
    };

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

    const requestRender = () => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        render();
      });
    };

    const endPan = () => {
      isPanning = false;
      activePointerId = null;

      delete viewport.dataset.panning;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || isEditableElement(event.target)) {
        return;
      }

      event.preventDefault();

      isSpacePressed = true;
      viewport.dataset.panReady = "true";
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }

      event.preventDefault();

      isSpacePressed = false;

      delete viewport.dataset.panReady;

      if (isPanning) {
        endPan();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!isSpacePressed || event.button !== 0) {
        return;
      }

      event.preventDefault();

      isPanning = true;
      activePointerId = event.pointerId;

      lastPointerPosition = {
        x: event.clientX,
        y: event.clientY,
      };

      canvas.setPointerCapture(event.pointerId);

      viewport.dataset.panning = "true";
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isPanning || event.pointerId !== activePointerId) {
        return;
      }

      const deltaX = event.clientX - lastPointerPosition.x;

      const deltaY = event.clientY - lastPointerPosition.y;

      lastPointerPosition = {
        x: event.clientX,
        y: event.clientY,
      };

      cameraRef.current = panCamera(cameraRef.current, deltaX, deltaY);

      requestRender();
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) {
        return;
      }

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }

      endPan();
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const viewportRect = viewport.getBoundingClientRect();

      const pointerPosition = {
        x: event.clientX - viewportRect.left,
        y: event.clientY - viewportRect.top,
      };

      const zoomFactor = Math.exp(-event.deltaY * ZOOM_SENSITIVITY);

      const nextZoom = cameraRef.current.zoom * zoomFactor;

      cameraRef.current = zoomCameraAtPoint(
        cameraRef.current,
        pointerPosition,
        nextZoom,
      );

      requestRender();
    };

    const handleWindowBlur = () => {
      isSpacePressed = false;

      delete viewport.dataset.panReady;

      endPan();
    };

    render();

    const resizeObserver = new ResizeObserver(requestRender);

    resizeObserver.observe(viewport);

    window.addEventListener("keydown", handleKeyDown);

    window.addEventListener("keyup", handleKeyUp);

    window.addEventListener("blur", handleWindowBlur);

    canvas.addEventListener("pointerdown", handlePointerDown);

    canvas.addEventListener("pointermove", handlePointerMove);

    canvas.addEventListener("pointerup", handlePointerUp);

    canvas.addEventListener("pointercancel", handlePointerUp);

    canvas.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    return () => {
      resizeObserver.disconnect();

      window.removeEventListener("keydown", handleKeyDown);

      window.removeEventListener("keyup", handleKeyUp);

      window.removeEventListener("blur", handleWindowBlur);

      canvas.removeEventListener("pointerdown", handlePointerDown);

      canvas.removeEventListener("pointermove", handlePointerMove);

      canvas.removeEventListener("pointerup", handlePointerUp);

      canvas.removeEventListener("pointercancel", handlePointerUp);

      canvas.removeEventListener("wheel", handleWheel);

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
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
