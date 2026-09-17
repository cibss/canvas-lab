"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Point } from "@/editor/camera/types";
import { dispatchEditorCommand } from "@/editor/commands/dispatch";
import {
  commitGestureTransaction,
  type GestureTransactionCommit,
} from "@/editor/commands/gestureTransaction";
import { canRedo, canUndo } from "@/editor/commands/history";
import { getHistoryShortcut } from "@/editor/commands/historyShortcut";
import { deleteNodes, moveNodesBy } from "@/editor/document/documentOperations";
import { sampleDocument } from "@/editor/document/sampleDocument";
import type {
  EditorDocument,
  EditorNode,
  NodeId,
} from "@/editor/document/types";
import {
  clearSelection,
  createSelectionState,
  isNodeSelected,
  selectSingleNode,
  toggleNodeSelection,
  type SelectionState,
} from "@/editor/selection/selection";
import {
  createEditorState,
  redoEditorState,
  setEditorSelection,
  undoEditorState,
} from "@/editor/state/editorState";
import {
  DEFAULT_EDITOR_TOOL,
  type EditorTool,
} from "@/editor/tools/editorTool";

import { EditorCanvas, type EditorCanvasHandle } from "./EditorCanvas";
import { EditorToolbar } from "./EditorToolbar";

import styles from "./EditorShell.module.css";

const nodeIcons: Record<EditorNode["type"], string> = {
  frame: "▣",
  rectangle: "□",
  ellipse: "○",
  text: "T",
};

interface LayerTreeProps {
  document: EditorDocument;

  selection: SelectionState;

  nodeId: NodeId;

  depth?: number;

  onSelectNode: (
    nodeId: NodeId,

    additive: boolean,
  ) => void;
}

function LayerTree({
  document,
  selection,
  nodeId,
  depth = 0,
  onSelectNode,
}: LayerTreeProps) {
  const node = document.nodes[nodeId];

  if (!node) {
    return null;
  }

  const childIds = node.type === "frame" ? node.childIds : [];

  const selected = isNodeSelected(selection, nodeId);

  return (
    <>
      <button
        type="button"
        className={`${styles.layerRow} ${
          selected ? styles.selectedLayerRow : ""
        }`}
        style={{
          paddingLeft: `${12 + depth * 16}px`,
        }}
        onClick={(event) => onSelectNode(nodeId, event.shiftKey)}
        aria-pressed={selected}
        disabled={node.locked}
        title={node.locked ? `${node.name} is locked` : node.name}
      >
        <span className={styles.layerIcon} aria-hidden="true">
          {nodeIcons[node.type]}
        </span>

        <span className={styles.layerName}>{node.name}</span>
      </button>

      {childIds.map((childId) => (
        <LayerTree
          key={childId}
          document={document}
          selection={selection}
          nodeId={childId}
          depth={depth + 1}
          onSelectNode={onSelectNode}
        />
      ))}
    </>
  );
}

function shouldIgnoreHistoryShortcut(target: EventTarget | null): boolean {
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

export function EditorShell() {
  const canvasRef = useRef<EditorCanvasHandle>(null);

  const [editorState, setEditorState] = useState(() =>
    createEditorState(sampleDocument, createSelectionState()),
  );

  const [zoomPercentage, setZoomPercentage] = useState(100);

  const [activeTool, setActiveTool] = useState<EditorTool>(DEFAULT_EDITOR_TOOL);

  const { document, selection, history } = editorState;

  const canUndoHistory = canUndo(history);

  const canRedoHistory = canRedo(history);

  const undoCommand = history.undoStack[history.undoStack.length - 1];

  const redoCommand = history.redoStack[history.redoStack.length - 1];

  const nodeCount = Object.keys(document.nodes).length;

  const selectedNodeCount = selection.selectedNodeIds.length;

  const selectedNodeId = selection.selectedNodeIds[0] ?? null;

  const selectedNode = selectedNodeId ? document.nodes[selectedNodeId] : null;

  const handleUndo = useCallback(() => {
    setEditorState((currentState) => undoEditorState(currentState));
  }, []);

  const handleRedo = useCallback(() => {
    setEditorState((currentState) => redoEditorState(currentState));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || shouldIgnoreHistoryShortcut(event.target)) {
        return;
      }

      const action = getHistoryShortcut({
        key: event.key,

        metaKey: event.metaKey,

        ctrlKey: event.ctrlKey,

        shiftKey: event.shiftKey,

        altKey: event.altKey,
      });

      if (!action) {
        return;
      }

      event.preventDefault();

      if (action === "undo") {
        handleUndo();

        return;
      }

      handleRedo();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleRedo, handleUndo]);

  const handleGestureCommit = useCallback(
    (commit: GestureTransactionCommit) => {
      setEditorState((currentState) =>
        commitGestureTransaction(currentState, commit),
      );
    },
    [],
  );

  const handleZoomChange = useCallback((zoom: number) => {
    setZoomPercentage(Math.round(zoom * 100));
  }, []);

  const handleSelectionChange = useCallback((nextSelection: SelectionState) => {
    setEditorState((currentState) =>
      setEditorSelection(currentState, nextSelection),
    );
  }, []);

  const handleLayerSelect = useCallback(
    (
      nodeId: NodeId,

      additive: boolean,
    ) => {
      setEditorState((currentState) => {
        const nextSelection = additive
          ? toggleNodeSelection(currentState.selection, nodeId)
          : selectSingleNode(currentState.selection, nodeId);

        return setEditorSelection(currentState, nextSelection);
      });
    },
    [],
  );

  const handleNudgeSelection = useCallback((delta: Point) => {
    setEditorState((currentState) => {
      if (currentState.selection.selectedNodeIds.length === 0) {
        return currentState;
      }

      const nextDocument = moveNodesBy(
        currentState.document,
        currentState.selection.selectedNodeIds,
        delta,
      );

      if (nextDocument === currentState.document) {
        return currentState;
      }

      return dispatchEditorCommand(currentState, {
        kind: "move",

        label: "Nudge selection",

        nextDocument,

        coalesce: {
          key: "keyboard-nudge",
        },
      });
    });
  }, []);

  const handleDeleteSelection = useCallback(() => {
    setEditorState((currentState) => {
      if (currentState.selection.selectedNodeIds.length === 0) {
        return currentState;
      }

      const nextDocument = deleteNodes(
        currentState.document,
        currentState.selection.selectedNodeIds,
      );

      if (nextDocument === currentState.document) {
        return currentState;
      }

      return dispatchEditorCommand(currentState, {
        kind: "delete",

        label: "Delete selection",

        nextDocument,

        nextSelection: clearSelection(currentState.selection),
      });
    });
  }, []);

  return (
    <>
      <div className={styles.mobileNotice} role="status">
        <div className={styles.mobileNoticeContent}>
          <div className={styles.mobileNoticeIcon} aria-hidden="true">
            ◇
          </div>

          <h1>CanvasLab</h1>

          <p>CanvasLab is designed for desktop and tablet-sized screens.</p>

          <span>
            Open this project on a device with a larger screen to explore the
            full visual editor.
          </span>
        </div>
      </div>

      <main className={styles.shell}>
        <header className={styles.topBar}>
          <div className={styles.brandSection}>
            <span className={styles.logo}>◇</span>

            <strong className={styles.brand}>CanvasLab</strong>

            <nav className={styles.menu} aria-label="Application menu">
              <span>File</span>

              <span>Edit</span>

              <span>View</span>
            </nav>
          </div>

          <div className={styles.topBarActions}>
            <button
              type="button"
              className={styles.historyAction}
              onClick={handleUndo}
              disabled={!canUndoHistory}
              aria-label={undoCommand ? `Undo ${undoCommand.label}` : "Undo"}
              title={
                undoCommand
                  ? `Undo ${undoCommand.label} (Cmd/Ctrl+Z)`
                  : "Nothing to undo"
              }
              style={{
                border: 0,
                background: "transparent",
                padding: 0,
                font: "inherit",
                color: "inherit",

                opacity: canUndoHistory ? 1 : 0.35,

                cursor: canUndoHistory ? "pointer" : "default",
              }}
            >
              ↶
            </button>

            <button
              type="button"
              className={styles.historyAction}
              onClick={handleRedo}
              disabled={!canRedoHistory}
              aria-label={redoCommand ? `Redo ${redoCommand.label}` : "Redo"}
              title={
                redoCommand
                  ? `Redo ${redoCommand.label} (Cmd/Ctrl+Shift+Z)`
                  : "Nothing to redo"
              }
              style={{
                border: 0,
                background: "transparent",
                padding: 0,
                font: "inherit",
                color: "inherit",

                opacity: canRedoHistory ? 1 : 0.35,

                cursor: canRedoHistory ? "pointer" : "default",
              }}
            >
              ↷
            </button>

            <div className={styles.zoomControls} aria-label="Zoom controls">
              <button
                type="button"
                className={styles.zoomButton}
                onClick={() => canvasRef.current?.zoomOut()}
                aria-label="Zoom out"
                title="Zoom out"
              >
                −
              </button>

              <button
                type="button"
                className={styles.zoomValue}
                onClick={() => canvasRef.current?.resetZoom()}
                aria-label="Reset zoom to 100%"
                title="Reset zoom to 100%"
              >
                {zoomPercentage}%
              </button>

              <button
                type="button"
                className={styles.zoomButton}
                onClick={() => canvasRef.current?.zoomIn()}
                aria-label="Zoom in"
                title="Zoom in"
              >
                +
              </button>

              <button
                type="button"
                className={styles.fitButton}
                onClick={() => canvasRef.current?.fitContent()}
              >
                Fit
              </button>
            </div>
          </div>
        </header>

        <div className={styles.editor}>
          <EditorToolbar activeTool={activeTool} onToolChange={setActiveTool} />

          <aside className={styles.layersPanel}>
            <div className={styles.panelHeader}>Layers</div>

            <div className={styles.layers}>
              {document.rootNodeIds.map((nodeId) => (
                <LayerTree
                  key={nodeId}
                  document={document}
                  selection={selection}
                  nodeId={nodeId}
                  onSelectNode={handleLayerSelect}
                />
              ))}
            </div>
          </aside>

          <section className={styles.workspace} aria-label="Canvas workspace">
            <EditorCanvas
              ref={canvasRef}
              document={document}
              selection={selection}
              activeTool={activeTool}
              onGestureCommit={handleGestureCommit}
              onToolChange={setActiveTool}
              onSelectionChange={handleSelectionChange}
              onNudgeSelection={handleNudgeSelection}
              onDeleteSelection={handleDeleteSelection}
              onZoomChange={handleZoomChange}
            />
          </section>

          <aside className={styles.propertiesPanel}>
            <div className={styles.panelHeader}>Properties</div>

            {selectedNodeCount > 1 ? (
              <div className={styles.selectionSummary}>
                <strong>{selectedNodeCount} objects selected</strong>

                <p>
                  Multiple objects are selected. Shared transform controls are
                  available on the canvas.
                </p>
              </div>
            ) : selectedNode ? (
              <>
                <div className={styles.selectionSummary}>
                  <strong>{selectedNode.name}</strong>

                  <p>{selectedNode.type}</p>
                </div>

                <div className={styles.propertySection}>
                  <div className={styles.sectionTitle}>Position</div>

                  <dl className={styles.propertyGrid}>
                    <div>
                      <dt>X</dt>

                      <dd>{Math.round(selectedNode.x)}</dd>
                    </div>

                    <div>
                      <dt>Y</dt>

                      <dd>{Math.round(selectedNode.y)}</dd>
                    </div>
                  </dl>
                </div>

                <div className={styles.propertySection}>
                  <div className={styles.sectionTitle}>Size</div>

                  <dl className={styles.propertyGrid}>
                    <div>
                      <dt>W</dt>

                      <dd>{Math.round(selectedNode.width)}</dd>
                    </div>

                    <div>
                      <dt>H</dt>

                      <dd>{Math.round(selectedNode.height)}</dd>
                    </div>
                  </dl>
                </div>

                <div className={styles.propertySection}>
                  <div className={styles.sectionTitle}>Transform</div>

                  <dl className={styles.metadata}>
                    <div>
                      <dt>Rotation</dt>

                      <dd>{selectedNode.rotation}°</dd>
                    </div>

                    <div>
                      <dt>Opacity</dt>

                      <dd>{Math.round(selectedNode.opacity * 100)}%</dd>
                    </div>
                  </dl>
                </div>
              </>
            ) : (
              <div className={styles.selectionSummary}>
                <strong>No selection</strong>

                <p>Select an object to inspect its properties.</p>
              </div>
            )}

            <div className={styles.documentSection}>
              <div className={styles.sectionTitle}>Document</div>

              <dl className={styles.metadata}>
                <div>
                  <dt>Name</dt>

                  <dd>{document.name}</dd>
                </div>

                <div>
                  <dt>Objects</dt>

                  <dd>{nodeCount}</dd>
                </div>

                <div>
                  <dt>Renderer</dt>

                  <dd>Canvas 2D</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>

        <footer className={styles.statusBar}>
          <span>
            {selectedNodeCount > 1
              ? `${selectedNodeCount} objects selected`
              : selectedNode
                ? `${selectedNode.name} selected`
                : "Ready"}
          </span>

          <span>{nodeCount} objects</span>

          <span>Canvas 2D · 60 FPS target</span>
        </footer>
      </main>
    </>
  );
}
