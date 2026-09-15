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
import { getNodeWorldBounds } from "@/editor/document/nodeGeometry";
import {
  deleteNodes,
  moveNodeBy,
  moveNodesBy,
  resizeNodeToWorldBounds,
} from "@/editor/document/documentOperations";
import type { EditorDocument, NodeId } from "@/editor/document/types";
import { Canvas2DRenderer } from "@/editor/renderer/Canvas2DRenderer";
import { MarqueeOverlayRenderer } from "@/editor/renderer/MarqueeOverlayRenderer";
import { SelectionOverlayRenderer } from "@/editor/renderer/SelectionOverlayRenderer";
import { hitTestDocument } from "@/editor/selection/hitTest";
import {
  findNodesWithinMarquee,
  getMarqueeBounds,
  type MarqueeState,
} from "@/editor/selection/marquee";
import {
  addNodesToSelection,
  clearSelection,
  selectNodes,
  selectSingleNode,
  toggleNodeSelection,
  type SelectionState,
} from "@/editor/selection/selection";
import { resizeBoundsFromHandle } from "@/editor/transform/resizeBounds";
import { findResizeHandleAtPoint } from "@/editor/transform/resizeHandles";
import { getSelectionBounds } from "@/editor/transform/selectionBounds";
import type { ResizeHandlePosition } from "@/editor/transform/types";

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

type PointerInteraction =
  | "idle"
  | "panning"
  | "dragging-node"
  | "resizing-node"
  | "marquee";

const ZOOM_SENSITIVITY = 0.0015;
const MARQUEE_DRAG_THRESHOLD = 3;

const KEYBOARD_NUDGE = 1;
const KEYBOARD_LARGE_NUDGE = 10;

function shouldIgnoreEditorShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLButtonElement ||
    target instanceof HTMLAnchorElement
  );
}

function getKeyboardMoveDelta(key: string, distance: number): Point | null {
  switch (key) {
    case "ArrowLeft":
      return {
        x: -distance,
        y: 0,
      };

    case "ArrowRight":
      return {
        x: distance,
        y: 0,
      };

    case "ArrowUp":
      return {
        x: 0,
        y: -distance,
      };

    case "ArrowDown":
      return {
        x: 0,
        y: distance,
      };

    default:
      return null;
  }
}

function getResizeHandleCursor(handle: ResizeHandlePosition): string {
  switch (handle) {
    case "north":
    case "south":
      return "ns-resize";

    case "east":
    case "west":
      return "ew-resize";

    case "north-west":
    case "south-east":
      return "nwse-resize";

    case "north-east":
    case "south-west":
      return "nesw-resize";
  }
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

      const marqueeRenderer = new MarqueeOverlayRenderer(context);

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

      let resizingNodeId: NodeId | null = null;

      let activeResizeHandle: ResizeHandlePosition | null = null;

      let initialResizeBounds: {
        x: number;
        y: number;
        width: number;
        height: number;
      } | null = null;

      let marquee: MarqueeState | null = null;

      let marqueeBaseSelection: SelectionState = selectionRef.current;

      let marqueeAdditive = false;

      let marqueeStartClientPosition: Point | null = null;

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

        marqueeRenderer.render(marquee, cameraRef.current, pixelRatio);
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

      const applyRuntimeSelection = (nextSelection: SelectionState) => {
        if (nextSelection === selectionRef.current) {
          return;
        }

        selectionRef.current = nextSelection;

        requestRender();
      };

      const commitSelection = () => {
        onSelectionChangeRef.current(selectionRef.current);
      };

      const commitDocument = (nextDocument: EditorDocument) => {
        if (nextDocument === documentRef.current) {
          return;
        }

        documentRef.current = nextDocument;

        onDocumentChangeRef.current(nextDocument);

        requestRender();
      };

      const clearResizeCursor = () => {
        delete viewport.dataset.resizeHandle;

        viewport.style.cursor = "";
      };

      const updateResizeHandleHover = (event: PointerEvent) => {
        if (
          isSpacePressed ||
          selectionRef.current.selectedNodeIds.length !== 1
        ) {
          clearResizeCursor();

          return;
        }

        const bounds = getSelectionBounds(
          documentRef.current,
          selectionRef.current,
        );

        if (!bounds) {
          clearResizeCursor();

          return;
        }

        const handle = findResizeHandleAtPoint(
          bounds,
          getWorldPoint(event),
          cameraRef.current.zoom,
        );

        if (!handle) {
          clearResizeCursor();

          return;
        }

        viewport.dataset.resizeHandle = handle;

        viewport.style.cursor = getResizeHandleCursor(handle);
      };

      const endPointerInteraction = (shouldCommitDocument: boolean) => {
        if (
          (pointerInteraction === "dragging-node" ||
            pointerInteraction === "resizing-node") &&
          shouldCommitDocument
        ) {
          onDocumentChangeRef.current(documentRef.current);
        }

        pointerInteraction = "idle";

        activePointerId = null;

        draggedNodeId = null;

        lastDragWorldPosition = null;

        resizingNodeId = null;

        activeResizeHandle = null;

        initialResizeBounds = null;

        marquee = null;

        marqueeStartClientPosition = null;

        delete viewport.dataset.panning;

        delete viewport.dataset.draggingNode;

        delete viewport.dataset.resizingNode;

        delete viewport.dataset.marqueeSelecting;

        clearResizeCursor();

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

      const startResize = (
        event: PointerEvent,
        nodeId: NodeId,
        handle: ResizeHandlePosition,
      ) => {
        const nodeBounds = getNodeWorldBounds(documentRef.current, nodeId);

        if (!nodeBounds) {
          return;
        }

        pointerInteraction = "resizing-node";

        activePointerId = event.pointerId;

        resizingNodeId = nodeId;

        activeResizeHandle = handle;

        initialResizeBounds = nodeBounds;

        canvas.setPointerCapture(event.pointerId);

        viewport.dataset.resizingNode = "true";

        viewport.dataset.resizeHandle = handle;

        viewport.style.cursor = getResizeHandleCursor(handle);
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

      const startMarquee = (event: PointerEvent, worldPoint: Point) => {
        pointerInteraction = "marquee";

        activePointerId = event.pointerId;

        marquee = {
          start: worldPoint,
          current: worldPoint,
        };

        marqueeBaseSelection = selectionRef.current;

        marqueeAdditive = event.shiftKey;

        marqueeStartClientPosition = {
          x: event.clientX,
          y: event.clientY,
        };

        canvas.setPointerCapture(event.pointerId);

        viewport.dataset.marqueeSelecting = "true";

        requestRender();
      };

      const updateMarquee = (event: PointerEvent) => {
        if (!marquee) {
          return;
        }

        marquee = {
          ...marquee,

          current: getWorldPoint(event),
        };

        const marqueeBounds = getMarqueeBounds(marquee);

        const candidateNodeIds = findNodesWithinMarquee(
          documentRef.current,
          marqueeBounds,
        );

        const nextSelection = marqueeAdditive
          ? addNodesToSelection(marqueeBaseSelection, candidateNodeIds)
          : selectNodes(selectionRef.current, candidateNodeIds);

        applyRuntimeSelection(nextSelection);

        requestRender();
      };

      const updateNodeResize = (event: PointerEvent) => {
        if (!resizingNodeId || !activeResizeHandle || !initialResizeBounds) {
          return;
        }

        const pointerWorld = getWorldPoint(event);

        const nextBounds = resizeBoundsFromHandle(
          initialResizeBounds,
          activeResizeHandle,
          pointerWorld,
          {
            preserveAspectRatio: event.shiftKey,

            fromCenter: event.altKey,
          },
        );

        documentRef.current = resizeNodeToWorldBounds(
          documentRef.current,
          resizingNodeId,
          nextBounds,
        );

        requestRender();
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (shouldIgnoreEditorShortcut(event.target)) {
          return;
        }

        if (event.code === "Space") {
          event.preventDefault();

          isSpacePressed = true;

          clearResizeCursor();

          if (pointerInteraction === "idle") {
            viewport.dataset.panReady = "true";
          }

          return;
        }

        if (pointerInteraction !== "idle") {
          return;
        }

        if (event.key === "Escape") {
          const nextSelection = clearSelection(selectionRef.current);

          if (nextSelection === selectionRef.current) {
            return;
          }

          event.preventDefault();

          applyRuntimeSelection(nextSelection);

          commitSelection();

          return;
        }

        if (
          (event.key === "Delete" || event.key === "Backspace") &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey
        ) {
          if (selectionRef.current.selectedNodeIds.length === 0) {
            return;
          }

          event.preventDefault();

          const nextDocument = deleteNodes(
            documentRef.current,
            selectionRef.current.selectedNodeIds,
          );

          commitDocument(nextDocument);

          const nextSelection = clearSelection(selectionRef.current);

          applyRuntimeSelection(nextSelection);

          commitSelection();

          return;
        }

        if (event.metaKey || event.ctrlKey || event.altKey) {
          return;
        }

        const distance = event.shiftKey ? KEYBOARD_LARGE_NUDGE : KEYBOARD_NUDGE;

        const delta = getKeyboardMoveDelta(event.key, distance);

        if (!delta) {
          return;
        }

        if (selectionRef.current.selectedNodeIds.length === 0) {
          return;
        }

        event.preventDefault();

        const nextDocument = moveNodesBy(
          documentRef.current,
          selectionRef.current.selectedNodeIds,
          delta,
        );

        commitDocument(nextDocument);
      };

      const handleKeyUp = (event: KeyboardEvent) => {
        if (event.code !== "Space") {
          return;
        }

        if (shouldIgnoreEditorShortcut(event.target)) {
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

        canvas.focus({
          preventScroll: true,
        });

        if (isSpacePressed) {
          startPan(event);

          return;
        }

        const worldPoint = getWorldPoint(event);

        if (selectionRef.current.selectedNodeIds.length === 1) {
          const selectedNodeId = selectionRef.current.selectedNodeIds[0];

          const bounds = getSelectionBounds(
            documentRef.current,
            selectionRef.current,
          );

          if (bounds) {
            const resizeHandle = findResizeHandleAtPoint(
              bounds,
              worldPoint,
              cameraRef.current.zoom,
            );

            if (resizeHandle) {
              startResize(event, selectedNodeId, resizeHandle);

              return;
            }
          }
        }

        const hitNodeId = hitTestDocument(documentRef.current, worldPoint);

        if (hitNodeId && event.shiftKey) {
          applyRuntimeSelection(
            toggleNodeSelection(selectionRef.current, hitNodeId),
          );

          commitSelection();

          return;
        }

        if (hitNodeId) {
          applyRuntimeSelection(
            selectSingleNode(selectionRef.current, hitNodeId),
          );

          commitSelection();

          startNodeDrag(event, hitNodeId, worldPoint);

          return;
        }

        startMarquee(event, worldPoint);
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (pointerInteraction === "idle") {
          updateResizeHandleHover(event);

          return;
        }

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

        if (pointerInteraction === "resizing-node") {
          updateNodeResize(event);

          return;
        }

        if (pointerInteraction === "marquee") {
          updateMarquee(event);

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

        if (pointerInteraction === "marquee") {
          updateMarquee(event);

          const start = marqueeStartClientPosition;

          const dragDistance = start
            ? Math.hypot(
                event.clientX - start.x,

                event.clientY - start.y,
              )
            : 0;

          if (dragDistance < MARQUEE_DRAG_THRESHOLD) {
            if (marqueeAdditive) {
              applyRuntimeSelection(marqueeBaseSelection);
            } else {
              applyRuntimeSelection(clearSelection(selectionRef.current));
            }
          }

          commitSelection();
        }

        if (pointerInteraction === "resizing-node") {
          updateNodeResize(event);
        }

        releasePointerCapture(event.pointerId);

        endPointerInteraction(true);
      };

      const handlePointerCancel = (event: PointerEvent) => {
        if (event.pointerId !== activePointerId) {
          return;
        }

        if (pointerInteraction === "marquee") {
          commitSelection();
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

      const handlePointerLeave = () => {
        if (pointerInteraction === "idle") {
          clearResizeCursor();
        }
      };

      const handleWindowBlur = () => {
        isSpacePressed = false;

        delete viewport.dataset.panReady;

        if (pointerInteraction === "marquee") {
          commitSelection();
        }

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

      canvas.addEventListener("pointerleave", handlePointerLeave);

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

        canvas.removeEventListener("pointerleave", handlePointerLeave);

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
          tabIndex={0}
        />
      </div>
    );
  },
);
