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
  nodeId: NodeId;
  depth?: number;
}

function LayerTree({ document, nodeId, depth = 0 }: LayerTreeProps) {
  const node = document.nodes[nodeId];

  if (!node) {
    return null;
  }

  const childIds = node.type === "frame" ? node.childIds : [];

  return (
    <>
      <div
        className={styles.layerRow}
        style={{
          paddingLeft: `${12 + depth * 16}px`,
        }}
      >
        <span className={styles.layerIcon} aria-hidden="true">
          {nodeIcons[node.type]}
        </span>

        <span className={styles.layerName}>{node.name}</span>
      </div>

      {childIds.map((childId) => (
        <LayerTree
          key={childId}
          document={document}
          nodeId={childId}
          depth={depth + 1}
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
                <LayerTree key={nodeId} document={document} nodeId={nodeId} />
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

            <div className={styles.emptyProperties}>
              {selectedNode ? (
                <>
                  <strong>{selectedNode.name}</strong>

                  <p>
                    {selectedNode.type} selected. Property editing will be added
                    later.
                  </p>
                </>
              ) : (
                <>
                  <strong>No selection</strong>

                  <p>Select an object to inspect its properties.</p>
                </>
              )}
            </div>

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
            {selectedNode ? `${selectedNode.name} selected` : "Ready"}
          </span>

          <span>{nodeCount} objects</span>

          <span>Canvas 2D · 60 FPS target</span>
        </footer>
      </main>
    </>
  );
}
