/// <reference types="@webgpu/types" />

import type { CameraState } from "@/editor/camera/types";
import type { EditorDocument } from "@/editor/document/types";
import type { DocumentRenderer } from "@/editor/renderer/DocumentRenderer";

import {
  createWebGpuRectangleScene,
  WEBGPU_RECTANGLE_INSTANCE_FLOATS,
} from "./webGpuRectangleScene";

const BYTES_PER_FLOAT = 4;
const INITIAL_INSTANCE_BUFFER_BYTES = 256;

const SHADER_SOURCE = /* wgsl */ `
struct ViewportUniform {
  size: vec2<f32>,
  padding: vec2<f32>,
};

@group(0) @binding(0)
var<uniform> viewport: ViewportUniform;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
};

@vertex
fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @location(0) center: vec2<f32>,
  @location(1) size: vec2<f32>,
  @location(2) rotation: f32,
  @location(3) color: vec4<f32>,
) -> VertexOutput {
  let positions = array<vec2<f32>, 6>(
    vec2<f32>(-0.5, -0.5),
    vec2<f32>(0.5, -0.5),
    vec2<f32>(-0.5, 0.5),
    vec2<f32>(-0.5, 0.5),
    vec2<f32>(0.5, -0.5),
    vec2<f32>(0.5, 0.5),
  );

  let local = positions[vertexIndex] * size;
  let sine = sin(rotation);
  let cosine = cos(rotation);

  let rotated = vec2<f32>(
    local.x * cosine - local.y * sine,
    local.x * sine + local.y * cosine,
  );

  let pixelPosition = center + rotated;

  let clipPosition = vec2<f32>(
    pixelPosition.x / viewport.size.x * 2.0 - 1.0,
    1.0 - pixelPosition.y / viewport.size.y * 2.0,
  );

  var output: VertexOutput;
  output.position = vec4<f32>(clipPosition, 0.0, 1.0);
  output.color = color;

  return output;
}

@fragment
fn fragmentMain(
  input: VertexOutput,
) -> @location(0) vec4<f32> {
  return input.color;
}
`;

function getNextBufferSize(requiredBytes: number): number {
  let size = INITIAL_INSTANCE_BUFFER_BYTES;

  while (size < requiredBytes) {
    size *= 2;
  }

  return size;
}

export class WebGpuRectangleRenderer implements DocumentRenderer {
  private instanceBuffer: GPUBuffer;

  private instanceBufferBytes: number;

  private constructor(
    private readonly canvas: HTMLCanvasElement,

    private readonly device: GPUDevice,

    private readonly context: GPUCanvasContext,

    private readonly pipeline: GPURenderPipeline,

    private readonly viewportBuffer: GPUBuffer,

    private readonly viewportBindGroup: GPUBindGroup,
  ) {
    this.instanceBufferBytes = INITIAL_INSTANCE_BUFFER_BYTES;

    this.instanceBuffer = this.createInstanceBuffer(this.instanceBufferBytes);
  }

  static isSupported(): boolean {
    return typeof navigator !== "undefined" && Boolean(navigator.gpu);
  }

  static async create(
    canvas: HTMLCanvasElement,
  ): Promise<WebGpuRectangleRenderer> {
    if (!WebGpuRectangleRenderer.isSupported()) {
      throw new Error("WebGPU is not available in this browser.");
    }

    const adapter = await navigator.gpu.requestAdapter();

    if (!adapter) {
      throw new Error("WebGPU adapter could not be created.");
    }

    const device = await adapter.requestDevice();

    const context = canvas.getContext("webgpu") as GPUCanvasContext | null;

    if (!context) {
      device.destroy();

      throw new Error("WebGPU canvas context could not be created.");
    }

    const format = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
      device,
      format,
      alphaMode: "premultiplied",
    });

    const shaderModule = device.createShaderModule({
      label: "CanvasLab rectangle experiment shader",

      code: SHADER_SOURCE,
    });

    const pipeline = device.createRenderPipeline({
      label: "CanvasLab rectangle experiment pipeline",

      layout: "auto",

      vertex: {
        module: shaderModule,

        entryPoint: "vertexMain",

        buffers: [
          {
            arrayStride: WEBGPU_RECTANGLE_INSTANCE_FLOATS * BYTES_PER_FLOAT,

            stepMode: "instance",

            attributes: [
              {
                shaderLocation: 0,

                offset: 0,

                format: "float32x2",
              },
              {
                shaderLocation: 1,

                offset: 2 * BYTES_PER_FLOAT,

                format: "float32x2",
              },
              {
                shaderLocation: 2,

                offset: 4 * BYTES_PER_FLOAT,

                format: "float32",
              },
              {
                shaderLocation: 3,

                offset: 5 * BYTES_PER_FLOAT,

                format: "float32x4",
              },
            ],
          },
        ],
      },

      fragment: {
        module: shaderModule,

        entryPoint: "fragmentMain",

        targets: [
          {
            format,

            blend: {
              color: {
                srcFactor: "src-alpha",

                dstFactor: "one-minus-src-alpha",

                operation: "add",
              },

              alpha: {
                srcFactor: "one",

                dstFactor: "one-minus-src-alpha",

                operation: "add",
              },
            },
          },
        ],
      },

      primitive: {
        topology: "triangle-list",
      },
    });

    const viewportBuffer = device.createBuffer({
      label: "CanvasLab rectangle experiment viewport uniform",

      size: 16,

      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const viewportBindGroup = device.createBindGroup({
      label: "CanvasLab rectangle experiment viewport bind group",

      layout: pipeline.getBindGroupLayout(0),

      entries: [
        {
          binding: 0,

          resource: {
            buffer: viewportBuffer,
          },
        },
      ],
    });

    return new WebGpuRectangleRenderer(
      canvas,
      device,
      context,
      pipeline,
      viewportBuffer,
      viewportBindGroup,
    );
  }

  render(
    document: EditorDocument,
    camera: CameraState,
    pixelRatio: number,
  ): void {
    if (this.canvas.width <= 0 || this.canvas.height <= 0 || pixelRatio <= 0) {
      return;
    }

    const scene = createWebGpuRectangleScene(document, camera);

    const requiredBytes = Math.max(
      scene.instanceData.byteLength,

      BYTES_PER_FLOAT * WEBGPU_RECTANGLE_INSTANCE_FLOATS,
    );

    this.ensureInstanceBufferCapacity(requiredBytes);

    if (scene.instanceCount > 0) {
      const instanceArrayBuffer = scene.instanceData.buffer as ArrayBuffer;

      this.device.queue.writeBuffer(
        this.instanceBuffer,
        0,
        instanceArrayBuffer,
        scene.instanceData.byteOffset,
        scene.instanceData.byteLength,
      );
    }

    const viewportWidth = this.canvas.width / pixelRatio;

    const viewportHeight = this.canvas.height / pixelRatio;

    this.device.queue.writeBuffer(
      this.viewportBuffer,
      0,
      new Float32Array([viewportWidth, viewportHeight, 0, 0]),
    );

    const commandEncoder = this.device.createCommandEncoder({
      label: "CanvasLab rectangle experiment commands",
    });

    const renderPass = commandEncoder.beginRenderPass({
      label: "CanvasLab rectangle experiment pass",

      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),

          clearValue: {
            r: 0.973,
            g: 0.98,
            b: 0.988,
            a: 1,
          },

          loadOp: "clear",

          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(this.pipeline);

    renderPass.setBindGroup(0, this.viewportBindGroup);

    if (scene.instanceCount > 0) {
      renderPass.setVertexBuffer(0, this.instanceBuffer);

      renderPass.draw(6, scene.instanceCount);
    }

    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }

  dispose(): void {
    this.instanceBuffer.destroy();
    this.viewportBuffer.destroy();
    this.device.destroy();
  }

  private createInstanceBuffer(size: number): GPUBuffer {
    return this.device.createBuffer({
      label: "CanvasLab rectangle experiment instances",

      size,

      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
  }

  private ensureInstanceBufferCapacity(requiredBytes: number): void {
    if (requiredBytes <= this.instanceBufferBytes) {
      return;
    }

    const nextSize = getNextBufferSize(requiredBytes);

    this.instanceBuffer.destroy();

    this.instanceBuffer = this.createInstanceBuffer(nextSize);

    this.instanceBufferBytes = nextSize;
  }
}
