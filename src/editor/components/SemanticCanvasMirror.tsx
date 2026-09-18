"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import {
  createAccessibleObjectEntries,
  getAccessibleFocusTarget,
  resolveAccessibleFocusNodeId,
  type AccessibleNavigationKey,
} from "@/editor/accessibility/focusModel";
import { getSemanticNodeDescription } from "@/editor/accessibility/semanticMirror";
import type { EditorDocument, NodeId } from "@/editor/document/types";
import type { SelectionState } from "@/editor/selection/selection";

import styles from "./SemanticCanvasMirror.module.css";

interface SemanticCanvasMirrorProps {
  document: EditorDocument;

  selection: SelectionState;

  onSelectNode: (nodeId: NodeId) => void;
}

const navigationKeys = new Set<string>([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
]);

function isNavigationKey(key: string): key is AccessibleNavigationKey {
  return navigationKeys.has(key);
}

export function SemanticCanvasMirror({
  document,
  selection,
  onSelectNode,
}: SemanticCanvasMirrorProps) {
  const [focusedNodeId, setFocusedNodeId] = useState<NodeId | null>(null);

  const itemRefs = useRef(new Map<NodeId, HTMLButtonElement>());

  const entries = createAccessibleObjectEntries(document);

  const activeNodeId = resolveAccessibleFocusNodeId(entries, focusedNodeId);

  const selectedNodeIds = new Set(selection.selectedNodeIds);

  const focusNode = (nodeId: NodeId) => {
    setFocusedNodeId(nodeId);

    itemRefs.current.get(nodeId)?.focus();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    nodeId: NodeId,
  ) => {
    if (isNavigationKey(event.key)) {
      event.preventDefault();
      event.stopPropagation();

      const nextNodeId = getAccessibleFocusTarget(entries, nodeId, event.key);

      if (nextNodeId) {
        focusNode(nextNodeId);
      }

      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const entry = entries.find((candidate) => candidate.node.id === nodeId);

    if (!entry || entry.node.locked) {
      return;
    }

    onSelectNode(nodeId);
  };

  return (
    <section
      className={styles.semanticMirror}
      aria-labelledby="canvas-object-navigator-title"
    >
      <h2 id="canvas-object-navigator-title" className={styles.title}>
        Canvas objects
      </h2>

      <p className={styles.instructions}>
        Use arrow keys to navigate objects. Press Enter or Space to select the
        focused object.
      </p>

      {entries.length > 0 ? (
        <div
          className={styles.tree}
          role="tree"
          aria-label="Canvas object navigator"
        >
          {entries.map((entry) => {
            const { node, depth, hasChildren } = entry;

            const selected = selectedNodeIds.has(node.id);

            const active = activeNodeId === node.id;

            return (
              <button
                key={node.id}
                ref={(element) => {
                  if (element) {
                    itemRefs.current.set(node.id, element);

                    return;
                  }

                  itemRefs.current.delete(node.id);
                }}
                type="button"
                role="treeitem"
                tabIndex={active ? 0 : -1}
                aria-level={depth}
                aria-selected={selected}
                aria-disabled={node.locked || undefined}
                aria-expanded={hasChildren ? true : undefined}
                className={styles.treeItem}
                style={{
                  paddingLeft: `${12 + (depth - 1) * 16}px`,
                }}
                onFocus={() => {
                  setFocusedNodeId(node.id);
                }}
                onClick={() => {
                  setFocusedNodeId(node.id);

                  if (node.locked) {
                    return;
                  }

                  onSelectNode(node.id);
                }}
                onKeyDown={(event) => {
                  handleKeyDown(event, node.id);
                }}
              >
                <span className={styles.objectName}>{node.name}</span>

                <span className={styles.objectDescription}>
                  {getSemanticNodeDescription(node)}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className={styles.emptyState}>
          The canvas does not contain any visible objects.
        </p>
      )}
    </section>
  );
}
