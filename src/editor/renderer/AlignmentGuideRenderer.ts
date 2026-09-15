import type { CameraState } from "@/editor/camera/types";
import type { SnapGuide } from "@/editor/transform/snapping";

const GUIDE_COLOR = "#e11d48";

const GUIDE_STROKE_WIDTH = 1;

export class AlignmentGuideRenderer {
  private readonly context: CanvasRenderingContext2D;

  constructor(context: CanvasRenderingContext2D) {
    this.context = context;
  }

  render(guides: SnapGuide[], camera: CameraState, pixelRatio = 1) {
    if (guides.length === 0) {
      return;
    }

    this.context.save();

    this.applyCameraTransform(camera, pixelRatio);

    this.context.strokeStyle = GUIDE_COLOR;

    this.context.lineWidth = GUIDE_STROKE_WIDTH / camera.zoom;

    for (const guide of guides) {
      this.context.beginPath();

      if (guide.orientation === "vertical") {
        this.context.moveTo(guide.position, guide.start);

        this.context.lineTo(guide.position, guide.end);
      } else {
        this.context.moveTo(guide.start, guide.position);

        this.context.lineTo(guide.end, guide.position);
      }

      this.context.stroke();
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
