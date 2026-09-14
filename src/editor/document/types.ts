export type NodeId = string;

export type EditorNodeType = "frame" | "rectangle" | "ellipse" | "text";

export type TextAlign = "left" | "center" | "right";

export interface SolidPaint {
  type: "solid";
  color: string;
}

export interface BaseEditorNode {
  id: NodeId;
  type: EditorNodeType;
  name: string;

  parentId: NodeId | null;

  x: number;
  y: number;

  width: number;
  height: number;

  rotation: number;
  opacity: number;

  visible: boolean;
  locked: boolean;
}

export interface FrameNode extends BaseEditorNode {
  type: "frame";

  childIds: NodeId[];

  fill: SolidPaint | null;
  clipContent: boolean;
}

export interface RectangleNode extends BaseEditorNode {
  type: "rectangle";

  fill: SolidPaint | null;
  cornerRadius: number;
}

export interface EllipseNode extends BaseEditorNode {
  type: "ellipse";

  fill: SolidPaint | null;
}

export interface TextNode extends BaseEditorNode {
  type: "text";

  content: string;

  fontFamily: string;
  fontSize: number;
  fontWeight: number;

  textAlign: TextAlign;

  fill: SolidPaint;
}

export type EditorNode = FrameNode | RectangleNode | EllipseNode | TextNode;

export interface EditorDocument {
  schemaVersion: 1;

  id: string;
  name: string;

  rootNodeIds: NodeId[];

  nodes: Record<NodeId, EditorNode>;
}
