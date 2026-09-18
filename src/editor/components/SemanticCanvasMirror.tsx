import {
  createSemanticDocumentTree,
  getSemanticNodeDescription,
  type SemanticNode,
} from "@/editor/accessibility/semanticMirror";
import type { EditorDocument } from "@/editor/document/types";

import styles from "./SemanticCanvasMirror.module.css";

interface SemanticNodeListProps {
  nodes: SemanticNode[];
}

function SemanticNodeList({ nodes }: SemanticNodeListProps) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <ul>
      {nodes.map((node) => (
        <li key={node.id}>
          <span>
            <strong>{node.name}</strong>

            {", "}

            {getSemanticNodeDescription(node)}
          </span>

          <SemanticNodeList nodes={node.children} />
        </li>
      ))}
    </ul>
  );
}

interface SemanticCanvasMirrorProps {
  document: EditorDocument;
}

export function SemanticCanvasMirror({ document }: SemanticCanvasMirrorProps) {
  const tree = createSemanticDocumentTree(document);

  return (
    <section
      className={styles.semanticMirror}
      aria-labelledby="canvas-document-structure"
    >
      <h2 id="canvas-document-structure">Canvas document structure</h2>

      {tree.length > 0 ? (
        <SemanticNodeList nodes={tree} />
      ) : (
        <p>The canvas does not contain any visible objects.</p>
      )}
    </section>
  );
}
