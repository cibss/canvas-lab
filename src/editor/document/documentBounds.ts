import type { Bounds } from "@/editor/camera/types";

import { getNodeWorldBounds } from "./nodeGeometry";
import type { EditorDocument } from "./types";

export function getDocumentBounds(document: EditorDocument): Bounds | null {
  if (document.rootNodeIds.length === 0) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;

  let minY = Number.POSITIVE_INFINITY;

  let maxX = Number.NEGATIVE_INFINITY;

  let maxY = Number.NEGATIVE_INFINITY;

  let hasValidRoot = false;

  for (const rootNodeId of document.rootNodeIds) {
    const bounds = getNodeWorldBounds(document, rootNodeId);

    if (!bounds) {
      continue;
    }

    hasValidRoot = true;

    minX = Math.min(minX, bounds.x);

    minY = Math.min(minY, bounds.y);

    maxX = Math.max(maxX, bounds.x + bounds.width);

    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  if (!hasValidRoot) {
    return null;
  }

  return {
    x: minX,
    y: minY,

    width: maxX - minX,

    height: maxY - minY,
  };
}
