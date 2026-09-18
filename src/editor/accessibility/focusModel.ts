import type { EditorDocument, NodeId } from "@/editor/document/types";

import {
  createSemanticDocumentTree,
  type SemanticNode,
} from "./semanticMirror";

export type AccessibleNavigationKey =
  | "ArrowUp"
  | "ArrowDown"
  | "ArrowLeft"
  | "ArrowRight"
  | "Home"
  | "End";

export interface AccessibleObjectEntry {
  node: SemanticNode;

  parentId: NodeId | null;

  depth: number;

  hasChildren: boolean;
}

function flattenSemanticNodes(
  nodes: SemanticNode[],
  parentId: NodeId | null,
  depth: number,
  result: AccessibleObjectEntry[],
): void {
  for (const node of nodes) {
    result.push({
      node,

      parentId,

      depth,

      hasChildren: node.children.length > 0,
    });

    flattenSemanticNodes(node.children, node.id, depth + 1, result);
  }
}

export function createAccessibleObjectEntries(
  document: EditorDocument,
): AccessibleObjectEntry[] {
  const tree = createSemanticDocumentTree(document);

  const result: AccessibleObjectEntry[] = [];

  flattenSemanticNodes(tree, null, 1, result);

  return result;
}

export function resolveAccessibleFocusNodeId(
  entries: AccessibleObjectEntry[],
  focusedNodeId: NodeId | null,
): NodeId | null {
  if (entries.length === 0) {
    return null;
  }

  if (
    focusedNodeId &&
    entries.some((entry) => entry.node.id === focusedNodeId)
  ) {
    return focusedNodeId;
  }

  return entries[0].node.id;
}

export function getAccessibleFocusTarget(
  entries: AccessibleObjectEntry[],
  focusedNodeId: NodeId | null,
  key: AccessibleNavigationKey,
): NodeId | null {
  if (entries.length === 0) {
    return null;
  }

  const resolvedNodeId = resolveAccessibleFocusNodeId(entries, focusedNodeId);

  if (!resolvedNodeId) {
    return null;
  }

  const index = entries.findIndex((entry) => entry.node.id === resolvedNodeId);

  if (index < 0) {
    return entries[0].node.id;
  }

  const current = entries[index];

  switch (key) {
    case "ArrowDown":
      return entries[Math.min(index + 1, entries.length - 1)].node.id;

    case "ArrowUp":
      return entries[Math.max(index - 1, 0)].node.id;

    case "Home":
      return entries[0].node.id;

    case "End":
      return entries[entries.length - 1].node.id;

    case "ArrowRight": {
      if (!current.hasChildren) {
        return current.node.id;
      }

      const next = entries[index + 1];

      if (next && next.parentId === current.node.id) {
        return next.node.id;
      }

      return current.node.id;
    }

    case "ArrowLeft":
      return current.parentId ?? current.node.id;
  }
}
