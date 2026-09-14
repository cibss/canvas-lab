import type { EditorDocument } from "./types";

export const sampleDocument = {
  schemaVersion: 1,

  id: "canvas-lab-sample",
  name: "CanvasLab Sample",

  rootNodeIds: ["frame-main"],

  nodes: {
    "frame-main": {
      id: "frame-main",
      type: "frame",
      name: "Desktop",

      parentId: null,

      x: 120,
      y: 80,

      width: 1200,
      height: 720,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      childIds: ["rectangle-hero", "ellipse-decoration", "text-title"],

      fill: {
        type: "solid",
        color: "#ffffff",
      },

      clipContent: true,
    },

    "rectangle-hero": {
      id: "rectangle-hero",
      type: "rectangle",
      name: "Hero Background",

      parentId: "frame-main",

      x: 64,
      y: 64,

      width: 1072,
      height: 320,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#e4e4e7",
      },

      cornerRadius: 24,
    },

    "ellipse-decoration": {
      id: "ellipse-decoration",
      type: "ellipse",
      name: "Decoration",

      parentId: "frame-main",

      x: 880,
      y: 120,

      width: 180,
      height: 180,

      rotation: 0,
      opacity: 0.8,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#a1a1aa",
      },
    },

    "text-title": {
      id: "text-title",
      type: "text",
      name: "Hero Title",

      parentId: "frame-main",

      x: 112,
      y: 152,

      width: 560,
      height: 72,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "Design without limits.",

      fontFamily: "Arial",
      fontSize: 48,
      fontWeight: 700,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#18181b",
      },
    },
  },
} satisfies EditorDocument;
