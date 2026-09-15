import type { CameraState } from "@/editor/camera/types";
import {
  getNodeWorldGeometry,
  type NodeWorldGeometry,
} from "@/editor/document/nodeGeometry";
import type { EditorDocument } from "@/editor/document/types";
import type { SelectionState } from "@/editor/selection/selection";
import {
  getResizeHandles,
  getResizeHandlesForNode,
  RESIZE_HANDLE_VISUAL_SIZE,
} from "@/editor/transform/resizeHandles";
import {
  getRotationHandleGeometry,
  ROTATION_HANDLE_VISUAL_SIZE,
} from "@/editor/transform/rotationHandle";
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
    if (selection.selectedNodeIds.length === 0) {
      return;
    }

    this.context.save();

    this.applyCameraTransform(camera, pixelRatio);

    this.context.strokeStyle = SELECTION_COLOR;

    this.context.fillStyle = HANDLE_FILL;

    this.context.lineWidth = SELECTION_STROKE_WIDTH / camera.zoom;

    if (selection.selectedNodeIds.length === 1) {
      const nodeId = selection.selectedNodeIds[0];

      const geometry = getNodeWorldGeometry(document, nodeId);

      if (geometry) {
        this.renderSingleSelection(geometry, camera);
      }

      this.context.restore();

      return;
    }

    const bounds = getSelectionBounds(document, selection);

    if (!bounds) {
      this.context.restore();

      return;
    }

    this.context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    this.renderResizeHandles(getResizeHandles(bounds), camera);

    this.context.restore();
  }

  private renderSingleSelection(
    geometry: NodeWorldGeometry,
    camera: CameraState,
  ) {
    if (Math.abs(geometry.rotation) < 0.000001) {
      const northWest = geometry.corners.northWest;

      const width = geometry.corners.northEast.x - northWest.x;

      const height = geometry.corners.southWest.y - northWest.y;

      this.context.strokeRect(northWest.x, northWest.y, width, height);
    } else {
      this.context.beginPath();

      this.context.moveTo(
        geometry.corners.northWest.x,

        geometry.corners.northWest.y,
      );

      this.context.lineTo(
        geometry.corners.northEast.x,

        geometry.corners.northEast.y,
      );

      this.context.lineTo(
        geometry.corners.southEast.x,

        geometry.corners.southEast.y,
      );

      this.context.lineTo(
        geometry.corners.southWest.x,

        geometry.corners.southWest.y,
      );

      this.context.closePath();
      this.context.stroke();
    }

    this.renderResizeHandles(getResizeHandlesForNode(geometry), camera);

    const rotationHandle = getRotationHandleGeometry(geometry, camera.zoom);

    const rotationSize = ROTATION_HANDLE_VISUAL_SIZE / camera.zoom;

    const rotationOffset = rotationSize / 2;

    this.context.strokeRect(
      rotationHandle.point.x - rotationOffset,

      rotationHandle.point.y - rotationOffset,

      rotationSize,
      rotationSize,
    );
  }

  private renderResizeHandles(
    handles: ReturnType<typeof getResizeHandles>,
    camera: CameraState,
  ) {
    const handleSize = RESIZE_HANDLE_VISUAL_SIZE / camera.zoom;

    const handleOffset = handleSize / 2;

    for (const handle of handles) {
      const x = handle.point.x - handleOffset;

      const y = handle.point.y - handleOffset;

      this.context.fillRect(x, y, handleSize, handleSize);

      this.context.strokeRect(x, y, handleSize, handleSize);
    }
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
