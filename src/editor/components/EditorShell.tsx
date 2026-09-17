"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import type { Point } from "@/editor/camera/types";
import { dispatchEditorCommand } from "@/editor/commands/dispatch";
import {
  commitGestureTransaction,
  type GestureTransactionCommit,
} from "@/editor/commands/gestureTransaction";
import { canRedo, canUndo } from "@/editor/commands/history";
import { getHistoryShortcut } from "@/editor/commands/historyShortcut";
import { deleteNodes, moveNodesBy } from "@/editor/document/documentOperations";
import {
  setNodeLocked,
  setNodeVisibility,
  updateNodeName,
} from "@/editor/document/nodeMetadata";
import {
  updateNodeProperty,
  type EditableNodeProperty,
} from "@/editor/document/nodeProperties";
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
import { removeNodeSubtreeFromSelection } from "@/editor/selection/selectionHierarchy";
import {
  createEditorState,
  redoEditorState,
  setEditorSelection,
  undoEditorState,
} from "@/editor/state/editorState";
import {
  DEFAULT_EDITOR_TOOL,
  getEditorToolDefinition,
  type EditorTool,
} from "@/editor/tools/editorTool";
import { getEditorToolFromShortcut } from "@/editor/tools/toolShortcut";

import { EditorCanvas, type EditorCanvasHandle } from "./EditorCanvas";
import { EditorToolbar } from "./EditorToolbar";
import { PropertiesInspector } from "./PropertiesInspector";

import styles from "./EditorShell.module.css";

const nodeIcons: Record<EditorNode["type"], string> = {
  frame: "▣",
  rectangle: "□",
  ellipse: "○",
  text: "T",
};

const propertyLabels: Record<EditableNodeProperty, string> = {
  x: "X",
  y: "Y",
  width: "width",
  height: "height",
  rotation: "rotation",
  opacity: "opacity",
};

const layerContainerStyle: CSSProperties = {
  position: "relative",
  minWidth: 0,
};

const layerActionsStyle: CSSProperties = {
  position: "absolute",

  top: "50%",
  right: 6,

  display: "flex",

  gap: 2,

  transform: "translateY(-50%)",

  zIndex: 2,
};

const layerActionButtonStyle: CSSProperties = {
  display: "grid",

  width: 24,
  height: 24,

  padding: 0,

  placeItems: "center",

  border: 0,
  borderRadius: 4,

  outline: 0,

  color: "#71717a",

  background: "transparent",

  cursor: "pointer",
};

const renameInputStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,

  height: 24,

  padding: "0 6px",

  border: "1px solid #2563eb",

  borderRadius: 4,

  outline: 0,

  color: "#18181b",

  background: "#ffffff",

  font: "inherit",
};

interface VisibilityIconProps {
  visible: boolean;
}

function VisibilityIcon({ visible }: VisibilityIconProps) {
  if (!visible) {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 3l18 18" />

        <path d="M10.6 10.7a2 2 0 002.7 2.7" />

        <path d="M9.9 4.2A10.8 10.8 0 0112 4c5.5 0 9 6 9 6a16.6 16.6 0 01-2.3 3.1" />

        <path d="M6.6 6.6C4.3 8.1 3 10 3 10s3.5 6 9 6a9.9 9.9 0 003.2-.5" />
      </svg>
    );
  }

  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />

      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

interface LockIconProps {
  locked: boolean;
}

function LockIcon({ locked }: LockIconProps) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="10" width="14" height="10" rx="2" />

      {locked ? (
        <path d="M8 10V7a4 4 0 018 0v3" />
      ) : (
        <path d="M16 10V7a4 4 0 00-7.7-1.5" />
      )}
    </svg>
  );
}

interface LayerTreeProps {
  document: EditorDocument;

  selection: SelectionState;

  nodeId: NodeId;

  depth?: number;

  onSelectNode: (nodeId: NodeId, additive: boolean) => void;

  onRenameNode: (nodeId: NodeId, name: string) => void;

  onSetNodeVisibility: (nodeId: NodeId, visible: boolean) => void;

  onSetNodeLocked: (nodeId: NodeId, locked: boolean) => void;
}

function LayerTree({
  document,
  selection,
  nodeId,
  depth = 0,
  onSelectNode,
  onRenameNode,
  onSetNodeVisibility,
  onSetNodeLocked,
}: LayerTreeProps) {
  const [renameDraft, setRenameDraft] = useState<string | null>(null);

  const cancelRenameRef = useRef(false);

  const node = document.nodes[nodeId];

  if (!node) {
    return null;
  }

  const childIds = node.type === "frame" ? node.childIds : [];

  const selected = isNodeSelected(selection, nodeId);

  const startRename = () => {
    cancelRenameRef.current = false;

    setRenameDraft(node.name);
  };

  const commitRename = () => {
    if (renameDraft === null) {
      return;
    }

    onRenameNode(node.id, renameDraft);

    setRenameDraft(null);
  };

  const cancelRename = () => {
    cancelRenameRef.current = true;

    setRenameDraft(null);
  };

  const rowStyle: CSSProperties = {
    paddingLeft: `${12 + depth * 16}px`,

    paddingRight: "66px",

    opacity: node.visible ? 1 : 0.5,
  };

  return (
    <>
      <div style={layerContainerStyle}>
        {renameDraft !== null ? (
          <div
            className={`${styles.layerRow} ${
              selected ? styles.selectedLayerRow : ""
            }`}
            style={rowStyle}
          >
            <span className={styles.layerIcon} aria-hidden="true">
              {nodeIcons[node.type]}
            </span>

            <input
              autoFocus
              type="text"
              value={renameDraft}
              aria-label={`Rename ${node.name}`}
              style={renameInputStyle}
              onFocus={(event) => {
                event.currentTarget.select();
              }}
              onChange={(event) => {
                setRenameDraft(event.currentTarget.value);
              }}
              onBlur={() => {
                if (cancelRenameRef.current) {
                  cancelRenameRef.current = false;

                  return;
                }

                commitRename();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();

                  event.currentTarget.blur();

                  return;
                }

                if (event.key === "Escape") {
                  event.preventDefault();

                  cancelRename();

                  event.currentTarget.blur();
                }
              }}
            />
          </div>
        ) : (
          <button
            type="button"
            className={`${styles.layerRow} ${
              selected ? styles.selectedLayerRow : ""
            }`}
            style={rowStyle}
            onClick={(event) => {
              if (!node.visible || node.locked) {
                return;
              }

              onSelectNode(nodeId, event.shiftKey);
            }}
            onDoubleClick={(event) => {
              event.preventDefault();

              startRename();
            }}
            onKeyDown={(event) => {
              if (event.key === "F2") {
                event.preventDefault();

                startRename();
              }
            }}
            aria-pressed={selected}
            title={
              !node.visible
                ? `${node.name} is hidden`
                : node.locked
                  ? `${node.name} is locked`
                  : node.name
            }
          >
            <span className={styles.layerIcon} aria-hidden="true">
              {nodeIcons[node.type]}
            </span>

            <span className={styles.layerName}>{node.name}</span>
          </button>
        )}

        <div style={layerActionsStyle}>
          <button
            type="button"
            style={{
              ...layerActionButtonStyle,

              color: node.visible ? "#52525b" : "#a1a1aa",
            }}
            aria-label={
              node.visible ? `Hide ${node.name}` : `Show ${node.name}`
            }
            aria-pressed={node.visible}
            title={node.visible ? "Hide object" : "Show object"}
            onClick={() => {
              onSetNodeVisibility(node.id, !node.visible);
            }}
          >
            <VisibilityIcon visible={node.visible} />
          </button>

          <button
            type="button"
            style={{
              ...layerActionButtonStyle,

              color: node.locked ? "#2563eb" : "#71717a",

              background: node.locked ? "rgb(37 99 235 / 8%)" : "transparent",
            }}
            aria-label={
              node.locked ? `Unlock ${node.name}` : `Lock ${node.name}`
            }
            aria-pressed={node.locked}
            title={node.locked ? "Unlock object" : "Lock object"}
            onClick={() => {
              onSetNodeLocked(node.id, !node.locked);
            }}
          >
            <LockIcon locked={node.locked} />
          </button>
        </div>
      </div>

      {childIds.map((childId) => (
        <LayerTree
          key={childId}
          document={document}
          selection={selection}
          nodeId={childId}
          depth={depth + 1}
          onSelectNode={onSelectNode}
          onRenameNode={onRenameNode}
          onSetNodeVisibility={onSetNodeVisibility}
          onSetNodeLocked={onSetNodeLocked}
        />
      ))}
    </>
  );
}

function isTextEditingTarget(target: EventTarget | null): boolean {
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

  const activeToolDefinition = useMemo(
    () => getEditorToolDefinition(activeTool),
    [activeTool],
  );

  const canUndoHistory = canUndo(history);

  const canRedoHistory = canRedo(history);

  const undoCommand = history.undoStack[history.undoStack.length - 1];

  const redoCommand = history.redoStack[history.redoStack.length - 1];

  const nodeCount = Object.keys(document.nodes).length;

  const selectedNodeCount = selection.selectedNodeIds.length;

  const selectedNodeId = selection.selectedNodeIds[0] ?? null;

  const selectedNode = selectedNodeId ? document.nodes[selectedNodeId] : null;

  const toolHint =
    activeTool === "select" ? "Space · Pan" : "Esc · Select · Space · Pan";

  const handleUndo = useCallback(() => {
    setEditorState((currentState) => undoEditorState(currentState));
  }, []);

  const handleRedo = useCallback(() => {
    setEditorState((currentState) => redoEditorState(currentState));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTextEditingTarget(event.target)) {
        return;
      }

      if (event.key === "Escape" && activeTool !== DEFAULT_EDITOR_TOOL) {
        event.preventDefault();

        event.stopImmediatePropagation();

        setActiveTool(DEFAULT_EDITOR_TOOL);

        return;
      }

      const tool = getEditorToolFromShortcut({
        key: event.key,

        metaKey: event.metaKey,

        ctrlKey: event.ctrlKey,

        shiftKey: event.shiftKey,

        altKey: event.altKey,
      });

      if (tool) {
        event.preventDefault();

        setActiveTool(tool);

        return;
      }

      const historyAction = getHistoryShortcut({
        key: event.key,

        metaKey: event.metaKey,

        ctrlKey: event.ctrlKey,

        shiftKey: event.shiftKey,

        altKey: event.altKey,
      });

      if (!historyAction) {
        return;
      }

      event.preventDefault();

      if (historyAction === "undo") {
        handleUndo();

        return;
      }

      handleRedo();
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [activeTool, handleRedo, handleUndo]);

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
      setActiveTool(DEFAULT_EDITOR_TOOL);

      setEditorState((currentState) => {
        const node = currentState.document.nodes[nodeId];

        if (!node || !node.visible || node.locked) {
          return currentState;
        }

        const nextSelection = additive
          ? toggleNodeSelection(currentState.selection, nodeId)
          : selectSingleNode(currentState.selection, nodeId);

        return setEditorSelection(currentState, nextSelection);
      });
    },
    [],
  );

  const handleRenameNode = useCallback(
    (
      nodeId: NodeId,

      name: string,
    ) => {
      setEditorState((currentState) => {
        const nextDocument = updateNodeName(
          currentState.document,
          nodeId,
          name,
        );

        if (nextDocument === currentState.document) {
          return currentState;
        }

        return dispatchEditorCommand(currentState, {
          kind: "update",

          label: "Rename object",

          nextDocument,
        });
      });
    },
    [],
  );

  const handleSetNodeVisibility = useCallback(
    (
      nodeId: NodeId,

      visible: boolean,
    ) => {
      setEditorState((currentState) => {
        const nextDocument = setNodeVisibility(
          currentState.document,
          nodeId,
          visible,
        );

        if (nextDocument === currentState.document) {
          return currentState;
        }

        const nextSelection = visible
          ? currentState.selection
          : removeNodeSubtreeFromSelection(
              currentState.document,
              currentState.selection,
              nodeId,
            );

        return dispatchEditorCommand(currentState, {
          kind: "update",

          label: visible ? "Show object" : "Hide object",

          nextDocument,

          nextSelection,
        });
      });
    },
    [],
  );

  const handleSetNodeLocked = useCallback(
    (
      nodeId: NodeId,

      locked: boolean,
    ) => {
      setEditorState((currentState) => {
        const nextDocument = setNodeLocked(
          currentState.document,
          nodeId,
          locked,
        );

        if (nextDocument === currentState.document) {
          return currentState;
        }

        const nextSelection = locked
          ? removeNodeSubtreeFromSelection(
              currentState.document,
              currentState.selection,
              nodeId,
            )
          : currentState.selection;

        return dispatchEditorCommand(currentState, {
          kind: "update",

          label: locked ? "Lock object" : "Unlock object",

          nextDocument,

          nextSelection,
        });
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

  const handlePropertyCommit = useCallback(
    (
      nodeId: NodeId,

      property: EditableNodeProperty,

      value: number,
    ) => {
      setEditorState((currentState) => {
        const selectedIds = currentState.selection.selectedNodeIds;

        if (selectedIds.length !== 1 || selectedIds[0] !== nodeId) {
          return currentState;
        }

        const nextDocument = updateNodeProperty(
          currentState.document,
          nodeId,
          property,
          value,
        );

        if (nextDocument === currentState.document) {
          return currentState;
        }

        return dispatchEditorCommand(currentState, {
          kind: "update",

          label: `Update ${propertyLabels[property]}`,

          nextDocument,
        });
      });
    },
    [],
  );

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
                  onRenameNode={handleRenameNode}
                  onSetNodeVisibility={handleSetNodeVisibility}
                  onSetNodeLocked={handleSetNodeLocked}
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
              <PropertiesInspector
                node={selectedNode}
                onCommit={handlePropertyCommit}
              />
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

          <span>
            Tool: {activeToolDefinition.label} ({activeToolDefinition.shortcut})
            · {toolHint}
          </span>

          <span>{nodeCount} objects</span>
        </footer>
      </main>
    </>
  );
}
