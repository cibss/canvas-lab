import type {
  EditorDocument,
  EditorNode,
  EllipseNode,
  FrameNode,
  RectangleNode,
  TextNode,
} from "@/editor/document/types";

export class Canvas2DRenderer {
  private readonly context: CanvasRenderingContext2D;

  constructor(context: CanvasRenderingContext2D) {
    this.context = context;
  }

  render(document: EditorDocument) {
    this.clearCanvas();

    for (const rootNodeId of document.rootNodeIds) {
      const rootNode = document.nodes[rootNodeId];

      if (!rootNode) {
        continue;
      }

      this.renderNode(document, rootNode);
    }
  }

  private clearCanvas() {
    const { canvas } = this.context;

    this.context.save();

    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.clearRect(0, 0, canvas.width, canvas.height);

    this.context.restore();
  }

  private renderNode(document: EditorDocument, node: EditorNode) {
    if (!node.visible) {
      return;
    }

    this.context.save();

    this.applyNodeTransform(node);

    switch (node.type) {
      case "frame":
        this.renderFrame(document, node);
        break;

      case "rectangle":
        this.renderRectangle(node);
        break;

      case "ellipse":
        this.renderEllipse(node);
        break;

      case "text":
        this.renderText(node);
        break;

      default:
        this.assertNever(node);
    }

    this.context.restore();
  }

  private applyNodeTransform(node: EditorNode) {
    const centerX = node.width / 2;
    const centerY = node.height / 2;

    this.context.translate(node.x, node.y);

    if (node.rotation !== 0) {
      this.context.translate(centerX, centerY);
      this.context.rotate(this.degreesToRadians(node.rotation));
      this.context.translate(-centerX, -centerY);
    }

    this.context.globalAlpha *= node.opacity;
  }

  private renderFrame(document: EditorDocument, node: FrameNode) {
    if (node.fill) {
      this.context.fillStyle = node.fill.color;
      this.context.fillRect(0, 0, node.width, node.height);
    }

    if (node.clipContent) {
      this.context.beginPath();
      this.context.rect(0, 0, node.width, node.height);
      this.context.clip();
    }

    for (const childId of node.childIds) {
      const child = document.nodes[childId];

      if (!child) {
        continue;
      }

      this.renderNode(document, child);
    }
  }

  private renderRectangle(node: RectangleNode) {
    if (!node.fill) {
      return;
    }

    this.context.beginPath();

    this.createRoundedRectanglePath(node.width, node.height, node.cornerRadius);

    this.context.fillStyle = node.fill.color;
    this.context.fill();
  }

  private renderEllipse(node: EllipseNode) {
    if (!node.fill) {
      return;
    }

    this.context.beginPath();

    this.context.ellipse(
      node.width / 2,
      node.height / 2,
      node.width / 2,
      node.height / 2,
      0,
      0,
      Math.PI * 2,
    );

    this.context.fillStyle = node.fill.color;
    this.context.fill();
  }

  private renderText(node: TextNode) {
    this.context.fillStyle = node.fill.color;

    this.context.font = `${node.fontWeight} ${node.fontSize}px ${node.fontFamily}`;
    this.context.textBaseline = "top";

    switch (node.textAlign) {
      case "left":
        this.context.textAlign = "left";
        break;

      case "center":
        this.context.textAlign = "center";
        break;

      case "right":
        this.context.textAlign = "right";
        break;
    }

    let textX = 0;

    if (node.textAlign === "center") {
      textX = node.width / 2;
    }

    if (node.textAlign === "right") {
      textX = node.width;
    }

    this.context.fillText(node.content, textX, 0, node.width);
  }

  private createRoundedRectanglePath(
    width: number,
    height: number,
    cornerRadius: number,
  ) {
    const radius = Math.min(Math.max(cornerRadius, 0), width / 2, height / 2);

    this.context.moveTo(radius, 0);

    this.context.lineTo(width - radius, 0);
    this.context.quadraticCurveTo(width, 0, width, radius);

    this.context.lineTo(width, height - radius);
    this.context.quadraticCurveTo(width, height, width - radius, height);

    this.context.lineTo(radius, height);
    this.context.quadraticCurveTo(0, height, 0, height - radius);

    this.context.lineTo(0, radius);
    this.context.quadraticCurveTo(0, 0, radius, 0);

    this.context.closePath();
  }

  private degreesToRadians(degrees: number) {
    return degrees * (Math.PI / 180);
  }

  private assertNever(value: never): never {
    throw new Error(`Unsupported editor node: ${JSON.stringify(value)}`);
  }
}
