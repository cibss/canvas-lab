import type { EditorDocument, EditorNode } from "@/editor/document/types";
import type { EditableNodeProperty } from "@/editor/document/nodeProperties";
import type { SelectionState } from "@/editor/selection/selection";

export type AnnounceableEditorAction =
  | "create"
  | "move"
  | "resize"
  | "rotate"
  | "update";

export type NodeStateAction = "show" | "hide" | "lock" | "unlock";

export type HistoryAnnouncementAction = "undo" | "redo";

function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function getSelectedNodes(
  document: EditorDocument,
  selection: SelectionState,
): EditorNode[] {
  return selection.selectedNodeIds
    .map((nodeId) => document.nodes[nodeId])
    .filter((node): node is EditorNode => node !== undefined);
}

export function getSelectionAnnouncement(
  document: EditorDocument,
  selection: SelectionState,
): string {
  const nodes = getSelectedNodes(document, selection);

  if (nodes.length === 0) {
    return "Selection cleared.";
  }

  if (nodes.length === 1) {
    return `${nodes[0].name} selected.`;
  }

  return `${nodes.length} objects selected.`;
}

export function getEditorActionAnnouncement(
  document: EditorDocument,
  selection: SelectionState,
  action: AnnounceableEditorAction,
): string | null {
  const nodes = getSelectedNodes(document, selection);

  if (nodes.length === 0) {
    return null;
  }

  if (nodes.length > 1) {
    switch (action) {
      case "create":
        return `${nodes.length} objects created.`;

      case "move":
        return `${nodes.length} objects moved.`;

      case "resize":
        return `${nodes.length} objects resized.`;

      case "rotate":
        return `${nodes.length} objects rotated.`;

      case "update":
        return `${nodes.length} objects updated.`;
    }
  }

  const node = nodes[0];

  switch (action) {
    case "create":
      return `${node.name} created.`;

    case "move":
      return `${node.name} moved to X ${formatNumber(node.x)}, Y ${formatNumber(
        node.y,
      )}.`;

    case "resize":
      return `${node.name} resized to ${formatNumber(
        node.width,
      )} by ${formatNumber(node.height)}.`;

    case "rotate":
      return `${node.name} rotated to ${formatNumber(node.rotation)} degrees.`;

    case "update":
      return `${node.name} updated.`;
  }
}

export function getDeleteAnnouncement(
  document: EditorDocument,
  selection: SelectionState,
): string | null {
  const nodes = getSelectedNodes(document, selection);

  if (nodes.length === 0) {
    return null;
  }

  if (nodes.length === 1) {
    return `${nodes[0].name} deleted.`;
  }

  return `${nodes.length} objects deleted.`;
}

export function getNodeStateAnnouncement(
  nodeName: string,
  action: NodeStateAction,
): string {
  switch (action) {
    case "show":
      return `${nodeName} shown.`;

    case "hide":
      return `${nodeName} hidden.`;

    case "lock":
      return `${nodeName} locked.`;

    case "unlock":
      return `${nodeName} unlocked.`;
  }
}

export function getRenameAnnouncement(
  previousName: string,
  nextName: string,
): string {
  return `${previousName} renamed to ${nextName}.`;
}

export function getPropertyAnnouncement(
  node: EditorNode,
  property: EditableNodeProperty,
): string {
  switch (property) {
    case "x":
      return `${node.name} X position ${formatNumber(node.x)}.`;

    case "y":
      return `${node.name} Y position ${formatNumber(node.y)}.`;

    case "width":
      return `${node.name} width ${formatNumber(node.width)}.`;

    case "height":
      return `${node.name} height ${formatNumber(node.height)}.`;

    case "rotation":
      return `${node.name} rotation ${formatNumber(node.rotation)} degrees.`;

    case "opacity":
      return `${node.name} opacity ${Math.round(node.opacity * 100)} percent.`;
  }
}

export function getHistoryAnnouncement(
  action: HistoryAnnouncementAction,
  commandLabel: string,
): string {
  if (action === "undo") {
    return `Undid ${commandLabel}.`;
  }

  return `Redid ${commandLabel}.`;
}
