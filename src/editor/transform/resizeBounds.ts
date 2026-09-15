import type { Bounds, Point } from "@/editor/camera/types";

import type { ResizeHandlePosition } from "./types";

export const DEFAULT_MIN_RESIZE_SIZE = 24;

export interface ResizeBoundsOptions {
  preserveAspectRatio?: boolean;
  fromCenter?: boolean;
  minWidth?: number;
  minHeight?: number;
}

function affectsWest(handle: ResizeHandlePosition): boolean {
  return (
    handle === "west" || handle === "north-west" || handle === "south-west"
  );
}

function affectsEast(handle: ResizeHandlePosition): boolean {
  return (
    handle === "east" || handle === "north-east" || handle === "south-east"
  );
}

function affectsNorth(handle: ResizeHandlePosition): boolean {
  return (
    handle === "north" || handle === "north-west" || handle === "north-east"
  );
}

function affectsSouth(handle: ResizeHandlePosition): boolean {
  return (
    handle === "south" || handle === "south-west" || handle === "south-east"
  );
}

export function resizeBoundsFromHandle(
  initialBounds: Bounds,
  handle: ResizeHandlePosition,
  pointer: Point,
  options: ResizeBoundsOptions = {},
): Bounds {
  const {
    preserveAspectRatio = false,
    fromCenter = false,
    minWidth = DEFAULT_MIN_RESIZE_SIZE,
    minHeight = DEFAULT_MIN_RESIZE_SIZE,
  } = options;

  const initialLeft = initialBounds.x;

  const initialTop = initialBounds.y;

  const initialRight = initialBounds.x + initialBounds.width;

  const initialBottom = initialBounds.y + initialBounds.height;

  const centerX = initialBounds.x + initialBounds.width / 2;

  const centerY = initialBounds.y + initialBounds.height / 2;

  const resizeWest = affectsWest(handle);

  const resizeEast = affectsEast(handle);

  const resizeNorth = affectsNorth(handle);

  const resizeSouth = affectsSouth(handle);

  const affectsHorizontal = resizeWest || resizeEast;

  const affectsVertical = resizeNorth || resizeSouth;

  let rawWidth = initialBounds.width;

  let rawHeight = initialBounds.height;

  if (affectsHorizontal) {
    if (fromCenter) {
      rawWidth = resizeWest
        ? (centerX - pointer.x) * 2
        : (pointer.x - centerX) * 2;
    } else {
      rawWidth = resizeWest
        ? initialRight - pointer.x
        : pointer.x - initialLeft;
    }
  }

  if (affectsVertical) {
    if (fromCenter) {
      rawHeight = resizeNorth
        ? (centerY - pointer.y) * 2
        : (pointer.y - centerY) * 2;
    } else {
      rawHeight = resizeNorth
        ? initialBottom - pointer.y
        : pointer.y - initialTop;
    }
  }

  let width = initialBounds.width;

  let height = initialBounds.height;

  if (preserveAspectRatio) {
    const safeInitialWidth = Math.max(initialBounds.width, Number.EPSILON);

    const safeInitialHeight = Math.max(initialBounds.height, Number.EPSILON);

    let candidateScale = 1;

    if (affectsHorizontal && affectsVertical) {
      candidateScale = Math.max(
        rawWidth / safeInitialWidth,

        rawHeight / safeInitialHeight,
      );
    } else if (affectsHorizontal) {
      candidateScale = rawWidth / safeInitialWidth;
    } else if (affectsVertical) {
      candidateScale = rawHeight / safeInitialHeight;
    }

    const minimumScale = Math.max(
      minWidth / safeInitialWidth,

      minHeight / safeInitialHeight,
    );

    const scale = Math.max(candidateScale, minimumScale);

    width = safeInitialWidth * scale;

    height = safeInitialHeight * scale;
  } else {
    if (affectsHorizontal) {
      width = Math.max(rawWidth, minWidth);
    }

    if (affectsVertical) {
      height = Math.max(rawHeight, minHeight);
    }
  }

  let x = initialLeft;

  let y = initialTop;

  if (fromCenter) {
    if (affectsHorizontal || (preserveAspectRatio && affectsVertical)) {
      x = centerX - width / 2;
    }

    if (affectsVertical || (preserveAspectRatio && affectsHorizontal)) {
      y = centerY - height / 2;
    }

    return {
      x,
      y,
      width,
      height,
    };
  }

  if (resizeWest) {
    x = initialRight - width;
  } else if (preserveAspectRatio && !affectsHorizontal && affectsVertical) {
    x = centerX - width / 2;
  }

  if (resizeNorth) {
    y = initialBottom - height;
  } else if (preserveAspectRatio && affectsHorizontal && !affectsVertical) {
    y = centerY - height / 2;
  }

  return {
    x,
    y,
    width,
    height,
  };
}
