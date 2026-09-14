import type {
  EditorDocument,
  EditorNode,
  NodeId,
} from "@/editor/document/types";
import { sampleDocument } from "@/editor/document/sampleDocument";

import { EditorCanvas } from "./EditorCanvas";

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
  const document = sampleDocument;
  const nodeCount = Object.keys(document.nodes).length;

  return (
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

          <span className={styles.zoom}>100%</span>
        </div>
      </header>

      <div className={styles.editor}>
        <aside className={styles.toolbar} aria-label="Editor tools">
          <div className={`${styles.tool} ${styles.activeTool}`} title="Select">
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
          <EditorCanvas document={document} />
        </section>

        <aside className={styles.propertiesPanel}>
          <div className={styles.panelHeader}>Properties</div>

          <div className={styles.emptyProperties}>
            <strong>No selection</strong>

            <p>Select an object to inspect its properties.</p>
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
        <span>Ready</span>

        <span>{nodeCount} objects</span>

        <span>Canvas 2D · 60 FPS target</span>
      </footer>
    </main>
  );
}
