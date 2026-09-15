import { getNodeWorldBounds } from "@/editor/document/nodeGeometry";
import type { EditorDocument } from "@/editor/document/types";
import type { SelectionState } from "@/editor/selection/selection";
import { getTopLevelSelectedNodeIds } from "@/editor/selection/selectionHierarchy";

import type { TransformBounds } from "./types";

export function getSelectionBounds(
  document: EditorDocument,
  selection: SelectionState,
): TransformBounds | null {
  const selectedNodeIds = getTopLevelSelectedNodeIds(
    document,
    selection.selectedNodeIds,
  );

  if (selectedNodeIds.length === 0) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;

  let minY = Number.POSITIVE_INFINITY;

  let maxX = Number.NEGATIVE_INFINITY;

  let maxY = Number.NEGATIVE_INFINITY;

  let hasValidNode = false;

  for (const nodeId of selectedNodeIds) {
    const bounds = getNodeWorldBounds(document, nodeId);

    if (!bounds) {
      continue;
    }

    hasValidNode = true;

    minX = Math.min(minX, bounds.x);

    minY = Math.min(minY, bounds.y);

    maxX = Math.max(maxX, bounds.x + bounds.width);

    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  if (!hasValidNode) {
    return null;
  }

  const width = maxX - minX;

  const height = maxY - minY;

  return {
    x: minX,
    y: minY,

    width,
    height,

    centerX: minX + width / 2,

    centerY: minY + height / 2,
  };
}
