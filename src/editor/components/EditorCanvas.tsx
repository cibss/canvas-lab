"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import {
  createCamera,
  DEFAULT_ZOOM,
  fitCameraToBounds,
  panCamera,
  screenToWorld,
  zoomCameraAtPoint,
  ZOOM_BUTTON_FACTOR,
} from "@/editor/camera/camera";
import type { CameraState, Point } from "@/editor/camera/types";
import { getDocumentBounds } from "@/editor/document/documentBounds";
import { moveNodeBy } from "@/editor/document/documentOperations";
import type { EditorDocument, NodeId } from "@/editor/document/types";
import { Canvas2DRenderer } from "@/editor/renderer/Canvas2DRenderer";
import { SelectionOverlayRenderer } from "@/editor/renderer/SelectionOverlayRenderer";
import { hitTestDocument } from "@/editor/selection/hitTest";
import {
  clearSelection,
  selectSingleNode,
  type SelectionState,
} from "@/editor/selection/selection";

import styles from "./EditorCanvas.module.css";

interface EditorCanvasProps {
  document: EditorDocument;
  selection: SelectionState;

  onDocumentChange: (document: EditorDocument) => void;

  onSelectionChange: (selection: SelectionState) => void;

  onZoomChange?: (zoom: number) => void;
}

export interface EditorCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitContent: () => void;
}

type PointerInteraction = "idle" | "panning" | "dragging-node";

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

export const EditorCanvas = forwardRef<EditorCanvasHandle, EditorCanvasProps>(
  function EditorCanvas(
    { document, selection, onDocumentChange, onSelectionChange, onZoomChange },
    ref,
  ) {
    const viewportRef = useRef<HTMLDivElement>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const cameraRef = useRef<CameraState>(createCamera());

    const documentRef = useRef<EditorDocument>(document);

    const selectionRef = useRef<SelectionState>(selection);

    const onDocumentChangeRef = useRef(onDocumentChange);

    const onSelectionChangeRef = useRef(onSelectionChange);

    const onZoomChangeRef = useRef(onZoomChange);

    const requestRenderRef = useRef<() => void>(() => undefined);

    useEffect(() => {
      documentRef.current = document;

      requestRenderRef.current();
    }, [document]);

    useEffect(() => {
      selectionRef.current = selection;

      requestRenderRef.current();
    }, [selection]);

    useEffect(() => {
      onDocumentChangeRef.current = onDocumentChange;
    }, [onDocumentChange]);

    useEffect(() => {
      onSelectionChangeRef.current = onSelectionChange;
    }, [onSelectionChange]);

    useEffect(() => {
      onZoomChangeRef.current = onZoomChange;
    }, [onZoomChange]);

    const applyCamera = useCallback(
      (camera: CameraState, notifyZoom = true) => {
        cameraRef.current = camera;

        if (notifyZoom) {
          onZoomChangeRef.current?.(camera.zoom);
        }

        requestRenderRef.current();
      },
      [],
    );

    const getViewportCenter = useCallback((): Point | null => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return null;
      }

      const rect = viewport.getBoundingClientRect();

      return {
        x: rect.width / 2,
        y: rect.height / 2,
      };
    }, []);

    const zoomAroundViewportCenter = useCallback(
      (nextZoom: number) => {
        const center = getViewportCenter();

        if (!center) {
          return;
        }

        applyCamera(zoomCameraAtPoint(cameraRef.current, center, nextZoom));
      },
      [applyCamera, getViewportCenter],
    );

    useImperativeHandle(
      ref,
      () => ({
        zoomIn() {
          zoomAroundViewportCenter(cameraRef.current.zoom * ZOOM_BUTTON_FACTOR);
        },

        zoomOut() {
          zoomAroundViewportCenter(cameraRef.current.zoom / ZOOM_BUTTON_FACTOR);
        },

        resetZoom() {
          zoomAroundViewportCenter(DEFAULT_ZOOM);
        },

        fitContent() {
          const viewport = viewportRef.current;

          const bounds = getDocumentBounds(documentRef.current);

          if (!viewport || !bounds) {
            return;
          }

          const rect = viewport.getBoundingClientRect();

          applyCamera(
            fitCameraToBounds(bounds, {
              width: rect.width,
              height: rect.height,
            }),
          );
        },
      }),
      [applyCamera, zoomAroundViewportCenter],
    );

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

      const documentRenderer = new Canvas2DRenderer(context);

      const selectionRenderer = new SelectionOverlayRenderer(context);

      let animationFrameId: number | null = null;

      let isSpacePressed = false;

      let pointerInteraction: PointerInteraction = "idle";

      let activePointerId: number | null = null;

      let draggedNodeId: NodeId | null = null;

      let lastPointerPosition: Point = {
        x: 0,
        y: 0,
      };

      let lastDragWorldPosition: Point | null = null;

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

        documentRenderer.render(
          documentRef.current,
          cameraRef.current,
          pixelRatio,
        );

        selectionRenderer.render(
          documentRef.current,
          selectionRef.current,
          cameraRef.current,
          pixelRatio,
        );
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

      requestRenderRef.current = requestRender;

      const getScreenPoint = (event: PointerEvent): Point => {
        const viewportRect = viewport.getBoundingClientRect();

        return {
          x: event.clientX - viewportRect.left,

          y: event.clientY - viewportRect.top,
        };
      };

      const getWorldPoint = (event: PointerEvent): Point => {
        return screenToWorld(getScreenPoint(event), cameraRef.current);
      };

      const releasePointerCapture = (pointerId: number) => {
        if (canvas.hasPointerCapture(pointerId)) {
          canvas.releasePointerCapture(pointerId);
        }
      };

      const endPointerInteraction = (commitDocument: boolean) => {
        if (pointerInteraction === "dragging-node" && commitDocument) {
          onDocumentChangeRef.current(documentRef.current);
        }

        pointerInteraction = "idle";

        activePointerId = null;
        draggedNodeId = null;
        lastDragWorldPosition = null;

        delete viewport.dataset.panning;

        delete viewport.dataset.draggingNode;
      };

      const updateSelection = (nodeId: NodeId | null) => {
        const nextSelection = nodeId
          ? selectSingleNode(selectionRef.current, nodeId)
          : clearSelection(selectionRef.current);

        if (nextSelection === selectionRef.current) {
          return;
        }

        selectionRef.current = nextSelection;

        onSelectionChangeRef.current(nextSelection);

        requestRender();
      };

      const startNodeDrag = (
        event: PointerEvent,
        nodeId: NodeId,
        worldPoint: Point,
      ) => {
        pointerInteraction = "dragging-node";

        activePointerId = event.pointerId;

        draggedNodeId = nodeId;

        lastDragWorldPosition = worldPoint;

        canvas.setPointerCapture(event.pointerId);

        viewport.dataset.draggingNode = "true";
      };

      const startPan = (event: PointerEvent) => {
        pointerInteraction = "panning";

        activePointerId = event.pointerId;

        lastPointerPosition = {
          x: event.clientX,
          y: event.clientY,
        };

        canvas.setPointerCapture(event.pointerId);

        viewport.dataset.panning = "true";
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.code !== "Space" || isEditableElement(event.target)) {
          return;
        }

        event.preventDefault();

        isSpacePressed = true;

        if (pointerInteraction === "idle") {
          viewport.dataset.panReady = "true";
        }
      };

      const handleKeyUp = (event: KeyboardEvent) => {
        if (event.code !== "Space") {
          return;
        }

        event.preventDefault();

        isSpacePressed = false;

        delete viewport.dataset.panReady;

        if (pointerInteraction === "panning") {
          if (activePointerId !== null) {
            releasePointerCapture(activePointerId);
          }

          endPointerInteraction(false);
        }
      };

      const handlePointerDown = (event: PointerEvent) => {
        if (event.button !== 0) {
          return;
        }

        event.preventDefault();

        if (isSpacePressed) {
          startPan(event);

          return;
        }

        const worldPoint = getWorldPoint(event);

        const hitNodeId = hitTestDocument(documentRef.current, worldPoint);

        updateSelection(hitNodeId);

        if (!hitNodeId) {
          return;
        }

        startNodeDrag(event, hitNodeId, worldPoint);
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (event.pointerId !== activePointerId) {
          return;
        }

        if (pointerInteraction === "panning") {
          const deltaX = event.clientX - lastPointerPosition.x;

          const deltaY = event.clientY - lastPointerPosition.y;

          lastPointerPosition = {
            x: event.clientX,
            y: event.clientY,
          };

          cameraRef.current = panCamera(cameraRef.current, deltaX, deltaY);

          requestRender();

          return;
        }

        if (
          pointerInteraction !== "dragging-node" ||
          !draggedNodeId ||
          !lastDragWorldPosition
        ) {
          return;
        }

        const worldPoint = getWorldPoint(event);

        const delta = {
          x: worldPoint.x - lastDragWorldPosition.x,

          y: worldPoint.y - lastDragWorldPosition.y,
        };

        lastDragWorldPosition = worldPoint;

        documentRef.current = moveNodeBy(
          documentRef.current,
          draggedNodeId,
          delta,
        );

        requestRender();
      };

      const handlePointerUp = (event: PointerEvent) => {
        if (event.pointerId !== activePointerId) {
          return;
        }

        releasePointerCapture(event.pointerId);

        endPointerInteraction(true);
      };

      const handlePointerCancel = (event: PointerEvent) => {
        if (event.pointerId !== activePointerId) {
          return;
        }

        releasePointerCapture(event.pointerId);

        endPointerInteraction(true);
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

        applyCamera(
          zoomCameraAtPoint(cameraRef.current, pointerPosition, nextZoom),
        );
      };

      const handleWindowBlur = () => {
        isSpacePressed = false;

        delete viewport.dataset.panReady;

        if (activePointerId !== null) {
          releasePointerCapture(activePointerId);
        }

        endPointerInteraction(true);
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

      canvas.addEventListener("pointercancel", handlePointerCancel);

      canvas.addEventListener("wheel", handleWheel, {
        passive: false,
      });

      return () => {
        resizeObserver.disconnect();

        requestRenderRef.current = () => undefined;

        window.removeEventListener("keydown", handleKeyDown);

        window.removeEventListener("keyup", handleKeyUp);

        window.removeEventListener("blur", handleWindowBlur);

        canvas.removeEventListener("pointerdown", handlePointerDown);

        canvas.removeEventListener("pointermove", handlePointerMove);

        canvas.removeEventListener("pointerup", handlePointerUp);

        canvas.removeEventListener("pointercancel", handlePointerCancel);

        canvas.removeEventListener("wheel", handleWheel);

        if (animationFrameId !== null) {
          window.cancelAnimationFrame(animationFrameId);
        }
      };
    }, [applyCamera]);

    return (
      <div ref={viewportRef} className={styles.viewport}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          aria-label="CanvasLab design canvas"
        />
      </div>
    );
  },
);
