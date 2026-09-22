import { worldToScreen } from "@/editor/camera/camera";
import type { CameraState } from "@/editor/camera/types";
import type { EditorDocument } from "@/editor/document/types";

export const WEBGPU_RECTANGLE_INSTANCE_FLOATS = 9;

export interface WebGpuRectangleScene {
  instanceData: Float32Array;
  instanceCount: number;
}

export type WebGpuColor = readonly [number, number, number, number];

const FALLBACK_COLOR: WebGpuColor = [0.376, 0.647, 0.98, 1];

function expandShortHex(value: string): string {
  return value
    .split("")
    .map((character) => `${character}${character}`)
    .join("");
}

export function decodeWebGpuHexColor(color: string, opacity = 1): WebGpuColor {
  const normalized = color.trim();

  const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;

  const expandedHex = hex.length === 3 ? expandShortHex(hex) : hex;

  if (expandedHex.length !== 6 || !/^[0-9a-f]{6}$/i.test(expandedHex)) {
    return [
      FALLBACK_COLOR[0],
      FALLBACK_COLOR[1],
      FALLBACK_COLOR[2],
      Math.max(0, Math.min(1, opacity)),
    ];
  }

  const numericValue = Number.parseInt(expandedHex, 16);

  const red = (numericValue >> 16) & 0xff;

  const green = (numericValue >> 8) & 0xff;

  const blue = numericValue & 0xff;

  return [
    red / 255,
    green / 255,
    blue / 255,
    Math.max(0, Math.min(1, opacity)),
  ];
}

export function createWebGpuRectangleScene(
  document: EditorDocument,
  camera: CameraState,
): WebGpuRectangleScene {
  const values: number[] = [];

  for (const nodeId of document.rootNodeIds) {
    const node = document.nodes[nodeId];

    if (
      !node ||
      !node.visible ||
      node.parentId !== null ||
      node.type !== "rectangle" ||
      !node.fill
    ) {
      continue;
    }

    const center = worldToScreen(
      {
        x: node.x + node.width / 2,

        y: node.y + node.height / 2,
      },
      camera,
    );

    const color = decodeWebGpuHexColor(node.fill.color, node.opacity);

    values.push(
      center.x,
      center.y,
      node.width * camera.zoom,
      node.height * camera.zoom,
      (node.rotation * Math.PI) / 180,
      color[0],
      color[1],
      color[2],
      color[3],
    );
  }

  return {
    instanceData: new Float32Array(values),

    instanceCount: values.length / WEBGPU_RECTANGLE_INSTANCE_FLOATS,
  };
}
