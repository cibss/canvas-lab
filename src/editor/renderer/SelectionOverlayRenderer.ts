import type { CameraState } from "@/editor/camera/types";
import { getNodeWorldBounds } from "@/editor/document/nodeGeometry";
import type { EditorDocument } from "@/editor/document/types";
import type { SelectionState } from "@/editor/selection/selection";

const SELECTION_COLOR = "#2563eb";
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
    if (selection.selectedNodeIds.length === 0) {
      return;
    }

    this.context.save();

    this.applyCameraTransform(camera, pixelRatio);

    this.context.strokeStyle = SELECTION_COLOR;

    this.context.lineWidth = SELECTION_STROKE_WIDTH / camera.zoom;

    for (const nodeId of selection.selectedNodeIds) {
      const bounds = getNodeWorldBounds(document, nodeId);

      if (!bounds) {
        continue;
      }

      this.context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
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
