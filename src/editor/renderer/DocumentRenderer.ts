import type { CameraState } from "@/editor/camera/types";
import type { EditorDocument } from "@/editor/document/types";

export interface DocumentRenderer {
  render(
    document: EditorDocument,
    camera: CameraState,
    pixelRatio: number,
  ): void;

  dispose?: () => void;
}
