import type { NodeId } from "@/editor/document/types";

export interface SelectionState {
  selectedNodeIds: NodeId[];
}

export function createSelectionState(): SelectionState {
  return {
    selectedNodeIds: [],
  };
}

export function selectSingleNode(
  selection: SelectionState,
  nodeId: NodeId,
): SelectionState {
  if (
    selection.selectedNodeIds.length === 1 &&
    selection.selectedNodeIds[0] === nodeId
  ) {
    return selection;
  }

  return {
    selectedNodeIds: [nodeId],
  };
}

export function clearSelection(selection: SelectionState): SelectionState {
  if (selection.selectedNodeIds.length === 0) {
    return selection;
  }

  return {
    selectedNodeIds: [],
  };
}

export function isNodeSelected(
  selection: SelectionState,
  nodeId: NodeId,
): boolean {
  return selection.selectedNodeIds.includes(nodeId);
}
