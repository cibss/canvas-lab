import type { NodeId } from "@/editor/document/types";

export interface SelectionState {
  selectedNodeIds: NodeId[];
}

function haveSameNodeIds(first: NodeId[], second: NodeId[]): boolean {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((nodeId, index) => nodeId === second[index]);
}

function getUniqueNodeIds(nodeIds: NodeId[]): NodeId[] {
  return Array.from(new Set(nodeIds));
}

export function createSelectionState(): SelectionState {
  return {
    selectedNodeIds: [],
  };
}

export function selectNodes(
  selection: SelectionState,
  nodeIds: NodeId[],
): SelectionState {
  const uniqueNodeIds = getUniqueNodeIds(nodeIds);

  if (haveSameNodeIds(selection.selectedNodeIds, uniqueNodeIds)) {
    return selection;
  }

  return {
    selectedNodeIds: uniqueNodeIds,
  };
}

export function selectSingleNode(
  selection: SelectionState,
  nodeId: NodeId,
): SelectionState {
  return selectNodes(selection, [nodeId]);
}

export function addNodesToSelection(
  selection: SelectionState,
  nodeIds: NodeId[],
): SelectionState {
  return selectNodes(selection, [...selection.selectedNodeIds, ...nodeIds]);
}

export function toggleNodeSelection(
  selection: SelectionState,
  nodeId: NodeId,
): SelectionState {
  if (selection.selectedNodeIds.includes(nodeId)) {
    return selectNodes(
      selection,
      selection.selectedNodeIds.filter(
        (selectedNodeId) => selectedNodeId !== nodeId,
      ),
    );
  }

  return addNodesToSelection(selection, [nodeId]);
}

export function clearSelection(selection: SelectionState): SelectionState {
  return selectNodes(selection, []);
}

export function isNodeSelected(
  selection: SelectionState,
  nodeId: NodeId,
): boolean {
  return selection.selectedNodeIds.includes(nodeId);
}
