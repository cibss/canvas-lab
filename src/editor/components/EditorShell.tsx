"use client";

import { useCallback, useRef, useState } from "react";

import { sampleDocument } from "@/editor/document/sampleDocument";
import type {
  EditorDocument,
  EditorNode,
  NodeId,
} from "@/editor/document/types";
import {
  createSelectionState,
  isNodeSelected,
  selectSingleNode,
  toggleNodeSelection,
  type SelectionState,
} from "@/editor/selection/selection";

import { EditorCanvas, type EditorCanvasHandle } from "./EditorCanvas";

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

  onSelectNode: (nodeId: NodeId, additive: boolean) => void;
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

export function EditorShell() {
  const canvasRef = useRef<EditorCanvasHandle>(null);

  const [document, setDocument] = useState<EditorDocument>(
    () => sampleDocument,
  );

  const [zoomPercentage, setZoomPercentage] = useState(100);

  const [selection, setSelection] = useState<SelectionState>(() =>
    createSelectionState(),
  );

  const nodeCount = Object.keys(document.nodes).length;

  const selectedNodeCount = selection.selectedNodeIds.length;

  const selectedNodeId = selection.selectedNodeIds[0] ?? null;

  const selectedNode = selectedNodeId ? document.nodes[selectedNodeId] : null;

  const handleDocumentChange = useCallback((nextDocument: EditorDocument) => {
    setDocument(nextDocument);
  }, []);

  const handleZoomChange = useCallback((zoom: number) => {
    setZoomPercentage(Math.round(zoom * 100));
  }, []);

  const handleSelectionChange = useCallback((nextSelection: SelectionState) => {
    setSelection(nextSelection);
  }, []);

  const handleLayerSelect = useCallback((nodeId: NodeId, additive: boolean) => {
    setSelection((currentSelection) =>
      additive
        ? toggleNodeSelection(currentSelection, nodeId)
        : selectSingleNode(currentSelection, nodeId),
    );
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
            <span className={styles.historyAction}>↶</span>

            <span className={styles.historyAction}>↷</span>

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
          <aside className={styles.toolbar} aria-label="Editor tools">
            <div
              className={`${styles.tool} ${styles.activeTool}`}
              title="Select"
            >
              ↖
            </div>

            <div className={styles.tool} title="Rectangle">
              □
            </div>

            <div className={styles.tool} title="Ellipse">
              ○
            </div>

            <div className={styles.tool} title="Text">
              T
            </div>

            <div className={styles.tool} title="Frame">
              ▣
            </div>
          </aside>

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
              onDocumentChange={handleDocumentChange}
              onSelectionChange={handleSelectionChange}
              onZoomChange={handleZoomChange}
            />
          </section>

          <aside className={styles.propertiesPanel}>
            <div className={styles.panelHeader}>Properties</div>

            {selectedNodeCount > 1 ? (
              <div className={styles.selectionSummary}>
                <strong>{selectedNodeCount} objects selected</strong>

                <p>
                  Multiple objects are selected. Shared transform controls will
                  be added in the next milestone.
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
