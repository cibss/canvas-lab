import type { CameraState } from "@/editor/camera/types";
import type { EditorDocument } from "@/editor/document/types";
import type { SelectionState } from "@/editor/selection/selection";
import {
  getResizeHandles,
  RESIZE_HANDLE_VISUAL_SIZE,
} from "@/editor/transform/resizeHandles";
import { getSelectionBounds } from "@/editor/transform/selectionBounds";

const SELECTION_COLOR = "#2563eb";

const HANDLE_FILL = "#ffffff";

const SELECTION_STROKE_WIDTH = 1.5;

export class SelectionOverlayRenderer {
  private readonly context: CanvasRenderingContext2D;

  constructor(context: CanvasRenderingContext2D) {
    this.context = context;
  }

  render(
    document: EditorDocument,
    selection: SelectionState,
    camera: CameraState,
    pixelRatio = 1,
  ) {
    const bounds = getSelectionBounds(document, selection);

    if (!bounds) {
      return;
    }

    this.context.save();

    this.applyCameraTransform(camera, pixelRatio);

    this.context.strokeStyle = SELECTION_COLOR;

    this.context.lineWidth = SELECTION_STROKE_WIDTH / camera.zoom;

    this.context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    const handles = getResizeHandles(bounds);

    const handleSize = RESIZE_HANDLE_VISUAL_SIZE / camera.zoom;

    const handleOffset = handleSize / 2;

    this.context.fillStyle = HANDLE_FILL;

    for (const handle of handles) {
      const x = handle.point.x - handleOffset;

      const y = handle.point.y - handleOffset;

      this.context.fillRect(x, y, handleSize, handleSize);

      this.context.strokeRect(x, y, handleSize, handleSize);
    }

    this.context.restore();
  }

  private applyCameraTransform(camera: CameraState, pixelRatio: number) {
    const scale = camera.zoom * pixelRatio;

    this.context.setTransform(
      scale,
      0,
      0,
      scale,

      camera.offsetX * pixelRatio,

      camera.offsetY * pixelRatio,
    );
  }
}
