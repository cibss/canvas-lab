"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import {
  createCamera,
  DEFAULT_ZOOM,
  fitCameraToBounds,
  panCamera,
  screenToWorld,
  worldToScreen,
  zoomCameraAtPoint,
  ZOOM_BUTTON_FACTOR,
} from "@/editor/camera/camera";
import type { CameraState, Point } from "@/editor/camera/types";
import {
  getKeyboardEditableTextNodeId,
  shouldRestoreCanvasFocus,
  type TextEditorExitReason,
} from "@/editor/accessibility/focusSafety";
import {
  beginGestureTransaction,
  type GestureTransaction,
  type GestureTransactionCommit,
} from "@/editor/commands/gestureTransaction";
import { getDocumentBounds } from "@/editor/document/documentBounds";
import {
  createShapeNodeId,
  getShapeCreationBounds,
  insertRootShape,
} from "@/editor/document/shapeCreation";
import {
  createTextNodeId,
  insertRootText,
  updateTextNodeContent,
} from "@/editor/document/textEditing";
import { getNodeWorldGeometry } from "@/editor/document/nodeGeometry";
import { moveNodesBy } from "@/editor/document/documentOperations";
import type { EditorDocument, NodeId } from "@/editor/document/types";
import {
  requiresTextOverlaySync,
  RENDER_INVALIDATION,
  type RenderInvalidationMask,
} from "@/editor/performance/renderInvalidation";
import {
  getDirtyRenderLayers,
  type DirtyRenderLayers,
} from "@/editor/performance/renderLayers";
import { createRenderInvalidationScheduler } from "@/editor/performance/renderScheduler";
import {
  createSpatialHitTestDocument,
  createSpatialIndex,
  querySpatialIndexAtPoint,
  type SpatialIndex,
} from "@/editor/performance/spatialIndex";
import type {
  PerformanceWorkerRequest,
  PerformanceWorkerResponse,
} from "@/editor/performance/performanceWorkerProtocol";
import { shouldOffloadSpatialIndexBuild } from "@/editor/performance/workerPolicy";
import { createViewportRenderDocument } from "@/editor/performance/viewportCulling";
import { createWorldBounds } from "@/editor/performance/worldBounds";
import { AlignmentGuideRenderer } from "@/editor/renderer/AlignmentGuideRenderer";
import { Canvas2DRenderer } from "@/editor/renderer/Canvas2DRenderer";
import type { DocumentRenderer } from "@/editor/renderer/DocumentRenderer";
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
import {
  getEditorToolDefinition,
  isShapeCreationTool,
  type EditorTool,
  type ShapeEditorTool,
} from "@/editor/tools/editorTool";

import styles from "./EditorCanvas.module.css";

interface EditorCanvasProps {
  document: EditorDocument;
  selection: SelectionState;
  activeTool: EditorTool;

  onGestureCommit: (commit: GestureTransactionCommit) => void;
  onToolChange: (tool: EditorTool) => void;
  onSelectionChange: (selection: SelectionState) => void;
  onNudgeSelection: (delta: Point) => void;
  onDeleteSelection: () => void;
  onZoomChange?: (zoom: number) => void;
}

interface TextEditingSession {
  nodeId: NodeId;
  draft: string;
  transaction: GestureTransaction;
  isCreating: boolean;
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
  | "creating-shape"
  | "marquee";

const ZOOM_SENSITIVITY = 0.0015;
const MARQUEE_DRAG_THRESHOLD = 3;
const SHAPE_CREATION_DRAG_THRESHOLD = 3;
const KEYBOARD_NUDGE = 1;
const KEYBOARD_LARGE_NUDGE = 10;
const VIEWPORT_CULLING_OVERSCAN = 64;

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
      activeTool,
      onGestureCommit,
      onToolChange,
      onSelectionChange,
      onNudgeSelection,
      onDeleteSelection,
      onZoomChange,
    },
    ref,
  ) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const cameraRef = useRef<CameraState>(createCamera());
    const documentRef = useRef<EditorDocument>(document);
    const selectionRef = useRef<SelectionState>(selection);
    const activeToolRef = useRef<EditorTool>(activeTool);
    const onGestureCommitRef = useRef(onGestureCommit);
    const onToolChangeRef = useRef(onToolChange);
    const onSelectionChangeRef = useRef(onSelectionChange);
    const onNudgeSelectionRef = useRef(onNudgeSelection);
    const onDeleteSelectionRef = useRef(onDeleteSelection);
    const onZoomChangeRef = useRef(onZoomChange);
    const requestRenderRef = useRef<(mask: RenderInvalidationMask) => void>(
      () => undefined,
    );
    const scheduleSpatialIndexWarmupRef = useRef<
      (document: EditorDocument) => void
    >(() => undefined);
    const textEditorRef = useRef<HTMLTextAreaElement>(null);
    const canvasInstructionsId = useId();
    const textEditorInstructionsId = useId();
    const textEditingRef = useRef<TextEditingSession | null>(null);
    const [textEditing, setTextEditing] = useState<TextEditingSession | null>(
      null,
    );

    useEffect(() => {
      documentRef.current = document;
      requestRenderRef.current(RENDER_INVALIDATION.document);
      scheduleSpatialIndexWarmupRef.current(document);
    }, [document]);

    useEffect(() => {
      selectionRef.current = selection;
      requestRenderRef.current(RENDER_INVALIDATION.selection);
    }, [selection]);

    useEffect(() => {
      activeToolRef.current = activeTool;

      const viewport = viewportRef.current;

      if (viewport) {
        delete viewport.dataset.transformHandle;
        viewport.style.cursor = activeTool === "select" ? "" : "crosshair";
      }
    }, [activeTool]);

    useEffect(() => {
      onGestureCommitRef.current = onGestureCommit;
    }, [onGestureCommit]);

    useEffect(() => {
      onToolChangeRef.current = onToolChange;
    }, [onToolChange]);

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

    const setTextEditingSession = useCallback(
      (session: TextEditingSession | null) => {
        textEditingRef.current = session;
        setTextEditing(session);
      },
      [],
    );

    const syncTextEditorOverlay = useCallback(() => {
      const editor = textEditorRef.current;
      const session = textEditingRef.current;

      if (!editor || !session) {
        return;
      }

      const node = documentRef.current.nodes[session.nodeId];

      if (!node || node.type !== "text") {
        return;
      }

      const geometry = getNodeWorldGeometry(
        documentRef.current,
        session.nodeId,
      );

      if (!geometry) {
        return;
      }

      const screenNorthWest = worldToScreen(
        geometry.corners.northWest,
        cameraRef.current,
      );

      const zoom = cameraRef.current.zoom;
      const width = Math.max(40, node.width * zoom);
      const minimumHeight = Math.max(24, node.height * zoom);

      editor.style.left = `${screenNorthWest.x}px`;
      editor.style.top = `${screenNorthWest.y}px`;
      editor.style.width = `${width}px`;
      editor.style.height = "auto";
      editor.style.minHeight = `${minimumHeight}px`;
      editor.style.fontFamily = node.fontFamily;
      editor.style.fontSize = `${node.fontSize * zoom}px`;
      editor.style.fontWeight = String(node.fontWeight);
      editor.style.textAlign = node.textAlign;
      editor.style.color = node.fill.color;
      editor.style.lineHeight = "1.25";
      editor.style.transformOrigin = "0 0";
      editor.style.transform = `rotate(${geometry.rotation}deg)`;
      editor.style.height = `${Math.max(minimumHeight, editor.scrollHeight)}px`;
    }, []);

    const restoreCanvasFocus = useCallback(() => {
      window.requestAnimationFrame(() => {
        canvasRef.current?.focus({ preventScroll: true });
      });
    }, []);

    const finishTextEditing = useCallback(
      (shouldCommit: boolean, reason: TextEditorExitReason) => {
        const session = textEditingRef.current;

        if (!session) {
          return;
        }

        const normalizedDraft = session.draft.replace(/\r\n/g, "\n");
        const shouldCancelEmptyCreation =
          session.isCreating && normalizedDraft.trim().length === 0;

        if (!shouldCommit || shouldCancelEmptyCreation) {
          documentRef.current = session.transaction.before.document;
          selectionRef.current = session.transaction.before.selection;
          setTextEditingSession(null);
          requestRenderRef.current(
            RENDER_INVALIDATION.document |
              RENDER_INVALIDATION.selection |
              RENDER_INVALIDATION.textEditing,
          );

          if (shouldRestoreCanvasFocus(reason)) {
            restoreCanvasFocus();
          }

          return;
        }

        const nextDocument = updateTextNodeContent(
          documentRef.current,
          session.nodeId,
          normalizedDraft,
        );

        const nextSelection = selectSingleNode(
          selectionRef.current,
          session.nodeId,
        );

        documentRef.current = nextDocument;
        selectionRef.current = nextSelection;

        onGestureCommitRef.current({
          transaction: session.transaction,
          nextDocument,
          nextSelection,
        });

        setTextEditingSession(null);
        requestRenderRef.current(
          RENDER_INVALIDATION.document |
            RENDER_INVALIDATION.selection |
            RENDER_INVALIDATION.textEditing,
        );

        if (shouldRestoreCanvasFocus(reason)) {
          restoreCanvasFocus();
        }
      },
      [restoreCanvasFocus, setTextEditingSession],
    );

    const handleTextDraftChange = useCallback((draft: string) => {
      const session = textEditingRef.current;

      if (!session) {
        return;
      }

      const nextSession = {
        ...session,
        draft,
      };

      textEditingRef.current = nextSession;
      setTextEditing(nextSession);

      requestRenderRef.current(RENDER_INVALIDATION.textOverlay);
    }, []);

    const editingNodeId = textEditing?.nodeId ?? null;

    useEffect(() => {
      if (!editingNodeId) {
        return;
      }

      const frameId = window.requestAnimationFrame(() => {
        syncTextEditorOverlay();

        const editor = textEditorRef.current;

        if (!editor) {
          return;
        }

        editor.focus();

        const end = editor.value.length;
        editor.setSelectionRange(end, end);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }, [editingNodeId, syncTextEditorOverlay]);

    const applyCamera = useCallback(
      (camera: CameraState, notifyZoom = true) => {
        cameraRef.current = camera;

        if (notifyZoom) {
          onZoomChangeRef.current?.(camera.zoom);
        }

        requestRenderRef.current(RENDER_INVALIDATION.camera);
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
      const overlayCanvas = overlayCanvasRef.current;

      if (!viewport || !canvas || !overlayCanvas) {
        return;
      }

      const documentContext = canvas.getContext("2d");
      const overlayContext = overlayCanvas.getContext("2d");

      if (!documentContext || !overlayContext) {
        return;
      }

      const documentRenderer: DocumentRenderer = new Canvas2DRenderer(
        documentContext,
      );
      const guideRenderer = new AlignmentGuideRenderer(overlayContext);
      const selectionRenderer = new SelectionOverlayRenderer(overlayContext);
      const marqueeRenderer = new MarqueeOverlayRenderer(overlayContext);

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

      let shapeCreationStartWorld: Point | null = null;
      let shapeCreationStartClient: Point | null = null;
      let shapeCreationBaseDocument: EditorDocument | null = null;
      let shapeCreationTool: ShapeEditorTool | null = null;
      let shapeCreationNodeId: NodeId | null = null;
      let shapeCreationHasDraft = false;

      let marquee: MarqueeState | null = null;
      let marqueeBaseSelection: SelectionState = selectionRef.current;
      let marqueeAdditive = false;
      let marqueeStartClientPosition: Point | null = null;

      let spatialIndexDocument: EditorDocument | null = null;
      let spatialIndex: SpatialIndex | null = null;
      let spatialIndexWarmupDocument: EditorDocument | null = null;
      let spatialIndexWarmupTimerId: number | null = null;
      let workerRequestSequence = 0;

      const pendingSpatialIndexDocuments = new Map<number, EditorDocument>();

      let performanceWorker: Worker | null = null;
      let workerCreationFailed = false;

      const handlePerformanceWorkerMessage = (
        event: MessageEvent<PerformanceWorkerResponse>,
      ) => {
        const response = event.data;
        const sourceDocument = pendingSpatialIndexDocuments.get(
          response.requestId,
        );

        pendingSpatialIndexDocuments.delete(response.requestId);

        if (!sourceDocument) {
          return;
        }

        if (spatialIndexWarmupDocument === sourceDocument) {
          spatialIndexWarmupDocument = null;
        }

        if (
          response.type !== "spatial-index-built" ||
          documentRef.current !== sourceDocument
        ) {
          return;
        }

        spatialIndex = response.index;
        spatialIndexDocument = sourceDocument;
      };

      const handlePerformanceWorkerError = () => {
        pendingSpatialIndexDocuments.clear();
        spatialIndexWarmupDocument = null;

        if (spatialIndexWarmupTimerId !== null) {
          window.clearTimeout(spatialIndexWarmupTimerId);

          spatialIndexWarmupTimerId = null;
        }

        performanceWorker?.terminate();
        performanceWorker = null;
        workerCreationFailed = true;
      };

      const ensurePerformanceWorker = (): Worker | null => {
        if (performanceWorker) {
          return performanceWorker;
        }

        if (workerCreationFailed) {
          return null;
        }

        try {
          performanceWorker = new Worker(
            new URL("../performance/performanceWorker.ts", import.meta.url),
            {
              type: "module",
              name: "canvaslab-performance-worker",
            },
          );

          performanceWorker.addEventListener(
            "message",
            handlePerformanceWorkerMessage,
          );

          performanceWorker.addEventListener(
            "error",
            handlePerformanceWorkerError,
          );

          return performanceWorker;
        } catch {
          workerCreationFailed = true;

          return null;
        }
      };

      const scheduleSpatialIndexWarmup = (
        sourceDocument: EditorDocument,
      ): boolean => {
        if (
          !shouldOffloadSpatialIndexBuild(sourceDocument) ||
          spatialIndexDocument === sourceDocument ||
          spatialIndexWarmupDocument === sourceDocument
        ) {
          return false;
        }

        const worker = ensurePerformanceWorker();

        if (!worker) {
          return false;
        }

        if (spatialIndexWarmupTimerId !== null) {
          window.clearTimeout(spatialIndexWarmupTimerId);
        }

        spatialIndexWarmupDocument = sourceDocument;

        spatialIndexWarmupTimerId = window.setTimeout(() => {
          spatialIndexWarmupTimerId = null;

          if (documentRef.current !== sourceDocument) {
            if (spatialIndexWarmupDocument === sourceDocument) {
              spatialIndexWarmupDocument = null;
            }

            return;
          }

          const activeWorker = ensurePerformanceWorker();

          if (!activeWorker) {
            spatialIndexWarmupDocument = null;

            return;
          }

          workerRequestSequence += 1;

          const requestId = workerRequestSequence;

          pendingSpatialIndexDocuments.clear();
          pendingSpatialIndexDocuments.set(requestId, sourceDocument);

          const request: PerformanceWorkerRequest = {
            type: "build-spatial-index",

            requestId,

            document: sourceDocument,
          };

          activeWorker.postMessage(request);
        }, 120);

        return true;
      };

      scheduleSpatialIndexWarmupRef.current = scheduleSpatialIndexWarmup;

      const getSpatialIndex = (): SpatialIndex | null => {
        const currentDocument = documentRef.current;

        if (spatialIndex && spatialIndexDocument === currentDocument) {
          return spatialIndex;
        }

        if (
          shouldOffloadSpatialIndexBuild(currentDocument) &&
          scheduleSpatialIndexWarmup(currentDocument)
        ) {
          return null;
        }

        if (
          spatialIndexWarmupDocument === currentDocument &&
          performanceWorker
        ) {
          return null;
        }

        spatialIndex = createSpatialIndex(currentDocument);

        spatialIndexDocument = currentDocument;

        return spatialIndex;
      };

      const hitTestAtWorldPoint = (worldPoint: Point): NodeId | null => {
        const currentDocument = documentRef.current;

        const currentSpatialIndex = getSpatialIndex();

        /*
         * A large document may still be
         * warming its index in the worker.
         *
         * Correctness wins over optimization:
         * use the existing precise full-document
         * hit test for this interaction, then use
         * the worker-built index on later clicks.
         */
        if (!currentSpatialIndex) {
          return hitTestDocument(currentDocument, worldPoint);
        }

        const candidateNodeIds = querySpatialIndexAtPoint(
          currentSpatialIndex,
          worldPoint,
        );

        if (candidateNodeIds.length === 0) {
          return null;
        }

        const candidateDocument = createSpatialHitTestDocument(
          currentDocument,
          candidateNodeIds,
        );

        return hitTestDocument(candidateDocument, worldPoint);
      };

      scheduleSpatialIndexWarmup(documentRef.current);

      interface CanvasSurfaceMetrics {
        viewportWidth: number;
        viewportHeight: number;
        pixelRatio: number;
        canvasWidth: number;
        canvasHeight: number;
      }

      const getCanvasSurfaceMetrics = (): CanvasSurfaceMetrics => {
        const viewportRect = viewport.getBoundingClientRect();
        const viewportWidth = Math.max(1, Math.floor(viewportRect.width));
        const viewportHeight = Math.max(1, Math.floor(viewportRect.height));
        const pixelRatio = window.devicePixelRatio || 1;

        return {
          viewportWidth,
          viewportHeight,
          pixelRatio,
          canvasWidth: Math.round(viewportWidth * pixelRatio),
          canvasHeight: Math.round(viewportHeight * pixelRatio),
        };
      };

      const resizeCanvasSurface = (
        surface: HTMLCanvasElement,
        metrics: CanvasSurfaceMetrics,
      ) => {
        if (surface.width !== metrics.canvasWidth) {
          surface.width = metrics.canvasWidth;
        }

        if (surface.height !== metrics.canvasHeight) {
          surface.height = metrics.canvasHeight;
        }

        surface.style.width = `${metrics.viewportWidth}px`;
        surface.style.height = `${metrics.viewportHeight}px`;
      };

      const renderDocumentLayer = (metrics: CanvasSurfaceMetrics) => {
        resizeCanvasSurface(canvas, metrics);

        const editingSession = textEditingRef.current;
        const editingNode = editingSession
          ? documentRef.current.nodes[editingSession.nodeId]
          : null;

        const renderDocument =
          editingNode && editingNode.type === "text"
            ? {
                ...documentRef.current,
                nodes: {
                  ...documentRef.current.nodes,
                  [editingNode.id]: {
                    ...editingNode,
                    visible: false,
                  },
                },
              }
            : documentRef.current;

        const viewportWorldBounds = createWorldBounds(
          screenToWorld(
            {
              x: -VIEWPORT_CULLING_OVERSCAN,
              y: -VIEWPORT_CULLING_OVERSCAN,
            },
            cameraRef.current,
          ),
          screenToWorld(
            {
              x: metrics.viewportWidth + VIEWPORT_CULLING_OVERSCAN,
              y: metrics.viewportHeight + VIEWPORT_CULLING_OVERSCAN,
            },
            cameraRef.current,
          ),
        );

        const viewportRenderDocument = createViewportRenderDocument(
          renderDocument,
          viewportWorldBounds,
        );

        documentRenderer.render(
          viewportRenderDocument.document,
          cameraRef.current,
          metrics.pixelRatio,
        );
      };

      const clearOverlayLayer = () => {
        overlayContext.save();
        overlayContext.setTransform(1, 0, 0, 1, 0, 0);
        overlayContext.clearRect(
          0,
          0,
          overlayCanvas.width,
          overlayCanvas.height,
        );
        overlayContext.restore();
      };

      const renderOverlayLayer = (metrics: CanvasSurfaceMetrics) => {
        resizeCanvasSurface(overlayCanvas, metrics);
        clearOverlayLayer();

        guideRenderer.render(
          activeGuides,
          cameraRef.current,
          metrics.pixelRatio,
        );

        selectionRenderer.render(
          documentRef.current,
          selectionRef.current,
          cameraRef.current,
          metrics.pixelRatio,
        );

        marqueeRenderer.render(marquee, cameraRef.current, metrics.pixelRatio);
      };

      const renderScheduler = createRenderInvalidationScheduler({
        requestFrame(callback) {
          return window.requestAnimationFrame(callback);
        },

        cancelFrame(frameId) {
          window.cancelAnimationFrame(frameId);
        },

        onFlush(mask) {
          const dirtyLayers: DirtyRenderLayers = getDirtyRenderLayers(mask);

          if (dirtyLayers.document || dirtyLayers.overlay) {
            const metrics = getCanvasSurfaceMetrics();

            if (dirtyLayers.document) {
              renderDocumentLayer(metrics);
            }

            if (dirtyLayers.overlay) {
              renderOverlayLayer(metrics);
            }
          }

          if (requiresTextOverlaySync(mask)) {
            syncTextEditorOverlay();
          }
        },
      });

      const requestRender = (mask: RenderInvalidationMask) => {
        renderScheduler.request(mask);
      };

      requestRenderRef.current = requestRender;

      const getScreenPoint = (
        event: Pick<MouseEvent, "clientX" | "clientY">,
      ): Point => {
        const viewportRect = viewport.getBoundingClientRect();

        return {
          x: event.clientX - viewportRect.left,
          y: event.clientY - viewportRect.top,
        };
      };

      const getWorldPoint = (
        event: Pick<MouseEvent, "clientX" | "clientY">,
      ): Point => {
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
        requestRender(RENDER_INVALIDATION.selection);
      };

      const commitSelection = () => {
        onSelectionChangeRef.current(selectionRef.current);
      };

      const clearTransformCursor = () => {
        delete viewport.dataset.transformHandle;
        viewport.style.cursor =
          activeToolRef.current === "select" ? "" : "crosshair";
      };

      const clearSnapping = () => {
        snapCandidates = [];
        activeGuides = [];
      };

      const updateTransformHover = (event: PointerEvent) => {
        if (activeToolRef.current !== "select") {
          clearTransformCursor();
          return;
        }

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
        const completedInteraction = pointerInteraction;

        const isDocumentGesture =
          completedInteraction === "dragging-node" ||
          completedInteraction === "dragging-selection" ||
          completedInteraction === "resizing-node" ||
          completedInteraction === "resizing-selection" ||
          completedInteraction === "rotating-node" ||
          completedInteraction === "rotating-selection" ||
          completedInteraction === "creating-shape";

        if (isDocumentGesture && gestureTransaction) {
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
        shapeCreationStartWorld = null;
        shapeCreationStartClient = null;
        shapeCreationBaseDocument = null;
        shapeCreationTool = null;
        shapeCreationNodeId = null;
        shapeCreationHasDraft = false;
        marquee = null;
        marqueeStartClientPosition = null;

        clearSnapping();

        delete viewport.dataset.panning;
        delete viewport.dataset.draggingNode;
        delete viewport.dataset.resizingNode;
        delete viewport.dataset.rotatingNode;
        delete viewport.dataset.creatingShape;
        delete viewport.dataset.marqueeSelecting;

        clearTransformCursor();

        if (isDocumentGesture) {
          requestRender(
            RENDER_INVALIDATION.document |
              RENDER_INVALIDATION.selection |
              RENDER_INVALIDATION.guides,
          );

          return;
        }

        if (completedInteraction === "marquee") {
          requestRender(
            RENDER_INVALIDATION.selection | RENDER_INVALIDATION.marquee,
          );
        }
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

      const startTextCreation = (worldPoint: Point) => {
        clearSnapping();

        const transaction = beginGestureTransaction(
          "create",
          "Create Text",
          documentRef.current,
          selectionRef.current,
        );

        const nodeId = createTextNodeId(documentRef.current);
        const nextDocument = insertRootText(
          documentRef.current,
          nodeId,
          worldPoint,
        );

        const nextSelection = selectSingleNode(selectionRef.current, nodeId);

        documentRef.current = nextDocument;
        selectionRef.current = nextSelection;

        const session: TextEditingSession = {
          nodeId,
          draft: "",
          transaction,
          isCreating: true,
        };

        setTextEditingSession(session);
        activeToolRef.current = "select";
        onToolChangeRef.current("select");
        viewport.style.cursor = "";
        requestRender(
          RENDER_INVALIDATION.document |
            RENDER_INVALIDATION.selection |
            RENDER_INVALIDATION.textEditing,
        );
      };

      const startExistingTextEditing = (nodeId: NodeId) => {
        const node = documentRef.current.nodes[nodeId];

        if (!node || node.type !== "text" || node.locked || !node.visible) {
          return;
        }

        clearSnapping();

        const transaction = beginGestureTransaction(
          "update",
          "Edit Text",
          documentRef.current,
          selectionRef.current,
        );

        selectionRef.current = selectSingleNode(selectionRef.current, nodeId);

        const session: TextEditingSession = {
          nodeId,
          draft: node.content,
          transaction,
          isCreating: false,
        };

        setTextEditingSession(session);
        requestRender(
          RENDER_INVALIDATION.selection | RENDER_INVALIDATION.textEditing,
        );
      };

      const startShapeCreation = (
        event: PointerEvent,
        tool: ShapeEditorTool,
        worldPoint: Point,
      ) => {
        clearSnapping();

        const definition = getEditorToolDefinition(tool);

        gestureTransaction = beginGestureTransaction(
          "create",
          `Create ${definition.label}`,
          documentRef.current,
          selectionRef.current,
        );

        selectionRef.current = clearSelection(selectionRef.current);

        pointerInteraction = "creating-shape";
        activePointerId = event.pointerId;
        shapeCreationStartWorld = worldPoint;
        shapeCreationStartClient = {
          x: event.clientX,
          y: event.clientY,
        };
        shapeCreationBaseDocument = documentRef.current;
        shapeCreationTool = tool;
        shapeCreationNodeId = createShapeNodeId(documentRef.current, tool);
        shapeCreationHasDraft = false;

        canvas.setPointerCapture(event.pointerId);
        viewport.dataset.creatingShape = "true";
        viewport.style.cursor = "crosshair";
        requestRender(RENDER_INVALIDATION.selection);
      };

      const updateShapeCreation = (event: PointerEvent) => {
        if (
          !shapeCreationStartWorld ||
          !shapeCreationStartClient ||
          !shapeCreationBaseDocument ||
          !shapeCreationTool ||
          !shapeCreationNodeId
        ) {
          return;
        }

        const dragDistance = Math.hypot(
          event.clientX - shapeCreationStartClient.x,
          event.clientY - shapeCreationStartClient.y,
        );

        if (dragDistance < SHAPE_CREATION_DRAG_THRESHOLD) {
          if (shapeCreationHasDraft) {
            documentRef.current = shapeCreationBaseDocument;
            shapeCreationHasDraft = false;
            requestRender(RENDER_INVALIDATION.document);
          }

          return;
        }

        const bounds = getShapeCreationBounds(
          shapeCreationStartWorld,
          getWorldPoint(event),
          {
            constrainSquare: event.shiftKey,
            fromCenter: event.altKey,
          },
        );

        documentRef.current = insertRootShape(
          shapeCreationBaseDocument,
          shapeCreationTool,
          shapeCreationNodeId,
          bounds,
        );

        shapeCreationHasDraft = true;
        requestRender(RENDER_INVALIDATION.document);
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
        requestRender(RENDER_INVALIDATION.marquee);
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
        requestRender(RENDER_INVALIDATION.marquee);
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

        requestRender(
          RENDER_INVALIDATION.document | RENDER_INVALIDATION.guides,
        );
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

        requestRender(
          RENDER_INVALIDATION.document | RENDER_INVALIDATION.guides,
        );
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

        requestRender(
          RENDER_INVALIDATION.document | RENDER_INVALIDATION.guides,
        );
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

        requestRender(
          RENDER_INVALIDATION.document | RENDER_INVALIDATION.guides,
        );
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

        requestRender(RENDER_INVALIDATION.document);
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

        requestRender(RENDER_INVALIDATION.document);
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

        if (event.key === "Enter" && window.document.activeElement === canvas) {
          const editableTextNodeId = getKeyboardEditableTextNodeId(
            documentRef.current,
            selectionRef.current,
            activeToolRef.current,
          );

          if (editableTextNodeId) {
            event.preventDefault();
            startExistingTextEditing(editableTextNodeId);
            return;
          }
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

        if (textEditingRef.current) {
          event.preventDefault();
          finishTextEditing(true, "canvas-pointer");
          return;
        }

        event.preventDefault();
        canvas.focus({ preventScroll: true });

        if (isSpacePressed) {
          startPan(event);
          return;
        }

        const worldPoint = getWorldPoint(event);
        const currentTool = activeToolRef.current;

        if (currentTool === "text") {
          startTextCreation(worldPoint);
          return;
        }

        if (isShapeCreationTool(currentTool)) {
          startShapeCreation(event, currentTool, worldPoint);
          return;
        }

        if (currentTool !== "select") {
          return;
        }

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

        const hitNodeId = hitTestAtWorldPoint(worldPoint);

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

      const handleDoubleClick = (event: MouseEvent) => {
        if (
          activeToolRef.current !== "select" ||
          textEditingRef.current ||
          pointerInteraction !== "idle"
        ) {
          return;
        }

        const worldPoint = getWorldPoint(event);
        const hitNodeId = hitTestAtWorldPoint(worldPoint);

        if (!hitNodeId) {
          return;
        }

        const node = documentRef.current.nodes[hitNodeId];

        if (!node || node.type !== "text") {
          return;
        }

        event.preventDefault();
        startExistingTextEditing(hitNodeId);
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
          requestRender(RENDER_INVALIDATION.camera);
          return;
        }

        if (pointerInteraction === "creating-shape") {
          updateShapeCreation(event);
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

        if (pointerInteraction === "creating-shape") {
          updateShapeCreation(event);

          const createdNodeId =
            shapeCreationHasDraft && shapeCreationNodeId
              ? shapeCreationNodeId
              : null;

          if (createdNodeId) {
            selectionRef.current = selectSingleNode(
              selectionRef.current,
              createdNodeId,
            );
          }

          releasePointerCapture(event.pointerId);
          endPointerInteraction(createdNodeId !== null);

          if (createdNodeId) {
            onToolChangeRef.current("select");
          }

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
        if (textEditingRef.current) {
          finishTextEditing(true, "window-blur");
        }

        isSpacePressed = false;
        delete viewport.dataset.panReady;

        if (pointerInteraction === "marquee") {
          commitSelection();
        }

        if (activePointerId !== null) {
          releasePointerCapture(activePointerId);
        }

        endPointerInteraction(pointerInteraction !== "creating-shape");
      };

      requestRender(
        RENDER_INVALIDATION.document |
          RENDER_INVALIDATION.selection |
          RENDER_INVALIDATION.viewport,
      );

      const resizeObserver = new ResizeObserver(() => {
        requestRender(RENDER_INVALIDATION.viewport);
      });
      resizeObserver.observe(viewport);

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      window.addEventListener("blur", handleWindowBlur);
      canvas.addEventListener("pointerdown", handlePointerDown);
      canvas.addEventListener("dblclick", handleDoubleClick);
      canvas.addEventListener("pointermove", handlePointerMove);
      canvas.addEventListener("pointerup", handlePointerUp);
      canvas.addEventListener("pointercancel", handlePointerCancel);
      canvas.addEventListener("pointerleave", handlePointerLeave);
      canvas.addEventListener("wheel", handleWheel, { passive: false });

      return () => {
        resizeObserver.disconnect();
        requestRenderRef.current = () => undefined;
        scheduleSpatialIndexWarmupRef.current = () => undefined;

        if (spatialIndexWarmupTimerId !== null) {
          window.clearTimeout(spatialIndexWarmupTimerId);
        }

        performanceWorker?.removeEventListener(
          "message",
          handlePerformanceWorkerMessage,
        );

        performanceWorker?.removeEventListener(
          "error",
          handlePerformanceWorkerError,
        );

        performanceWorker?.terminate();

        pendingSpatialIndexDocuments.clear();

        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        window.removeEventListener("blur", handleWindowBlur);
        canvas.removeEventListener("pointerdown", handlePointerDown);
        canvas.removeEventListener("dblclick", handleDoubleClick);
        canvas.removeEventListener("pointermove", handlePointerMove);
        canvas.removeEventListener("pointerup", handlePointerUp);
        canvas.removeEventListener("pointercancel", handlePointerCancel);
        canvas.removeEventListener("pointerleave", handlePointerLeave);
        canvas.removeEventListener("wheel", handleWheel);

        renderScheduler.cancel();
        documentRenderer.dispose?.();
      };
    }, [
      applyCamera,
      finishTextEditing,
      setTextEditingSession,
      syncTextEditorOverlay,
    ]);

    return (
      <div
        ref={viewportRef}
        className={styles.viewport}
        data-active-tool={activeTool}
      >
        <span
          id={canvasInstructionsId}
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            clipPath: "inset(50%)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          When a text object is selected, press Enter to edit its text.
        </span>

        <canvas
          ref={canvasRef}
          className={styles.canvas}
          aria-label="CanvasLab design canvas"
          aria-describedby={canvasInstructionsId}
          tabIndex={0}
        />

        <canvas
          ref={overlayCanvasRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "block",
            pointerEvents: "none",
          }}
        />

        {textEditing ? (
          <>
            <span
              id={textEditorInstructionsId}
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: "hidden",
                clip: "rect(0, 0, 0, 0)",
                clipPath: "inset(50%)",
                whiteSpace: "nowrap",
                border: 0,
              }}
            >
              Edit text directly. Press Command or Control plus Enter to finish.
              Press Escape to cancel.
            </span>

            <textarea
              ref={textEditorRef}
              value={textEditing.draft}
              aria-label={textEditing.isCreating ? "Create text" : "Edit text"}
              aria-describedby={textEditorInstructionsId}
              spellCheck={false}
              onChange={(event) => handleTextDraftChange(event.target.value)}
              onBlur={() => finishTextEditing(true, "blur")}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  finishTextEditing(false, "keyboard-cancel");
                  return;
                }

                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  event.stopPropagation();
                  finishTextEditing(true, "keyboard-commit");
                }
              }}
              style={{
                position: "absolute",
                zIndex: 10,
                margin: 0,
                padding: 0,
                overflow: "hidden",
                resize: "none",
                border: "1px solid #2563eb",
                borderRadius: 2,
                outline: "none",
                background: "rgba(255, 255, 255, 0.96)",
                boxShadow: "0 0 0 1px rgba(37, 99, 235, 0.15)",
                caretColor: "#2563eb",
                whiteSpace: "pre-wrap",
              }}
            />
          </>
        ) : null}
      </div>
    );
  },
);
