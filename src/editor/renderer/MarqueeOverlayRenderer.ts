import type { CameraState } from "@/editor/camera/types";
import {
  getMarqueeBounds,
  type MarqueeState,
} from "@/editor/selection/marquee";

const MARQUEE_STROKE = "#2563eb";

const MARQUEE_FILL = "rgba(37, 99, 235, 0.08)";

export class MarqueeOverlayRenderer {
  private readonly context: CanvasRenderingContext2D;

  constructor(context: CanvasRenderingContext2D) {
    this.context = context;
  }

  render(marquee: MarqueeState | null, camera: CameraState, pixelRatio = 1) {
    if (!marquee) {
      return;
    }

    const bounds = getMarqueeBounds(marquee);

    this.context.save();

    this.applyCameraTransform(camera, pixelRatio);

    this.context.fillStyle = MARQUEE_FILL;

    this.context.strokeStyle = MARQUEE_STROKE;

    this.context.lineWidth = 1 / camera.zoom;

    this.context.setLineDash([4 / camera.zoom, 3 / camera.zoom]);

    this.context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

    this.context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

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
