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
import {
  beginGestureTransaction,
  type GestureTransaction,
  type GestureTransactionCommit,
} from "@/editor/commands/gestureTransaction";
import { getDocumentBounds } from "@/editor/document/documentBounds";
import { getNodeWorldGeometry } from "@/editor/document/nodeGeometry";
import { moveNodesBy } from "@/editor/document/documentOperations";
import type { EditorDocument, NodeId } from "@/editor/document/types";
import { AlignmentGuideRenderer } from "@/editor/renderer/AlignmentGuideRenderer";
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
  isNodeSelected,
  selectNodes,
  selectSingleNode,
  toggleNodeSelection,
  type SelectionState,
} from "@/editor/selection/selection";
import {
  createMultiSelectionTransformSession,
  resizeMultiSelection,
  rotateMultiSelection,
  translateMultiSelection,
  type MultiSelectionTransformSession,
} from "@/editor/transform/multiSelectionTransform";
import {
  createNodeResizeSession,
  resizeNodeWithSession,
  type NodeResizeSession,
} from "@/editor/transform/nodeResize";
import {
  findNodeResizeHandleAtPoint,
  findResizeHandleAtPoint,
  getResizeHandleCursor,
} from "@/editor/transform/resizeHandles";
import {
  getPointerAngleDegrees,
  getShortestAngleDelta,
  normalizeRotation,
  rotateNodeTo,
} from "@/editor/transform/rotation";
import {
  getRotationHandleForBounds,
  getRotationHandleGeometry,
  isPointOnRotationHandle,
} from "@/editor/transform/rotationHandle";
import { getSelectionBounds } from "@/editor/transform/selectionBounds";
import {
  canSnapSingleNodeResize,
  createSnapCandidates,
  createSnapGuidesFromMatches,
  snapAngle,
  snapBoundsTranslation,
  snapResizePoint,
  type SnapCandidate,
  type SnapGuide,
} from "@/editor/transform/snapping";
import type {
  ResizeHandlePosition,
  TransformBounds,
} from "@/editor/transform/types";

import styles from "./EditorCanvas.module.css";

interface EditorCanvasProps {
  document: EditorDocument;
  selection: SelectionState;

  onGestureCommit: (commit: GestureTransactionCommit) => void;
  onSelectionChange: (selection: SelectionState) => void;
  onNudgeSelection: (delta: Point) => void;
  onDeleteSelection: () => void;
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
  | "dragging-selection"
  | "resizing-node"
  | "resizing-selection"
  | "rotating-node"
  | "rotating-selection"
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
      return { x: -distance, y: 0 };
    case "ArrowRight":
      return { x: distance, y: 0 };
    case "ArrowUp":
      return { x: 0, y: -distance };
    case "ArrowDown":
      return { x: 0, y: distance };
    default:
      return null;
  }
}

export const EditorCanvas = forwardRef<EditorCanvasHandle, EditorCanvasProps>(
  function EditorCanvas(
    {
      document,
      selection,
      onGestureCommit,
      onSelectionChange,
      onNudgeSelection,
      onDeleteSelection,
      onZoomChange,
    },
    ref,
  ) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cameraRef = useRef<CameraState>(createCamera());
    const documentRef = useRef<EditorDocument>(document);
    const selectionRef = useRef<SelectionState>(selection);
    const onGestureCommitRef = useRef(onGestureCommit);
    const onSelectionChangeRef = useRef(onSelectionChange);
    const onNudgeSelectionRef = useRef(onNudgeSelection);
    const onDeleteSelectionRef = useRef(onDeleteSelection);
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
      onGestureCommitRef.current = onGestureCommit;
    }, [onGestureCommit]);

    useEffect(() => {
      onSelectionChangeRef.current = onSelectionChange;
    }, [onSelectionChange]);

    useEffect(() => {
      onNudgeSelectionRef.current = onNudgeSelection;
    }, [onNudgeSelection]);

    useEffect(() => {
      onDeleteSelectionRef.current = onDeleteSelection;
    }, [onDeleteSelection]);

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
      const guideRenderer = new AlignmentGuideRenderer(context);
      const selectionRenderer = new SelectionOverlayRenderer(context);
      const marqueeRenderer = new MarqueeOverlayRenderer(context);

      let animationFrameId: number | null = null;
      let isSpacePressed = false;
      let pointerInteraction: PointerInteraction = "idle";
      let activePointerId: number | null = null;
      let gestureTransaction: GestureTransaction | null = null;

      let dragStartWorld: Point | null = null;
      let dragInitialBounds: TransformBounds | null = null;
      let dragBaseDocument: EditorDocument | null = null;
      let dragNodeIds: NodeId[] = [];

      let lastPointerPosition: Point = { x: 0, y: 0 };

      let resizeSession: NodeResizeSession | null = null;
      let selectionTransformSession: MultiSelectionTransformSession | null =
        null;
      let selectionResizeHandle: ResizeHandlePosition | null = null;

      let rotatingNodeId: NodeId | null = null;
      let rotationCenter: Point | null = null;
      let initialNodeRotation = 0;
      let lastRotationPointerAngle = 0;
      let accumulatedRotationDelta = 0;

      let snapCandidates: SnapCandidate[] = [];
      let activeGuides: SnapGuide[] = [];

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

        guideRenderer.render(activeGuides, cameraRef.current, pixelRatio);

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

      const clearTransformCursor = () => {
        delete viewport.dataset.transformHandle;
        viewport.style.cursor = "";
      };

      const clearSnapping = () => {
        snapCandidates = [];
        activeGuides = [];
      };

      const updateTransformHover = (event: PointerEvent) => {
        if (
          isSpacePressed ||
          selectionRef.current.selectedNodeIds.length === 0
        ) {
          clearTransformCursor();
          return;
        }

        const worldPoint = getWorldPoint(event);

        if (selectionRef.current.selectedNodeIds.length === 1) {
          const nodeId = selectionRef.current.selectedNodeIds[0];
          const geometry = getNodeWorldGeometry(documentRef.current, nodeId);

          if (!geometry) {
            clearTransformCursor();
            return;
          }

          const rotationHandle = getRotationHandleGeometry(
            geometry,
            cameraRef.current.zoom,
          );

          if (
            isPointOnRotationHandle(
              rotationHandle,
              worldPoint,
              cameraRef.current.zoom,
            )
          ) {
            viewport.dataset.transformHandle = "rotation";
            viewport.style.cursor = "grab";
            return;
          }

          const resizeHandle = findNodeResizeHandleAtPoint(
            geometry,
            worldPoint,
            cameraRef.current.zoom,
          );

          if (!resizeHandle) {
            clearTransformCursor();
            return;
          }

          viewport.dataset.transformHandle = resizeHandle;
          viewport.style.cursor = getResizeHandleCursor(
            resizeHandle,
            geometry.rotation,
          );
          return;
        }

        const bounds = getSelectionBounds(
          documentRef.current,
          selectionRef.current,
        );

        if (!bounds) {
          clearTransformCursor();
          return;
        }

        const rotationHandle = getRotationHandleForBounds(
          bounds,
          cameraRef.current.zoom,
        );

        if (
          isPointOnRotationHandle(
            rotationHandle,
            worldPoint,
            cameraRef.current.zoom,
          )
        ) {
          viewport.dataset.transformHandle = "rotation";
          viewport.style.cursor = "grab";
          return;
        }

        const resizeHandle = findResizeHandleAtPoint(
          bounds,
          worldPoint,
          cameraRef.current.zoom,
        );

        if (!resizeHandle) {
          clearTransformCursor();
          return;
        }

        viewport.dataset.transformHandle = resizeHandle;
        viewport.style.cursor = getResizeHandleCursor(resizeHandle, 0);
      };

      const endPointerInteraction = (shouldCommitGesture: boolean) => {
        const isTransformInteraction =
          pointerInteraction === "dragging-node" ||
          pointerInteraction === "dragging-selection" ||
          pointerInteraction === "resizing-node" ||
          pointerInteraction === "resizing-selection" ||
          pointerInteraction === "rotating-node" ||
          pointerInteraction === "rotating-selection";

        if (isTransformInteraction && gestureTransaction) {
          if (shouldCommitGesture) {
            onGestureCommitRef.current({
              transaction: gestureTransaction,
              nextDocument: documentRef.current,
              nextSelection: selectionRef.current,
            });
          } else {
            documentRef.current = gestureTransaction.before.document;
            selectionRef.current = gestureTransaction.before.selection;
          }
        }

        pointerInteraction = "idle";
        activePointerId = null;
        gestureTransaction = null;
        dragStartWorld = null;
        dragInitialBounds = null;
        dragBaseDocument = null;
        dragNodeIds = [];
        resizeSession = null;
        selectionTransformSession = null;
        selectionResizeHandle = null;
        rotatingNodeId = null;
        rotationCenter = null;
        initialNodeRotation = 0;
        lastRotationPointerAngle = 0;
        accumulatedRotationDelta = 0;
        marquee = null;
        marqueeStartClientPosition = null;

        clearSnapping();

        delete viewport.dataset.panning;
        delete viewport.dataset.draggingNode;
        delete viewport.dataset.resizingNode;
        delete viewport.dataset.rotatingNode;
        delete viewport.dataset.marqueeSelecting;

        clearTransformCursor();
        requestRender();
      };

      const startNodeDrag = (
        event: PointerEvent,
        nodeId: NodeId,
        worldPoint: Point,
      ) => {
        const initialBounds = getSelectionBounds(documentRef.current, {
          selectedNodeIds: [nodeId],
        });

        if (!initialBounds) {
          return;
        }

        gestureTransaction = beginGestureTransaction(
          "move",
          "Move selection",
          documentRef.current,
          selectionRef.current,
        );

        pointerInteraction = "dragging-node";
        activePointerId = event.pointerId;
        dragStartWorld = worldPoint;
        dragInitialBounds = initialBounds;
        dragBaseDocument = documentRef.current;
        dragNodeIds = [nodeId];
        snapCandidates = createSnapCandidates(documentRef.current, [nodeId]);
        activeGuides = [];

        canvas.setPointerCapture(event.pointerId);
        viewport.dataset.draggingNode = "true";
      };

      const startSelectionDrag = (
        event: PointerEvent,
        worldPoint: Point,
      ): boolean => {
        const session = createMultiSelectionTransformSession(
          documentRef.current,
          selectionRef.current,
        );

        if (!session) {
          return false;
        }

        gestureTransaction = beginGestureTransaction(
          "move",
          "Move selection",
          documentRef.current,
          selectionRef.current,
        );

        pointerInteraction = "dragging-selection";
        activePointerId = event.pointerId;
        selectionTransformSession = session;
        dragStartWorld = worldPoint;
        dragInitialBounds = session.initialBounds;
        snapCandidates = createSnapCandidates(
          documentRef.current,
          selectionRef.current.selectedNodeIds,
        );
        activeGuides = [];

        canvas.setPointerCapture(event.pointerId);
        viewport.dataset.draggingNode = "true";

        return true;
      };

      const startNodeResize = (
        event: PointerEvent,
        nodeId: NodeId,
        handle: ResizeHandlePosition,
      ) => {
        const session = createNodeResizeSession(
          documentRef.current,
          nodeId,
          handle,
        );

        if (!session) {
          return;
        }

        gestureTransaction = beginGestureTransaction(
          "resize",
          "Resize selection",
          documentRef.current,
          selectionRef.current,
        );

        pointerInteraction = "resizing-node";
        activePointerId = event.pointerId;
        resizeSession = session;
        snapCandidates = createSnapCandidates(documentRef.current, [nodeId]);
        activeGuides = [];

        canvas.setPointerCapture(event.pointerId);
        viewport.dataset.resizingNode = "true";
        viewport.dataset.transformHandle = handle;
        viewport.style.cursor = getResizeHandleCursor(
          handle,
          session.worldRotation,
        );
      };

      const startSelectionResize = (
        event: PointerEvent,
        handle: ResizeHandlePosition,
      ) => {
        const session = createMultiSelectionTransformSession(
          documentRef.current,
          selectionRef.current,
        );

        if (!session) {
          return;
        }

        gestureTransaction = beginGestureTransaction(
          "resize",
          "Resize selection",
          documentRef.current,
          selectionRef.current,
        );

        pointerInteraction = "resizing-selection";
        activePointerId = event.pointerId;
        selectionTransformSession = session;
        selectionResizeHandle = handle;
        snapCandidates = createSnapCandidates(
          documentRef.current,
          selectionRef.current.selectedNodeIds,
        );
        activeGuides = [];

        canvas.setPointerCapture(event.pointerId);
        viewport.dataset.resizingNode = "true";
        viewport.dataset.transformHandle = handle;
        viewport.style.cursor = getResizeHandleCursor(handle, 0);
      };

      const startNodeRotation = (
        event: PointerEvent,
        nodeId: NodeId,
        center: Point,
        worldPoint: Point,
      ) => {
        const node = documentRef.current.nodes[nodeId];

        if (!node || node.locked) {
          return;
        }

        clearSnapping();

        gestureTransaction = beginGestureTransaction(
          "rotate",
          "Rotate selection",
          documentRef.current,
          selectionRef.current,
        );

        pointerInteraction = "rotating-node";
        activePointerId = event.pointerId;
        rotatingNodeId = nodeId;
        rotationCenter = center;
        initialNodeRotation = node.rotation;
        lastRotationPointerAngle = getPointerAngleDegrees(center, worldPoint);
        accumulatedRotationDelta = 0;

        canvas.setPointerCapture(event.pointerId);
        viewport.dataset.rotatingNode = "true";
        viewport.dataset.transformHandle = "rotation";
        viewport.style.cursor = "grabbing";
      };

      const startSelectionRotation = (
        event: PointerEvent,
        worldPoint: Point,
      ) => {
        const session = createMultiSelectionTransformSession(
          documentRef.current,
          selectionRef.current,
        );

        if (!session) {
          return;
        }

        clearSnapping();

        gestureTransaction = beginGestureTransaction(
          "rotate",
          "Rotate selection",
          documentRef.current,
          selectionRef.current,
        );

        const center = {
          x: session.initialBounds.centerX,
          y: session.initialBounds.centerY,
        };

        pointerInteraction = "rotating-selection";
        activePointerId = event.pointerId;
        selectionTransformSession = session;
        rotationCenter = center;
        lastRotationPointerAngle = getPointerAngleDegrees(center, worldPoint);
        accumulatedRotationDelta = 0;

        canvas.setPointerCapture(event.pointerId);
        viewport.dataset.rotatingNode = "true";
        viewport.dataset.transformHandle = "rotation";
        viewport.style.cursor = "grabbing";
      };

      const startPan = (event: PointerEvent) => {
        clearSnapping();
        gestureTransaction = null;
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
        clearSnapping();
        gestureTransaction = null;
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

      const updateNodeDrag = (event: PointerEvent) => {
        if (
          !dragStartWorld ||
          !dragInitialBounds ||
          !dragBaseDocument ||
          dragNodeIds.length === 0
        ) {
          return;
        }

        const currentWorld = getWorldPoint(event);
        const desiredDelta = {
          x: currentWorld.x - dragStartWorld.x,
          y: currentWorld.y - dragStartWorld.y,
        };

        const snapped = snapBoundsTranslation(
          dragInitialBounds,
          desiredDelta,
          snapCandidates,
          cameraRef.current.zoom,
        );

        activeGuides = snapped.guides;
        documentRef.current = moveNodesBy(
          dragBaseDocument,
          dragNodeIds,
          snapped.delta,
        );

        requestRender();
      };

      const updateSelectionDrag = (event: PointerEvent) => {
        if (
          !selectionTransformSession ||
          !dragStartWorld ||
          !dragInitialBounds
        ) {
          return;
        }

        const currentWorld = getWorldPoint(event);
        const desiredDelta = {
          x: currentWorld.x - dragStartWorld.x,
          y: currentWorld.y - dragStartWorld.y,
        };

        const snapped = snapBoundsTranslation(
          dragInitialBounds,
          desiredDelta,
          snapCandidates,
          cameraRef.current.zoom,
        );

        activeGuides = snapped.guides;
        documentRef.current = translateMultiSelection(
          documentRef.current,
          selectionTransformSession,
          snapped.delta,
        );

        requestRender();
      };

      const updateNodeResize = (event: PointerEvent) => {
        if (!resizeSession) {
          return;
        }

        let pointerWorld = getWorldPoint(event);
        let matches: ReturnType<typeof snapResizePoint>["matches"] = [];

        const canSnap =
          !event.shiftKey &&
          canSnapSingleNodeResize(resizeSession.worldRotation);

        if (canSnap) {
          const snapped = snapResizePoint(
            pointerWorld,
            resizeSession.handle,
            snapCandidates,
            cameraRef.current.zoom,
          );

          pointerWorld = snapped.point;
          matches = snapped.matches;
        }

        documentRef.current = resizeNodeWithSession(
          documentRef.current,
          resizeSession,
          pointerWorld,
          {
            preserveAspectRatio: event.shiftKey,
            fromCenter: event.altKey,
          },
        );

        if (matches.length > 0) {
          const bounds = getSelectionBounds(documentRef.current, {
            selectedNodeIds: [resizeSession.nodeId],
          });

          activeGuides = bounds
            ? createSnapGuidesFromMatches(matches, bounds)
            : [];
        } else {
          activeGuides = [];
        }

        requestRender();
      };

      const updateSelectionResize = (event: PointerEvent) => {
        if (!selectionTransformSession || !selectionResizeHandle) {
          return;
        }

        let pointerWorld = getWorldPoint(event);
        let matches: ReturnType<typeof snapResizePoint>["matches"] = [];

        const canSnap =
          !event.shiftKey && !selectionTransformSession.requiresUniformScaling;

        if (canSnap) {
          const snapped = snapResizePoint(
            pointerWorld,
            selectionResizeHandle,
            snapCandidates,
            cameraRef.current.zoom,
          );

          pointerWorld = snapped.point;
          matches = snapped.matches;
        }

        documentRef.current = resizeMultiSelection(
          documentRef.current,
          selectionTransformSession,
          selectionResizeHandle,
          pointerWorld,
          {
            preserveAspectRatio: event.shiftKey,
            fromCenter: event.altKey,
          },
        );

        if (matches.length > 0) {
          const bounds = getSelectionBounds(
            documentRef.current,
            selectionRef.current,
          );

          activeGuides = bounds
            ? createSnapGuidesFromMatches(matches, bounds)
            : [];
        } else {
          activeGuides = [];
        }

        requestRender();
      };

      const updateNodeRotation = (event: PointerEvent) => {
        if (!rotatingNodeId || !rotationCenter) {
          return;
        }

        activeGuides = [];

        const currentAngle = getPointerAngleDegrees(
          rotationCenter,
          getWorldPoint(event),
        );

        const delta = getShortestAngleDelta(
          lastRotationPointerAngle,
          currentAngle,
        );

        accumulatedRotationDelta += delta;
        lastRotationPointerAngle = currentAngle;

        const rawRotation = normalizeRotation(
          initialNodeRotation + accumulatedRotationDelta,
        );

        const nextRotation = event.shiftKey
          ? normalizeRotation(snapAngle(rawRotation))
          : rawRotation;

        documentRef.current = rotateNodeTo(
          documentRef.current,
          rotatingNodeId,
          nextRotation,
        );

        requestRender();
      };

      const updateSelectionRotation = (event: PointerEvent) => {
        if (!selectionTransformSession || !rotationCenter) {
          return;
        }

        activeGuides = [];

        const currentAngle = getPointerAngleDegrees(
          rotationCenter,
          getWorldPoint(event),
        );

        const delta = getShortestAngleDelta(
          lastRotationPointerAngle,
          currentAngle,
        );

        accumulatedRotationDelta += delta;
        lastRotationPointerAngle = currentAngle;

        const rotationDelta = event.shiftKey
          ? snapAngle(accumulatedRotationDelta)
          : accumulatedRotationDelta;

        documentRef.current = rotateMultiSelection(
          documentRef.current,
          selectionTransformSession,
          rotationDelta,
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
          clearTransformCursor();
          clearSnapping();

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
          onDeleteSelectionRef.current();
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
        onNudgeSelectionRef.current(delta);
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
        canvas.focus({ preventScroll: true });

        if (isSpacePressed) {
          startPan(event);
          return;
        }

        const worldPoint = getWorldPoint(event);
        const selectionCount = selectionRef.current.selectedNodeIds.length;

        if (selectionCount === 1) {
          const selectedNodeId = selectionRef.current.selectedNodeIds[0];
          const geometry = getNodeWorldGeometry(
            documentRef.current,
            selectedNodeId,
          );

          if (geometry) {
            const rotationHandle = getRotationHandleGeometry(
              geometry,
              cameraRef.current.zoom,
            );

            if (
              isPointOnRotationHandle(
                rotationHandle,
                worldPoint,
                cameraRef.current.zoom,
              )
            ) {
              startNodeRotation(
                event,
                selectedNodeId,
                geometry.center,
                worldPoint,
              );
              return;
            }

            const resizeHandle = findNodeResizeHandleAtPoint(
              geometry,
              worldPoint,
              cameraRef.current.zoom,
            );

            if (resizeHandle) {
              startNodeResize(event, selectedNodeId, resizeHandle);
              return;
            }
          }
        }

        if (selectionCount > 1) {
          const bounds = getSelectionBounds(
            documentRef.current,
            selectionRef.current,
          );

          if (bounds) {
            const rotationHandle = getRotationHandleForBounds(
              bounds,
              cameraRef.current.zoom,
            );

            if (
              isPointOnRotationHandle(
                rotationHandle,
                worldPoint,
                cameraRef.current.zoom,
              )
            ) {
              startSelectionRotation(event, worldPoint);
              return;
            }

            const resizeHandle = findResizeHandleAtPoint(
              bounds,
              worldPoint,
              cameraRef.current.zoom,
            );

            if (resizeHandle) {
              startSelectionResize(event, resizeHandle);
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
          if (
            selectionCount > 1 &&
            isNodeSelected(selectionRef.current, hitNodeId)
          ) {
            const started = startSelectionDrag(event, worldPoint);

            if (started) {
              return;
            }
          }

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
          updateTransformHover(event);
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

        if (pointerInteraction === "dragging-node") {
          updateNodeDrag(event);
          return;
        }

        if (pointerInteraction === "dragging-selection") {
          updateSelectionDrag(event);
          return;
        }

        if (pointerInteraction === "resizing-node") {
          updateNodeResize(event);
          return;
        }

        if (pointerInteraction === "resizing-selection") {
          updateSelectionResize(event);
          return;
        }

        if (pointerInteraction === "rotating-node") {
          updateNodeRotation(event);
          return;
        }

        if (pointerInteraction === "rotating-selection") {
          updateSelectionRotation(event);
          return;
        }

        if (pointerInteraction === "marquee") {
          updateMarquee(event);
        }
      };

      const handlePointerUp = (event: PointerEvent) => {
        if (event.pointerId !== activePointerId) {
          return;
        }

        if (pointerInteraction === "marquee") {
          updateMarquee(event);

          const start = marqueeStartClientPosition;
          const dragDistance = start
            ? Math.hypot(event.clientX - start.x, event.clientY - start.y)
            : 0;

          if (dragDistance < MARQUEE_DRAG_THRESHOLD) {
            applyRuntimeSelection(
              marqueeAdditive
                ? marqueeBaseSelection
                : clearSelection(selectionRef.current),
            );
          }

          commitSelection();
        }

        if (pointerInteraction === "dragging-node") {
          updateNodeDrag(event);
        }

        if (pointerInteraction === "dragging-selection") {
          updateSelectionDrag(event);
        }

        if (pointerInteraction === "resizing-node") {
          updateNodeResize(event);
        }

        if (pointerInteraction === "resizing-selection") {
          updateSelectionResize(event);
        }

        if (pointerInteraction === "rotating-node") {
          updateNodeRotation(event);
        }

        if (pointerInteraction === "rotating-selection") {
          updateSelectionRotation(event);
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
        endPointerInteraction(false);
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
          clearTransformCursor();
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
      canvas.addEventListener("wheel", handleWheel, { passive: false });

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
