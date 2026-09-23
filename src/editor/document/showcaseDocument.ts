import type { EditorDocument } from "./types";

export const showcaseDocument: EditorDocument = {
  schemaVersion: 1,

  id: "canvas-lab-sample",
  name: "CanvasLab Showcase",

  rootNodeIds: ["frame-main"],

  nodes: {
    "frame-main": {
      id: "frame-main",
      type: "frame",
      name: "CanvasLab Showcase",

      parentId: null,

      x: 120,
      y: 80,

      width: 1200,
      height: 720,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      childIds: [
        "background-accent-large",
        "background-accent-small",
        "sidebar-group",
        "header-group",
        "feature-group",
        "metric-group",
        "decision-group",
      ],

      fill: {
        type: "solid",
        color: "#f8fafc",
      },

      clipContent: true,
    },

    "background-accent-large": {
      id: "background-accent-large",
      type: "ellipse",
      name: "Ambient Purple",

      parentId: "frame-main",

      x: 968,
      y: -92,

      width: 330,
      height: 330,

      rotation: 0,
      opacity: 0.5,

      visible: true,
      locked: true,

      fill: {
        type: "solid",
        color: "#ddd6fe",
      },
    },

    "background-accent-small": {
      id: "background-accent-small",
      type: "ellipse",
      name: "Ambient Blue",

      parentId: "frame-main",

      x: 1032,
      y: 32,

      width: 146,
      height: 146,

      rotation: 0,
      opacity: 0.72,

      visible: true,
      locked: true,

      fill: {
        type: "solid",
        color: "#bae6fd",
      },
    },

    "sidebar-group": {
      id: "sidebar-group",
      type: "frame",
      name: "Sidebar",

      parentId: "frame-main",

      x: 40,
      y: 40,

      width: 220,
      height: 640,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      childIds: [
        "sidebar-background",
        "sidebar-logo-dot",
        "sidebar-logo-text",
        "sidebar-section-label",
        "sidebar-active-background",
        "sidebar-active-dot",
        "sidebar-active-text",
        "sidebar-layers-text",
        "sidebar-components-text",
        "sidebar-prototype-text",
        "sidebar-footer-text",
        "sidebar-status-dot",
        "sidebar-status-text",
      ],

      fill: null,
      clipContent: false,
    },

    "sidebar-background": {
      id: "sidebar-background",
      type: "rectangle",
      name: "Sidebar Background",

      parentId: "sidebar-group",

      x: 0,
      y: 0,

      width: 220,
      height: 640,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#0f172a",
      },

      cornerRadius: 28,
    },

    "sidebar-logo-dot": {
      id: "sidebar-logo-dot",
      type: "ellipse",
      name: "Logo Mark",

      parentId: "sidebar-group",

      x: 24,
      y: 24,

      width: 36,
      height: 36,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#38bdf8",
      },
    },

    "sidebar-logo-text": {
      id: "sidebar-logo-text",
      type: "text",
      name: "Logo Text",

      parentId: "sidebar-group",

      x: 72,
      y: 30,

      width: 120,
      height: 24,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "CanvasLab",

      fontFamily: "Arial",
      fontSize: 18,
      fontWeight: 700,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#f8fafc",
      },
    },

    "sidebar-section-label": {
      id: "sidebar-section-label",
      type: "text",
      name: "Sidebar Section Label",

      parentId: "sidebar-group",

      x: 24,
      y: 92,

      width: 120,
      height: 16,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "EDITOR",

      fontFamily: "Arial",
      fontSize: 10,
      fontWeight: 700,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#64748b",
      },
    },

    "sidebar-active-background": {
      id: "sidebar-active-background",
      type: "rectangle",
      name: "Active Navigation",

      parentId: "sidebar-group",

      x: 18,
      y: 118,

      width: 184,
      height: 44,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#1e293b",
      },

      cornerRadius: 12,
    },

    "sidebar-active-dot": {
      id: "sidebar-active-dot",
      type: "ellipse",
      name: "Active Dot",

      parentId: "sidebar-group",

      x: 34,
      y: 135,

      width: 10,
      height: 10,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#38bdf8",
      },
    },

    "sidebar-active-text": {
      id: "sidebar-active-text",
      type: "text",
      name: "Workspace Navigation",

      parentId: "sidebar-group",

      x: 58,
      y: 130,

      width: 120,
      height: 20,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "Workspace",

      fontFamily: "Arial",
      fontSize: 13,
      fontWeight: 600,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#f8fafc",
      },
    },

    "sidebar-layers-text": {
      id: "sidebar-layers-text",
      type: "text",
      name: "Layers Navigation",

      parentId: "sidebar-group",

      x: 34,
      y: 186,

      width: 130,
      height: 18,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "Layers",

      fontFamily: "Arial",
      fontSize: 13,
      fontWeight: 500,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#94a3b8",
      },
    },

    "sidebar-components-text": {
      id: "sidebar-components-text",
      type: "text",
      name: "Components Navigation",

      parentId: "sidebar-group",

      x: 34,
      y: 226,

      width: 130,
      height: 18,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "Components",

      fontFamily: "Arial",
      fontSize: 13,
      fontWeight: 500,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#94a3b8",
      },
    },

    "sidebar-prototype-text": {
      id: "sidebar-prototype-text",
      type: "text",
      name: "Prototype Navigation",

      parentId: "sidebar-group",

      x: 34,
      y: 266,

      width: 130,
      height: 18,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "Prototype",

      fontFamily: "Arial",
      fontSize: 13,
      fontWeight: 500,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#94a3b8",
      },
    },

    "sidebar-footer-text": {
      id: "sidebar-footer-text",
      type: "text",
      name: "Architecture Note",

      parentId: "sidebar-group",

      x: 24,
      y: 522,

      width: 170,
      height: 40,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "Canvas2D + WebGPU\narchitecture lab",

      fontFamily: "Arial",
      fontSize: 12,
      fontWeight: 500,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#64748b",
      },
    },

    "sidebar-status-dot": {
      id: "sidebar-status-dot",
      type: "ellipse",
      name: "Performance Status",

      parentId: "sidebar-group",

      x: 24,
      y: 596,

      width: 10,
      height: 10,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#22c55e",
      },
    },

    "sidebar-status-text": {
      id: "sidebar-status-text",
      type: "text",
      name: "Performance Label",

      parentId: "sidebar-group",

      x: 44,
      y: 592,

      width: 145,
      height: 18,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "Performance verified",

      fontFamily: "Arial",
      fontSize: 11,
      fontWeight: 600,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#cbd5e1",
      },
    },

    "header-group": {
      id: "header-group",
      type: "frame",
      name: "Hero",

      parentId: "frame-main",

      x: 308,
      y: 52,

      width: 844,
      height: 190,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      childIds: [
        "header-pill-background",
        "header-pill-text",
        "header-title",
        "header-subtitle",
        "header-ellipse-large",
        "header-ellipse-small",
        "header-accent-bar",
      ],

      fill: null,
      clipContent: false,
    },

    "header-pill-background": {
      id: "header-pill-background",
      type: "rectangle",
      name: "Hero Label Background",

      parentId: "header-group",

      x: 0,
      y: 0,

      width: 154,
      height: 28,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#dbeafe",
      },

      cornerRadius: 14,
    },

    "header-pill-text": {
      id: "header-pill-text",
      type: "text",
      name: "Hero Label",

      parentId: "header-group",

      x: 14,
      y: 8,

      width: 132,
      height: 14,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "INTERACTIVE SYSTEMS",

      fontFamily: "Arial",
      fontSize: 10,
      fontWeight: 700,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#2563eb",
      },
    },

    "header-title": {
      id: "header-title",
      type: "text",
      name: "Hero Title",

      parentId: "header-group",

      x: 0,
      y: 46,

      width: 610,
      height: 106,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "Design tools,\nbuilt like systems.",

      fontFamily: "Arial",
      fontSize: 42,
      fontWeight: 700,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#0f172a",
      },
    },

    "header-subtitle": {
      id: "header-subtitle",
      type: "text",
      name: "Hero Description",

      parentId: "header-group",

      x: 0,
      y: 158,

      width: 640,
      height: 22,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content:
        "Transforms, history, accessibility, rendering, and performance — in one editor.",

      fontFamily: "Arial",
      fontSize: 15,
      fontWeight: 400,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#64748b",
      },
    },

    "header-ellipse-large": {
      id: "header-ellipse-large",
      type: "ellipse",
      name: "Hero Purple Orb",

      parentId: "header-group",

      x: 660,
      y: 8,

      width: 154,
      height: 154,

      rotation: 0,
      opacity: 0.62,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#c4b5fd",
      },
    },

    "header-ellipse-small": {
      id: "header-ellipse-small",
      type: "ellipse",
      name: "Hero Blue Orb",

      parentId: "header-group",

      x: 724,
      y: 54,

      width: 88,
      height: 88,

      rotation: 0,
      opacity: 0.88,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#38bdf8",
      },
    },

    "header-accent-bar": {
      id: "header-accent-bar",
      type: "rectangle",
      name: "Hero Accent Bar",

      parentId: "header-group",

      x: 688,
      y: 118,

      width: 106,
      height: 12,

      rotation: -12,
      opacity: 0.18,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#0f172a",
      },

      cornerRadius: 6,
    },

    "feature-group": {
      id: "feature-group",
      type: "frame",
      name: "Canvas Engine Card",

      parentId: "frame-main",

      x: 308,
      y: 280,

      width: 520,
      height: 376,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      childIds: [
        "feature-background",
        "feature-accent",
        "feature-kicker",
        "feature-title",
        "feature-subtitle",
        "feature-chip-one-background",
        "feature-chip-one-text",
        "feature-chip-two-background",
        "feature-chip-two-text",
        "feature-chip-three-background",
        "feature-chip-three-text",
        "feature-layer-document",
        "feature-layer-document-text",
        "feature-layer-overlay",
        "feature-layer-overlay-text",
        "feature-layer-worker",
        "feature-layer-worker-text",
        "feature-layer-gpu-dot",
        "feature-layer-gpu-text",
      ],

      fill: null,
      clipContent: false,
    },

    "feature-background": {
      id: "feature-background",
      type: "rectangle",
      name: "Canvas Engine Background",

      parentId: "feature-group",

      x: 0,
      y: 0,

      width: 520,
      height: 376,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#ffffff",
      },

      cornerRadius: 24,
    },

    "feature-accent": {
      id: "feature-accent",
      type: "rectangle",
      name: "Canvas Engine Accent",

      parentId: "feature-group",

      x: 0,
      y: 0,

      width: 8,
      height: 376,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#2563eb",
      },

      cornerRadius: 4,
    },

    "feature-kicker": {
      id: "feature-kicker",
      type: "text",
      name: "Canvas Engine Label",

      parentId: "feature-group",

      x: 32,
      y: 28,

      width: 180,
      height: 14,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "CANVAS ENGINE",

      fontFamily: "Arial",
      fontSize: 10,
      fontWeight: 700,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#2563eb",
      },
    },

    "feature-title": {
      id: "feature-title",
      type: "text",
      name: "Canvas Engine Title",

      parentId: "feature-group",

      x: 32,
      y: 58,

      width: 400,
      height: 72,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "Precision at every\ninteraction.",

      fontFamily: "Arial",
      fontSize: 28,
      fontWeight: 700,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#0f172a",
      },
    },

    "feature-subtitle": {
      id: "feature-subtitle",
      type: "text",
      name: "Canvas Engine Description",

      parentId: "feature-group",

      x: 32,
      y: 140,

      width: 444,
      height: 40,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content:
        "Pan, zoom, snapping, rotation, nested frames, and undo/redo share one document model.",

      fontFamily: "Arial",
      fontSize: 14,
      fontWeight: 400,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#64748b",
      },
    },

    "feature-chip-one-background": {
      id: "feature-chip-one-background",
      type: "rectangle",
      name: "Viewport Chip",

      parentId: "feature-group",

      x: 32,
      y: 214,

      width: 128,
      height: 44,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#eff6ff",
      },

      cornerRadius: 12,
    },

    "feature-chip-one-text": {
      id: "feature-chip-one-text",
      type: "text",
      name: "Viewport Chip Label",

      parentId: "feature-group",

      x: 46,
      y: 229,

      width: 104,
      height: 14,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "Viewport culling",

      fontFamily: "Arial",
      fontSize: 11,
      fontWeight: 600,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#1d4ed8",
      },
    },

    "feature-chip-two-background": {
      id: "feature-chip-two-background",
      type: "rectangle",
      name: "Spatial Chip",

      parentId: "feature-group",

      x: 176,
      y: 214,

      width: 120,
      height: 44,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#f5f3ff",
      },

      cornerRadius: 12,
    },

    "feature-chip-two-text": {
      id: "feature-chip-two-text",
      type: "text",
      name: "Spatial Chip Label",

      parentId: "feature-group",

      x: 190,
      y: 229,

      width: 96,
      height: 14,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "Spatial index",

      fontFamily: "Arial",
      fontSize: 11,
      fontWeight: 600,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#6d28d9",
      },
    },

    "feature-chip-three-background": {
      id: "feature-chip-three-background",
      type: "rectangle",
      name: "Layered Rendering Chip",

      parentId: "feature-group",

      x: 312,
      y: 214,

      width: 148,
      height: 44,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#ecfeff",
      },

      cornerRadius: 12,
    },

    "feature-chip-three-text": {
      id: "feature-chip-three-text",
      type: "text",
      name: "Layered Rendering Label",

      parentId: "feature-group",

      x: 326,
      y: 229,

      width: 124,
      height: 14,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "Layered rendering",

      fontFamily: "Arial",
      fontSize: 11,
      fontWeight: 600,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#0e7490",
      },
    },

    "feature-layer-document": {
      id: "feature-layer-document",
      type: "rectangle",
      name: "Document Layer",

      parentId: "feature-group",

      x: 32,
      y: 302,

      width: 104,
      height: 40,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#0f172a",
      },

      cornerRadius: 10,
    },

    "feature-layer-document-text": {
      id: "feature-layer-document-text",
      type: "text",
      name: "Document Layer Label",

      parentId: "feature-group",

      x: 47,
      y: 316,

      width: 76,
      height: 14,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "Document",

      fontFamily: "Arial",
      fontSize: 11,
      fontWeight: 600,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#f8fafc",
      },
    },

    "feature-layer-overlay": {
      id: "feature-layer-overlay",
      type: "rectangle",
      name: "Overlay Layer",

      parentId: "feature-group",

      x: 148,
      y: 302,

      width: 104,
      height: 40,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#e0e7ff",
      },

      cornerRadius: 10,
    },

    "feature-layer-overlay-text": {
      id: "feature-layer-overlay-text",
      type: "text",
      name: "Overlay Layer Label",

      parentId: "feature-group",

      x: 165,
      y: 316,

      width: 70,
      height: 14,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "Overlay",

      fontFamily: "Arial",
      fontSize: 11,
      fontWeight: 600,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#4338ca",
      },
    },

    "feature-layer-worker": {
      id: "feature-layer-worker",
      type: "rectangle",
      name: "Worker Layer",

      parentId: "feature-group",

      x: 264,
      y: 302,

      width: 104,
      height: 40,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#ccfbf1",
      },

      cornerRadius: 10,
    },

    "feature-layer-worker-text": {
      id: "feature-layer-worker-text",
      type: "text",
      name: "Worker Layer Label",

      parentId: "feature-group",

      x: 281,
      y: 316,

      width: 70,
      height: 14,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "Worker",

      fontFamily: "Arial",
      fontSize: 11,
      fontWeight: 600,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#0f766e",
      },
    },

    "feature-layer-gpu-dot": {
      id: "feature-layer-gpu-dot",
      type: "ellipse",
      name: "GPU Dot",

      parentId: "feature-group",

      x: 396,
      y: 309,

      width: 26,
      height: 26,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#38bdf8",
      },
    },

    "feature-layer-gpu-text": {
      id: "feature-layer-gpu-text",
      type: "text",
      name: "GPU Label",

      parentId: "feature-group",

      x: 432,
      y: 316,

      width: 44,
      height: 14,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "GPU",

      fontFamily: "Arial",
      fontSize: 11,
      fontWeight: 700,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#0369a1",
      },
    },

    "metric-group": {
      id: "metric-group",
      type: "frame",
      name: "Stress Harness Card",

      parentId: "frame-main",

      x: 852,
      y: 280,

      width: 300,
      height: 176,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      childIds: [
        "metric-background",
        "metric-decoration",
        "metric-kicker",
        "metric-number",
        "metric-copy",
      ],

      fill: null,
      clipContent: false,
    },

    "metric-background": {
      id: "metric-background",
      type: "rectangle",
      name: "Stress Harness Background",

      parentId: "metric-group",

      x: 0,
      y: 0,

      width: 300,
      height: 176,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#4f46e5",
      },

      cornerRadius: 24,
    },

    "metric-decoration": {
      id: "metric-decoration",
      type: "ellipse",
      name: "Stress Harness Decoration",

      parentId: "metric-group",

      x: 228,
      y: 18,

      width: 54,
      height: 54,

      rotation: 0,
      opacity: 0.15,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#ffffff",
      },
    },

    "metric-kicker": {
      id: "metric-kicker",
      type: "text",
      name: "Stress Harness Label",

      parentId: "metric-group",

      x: 24,
      y: 24,

      width: 150,
      height: 14,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "STRESS HARNESS",

      fontFamily: "Arial",
      fontSize: 10,
      fontWeight: 700,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#c7d2fe",
      },
    },

    "metric-number": {
      id: "metric-number",
      type: "text",
      name: "Stress Harness Count",

      parentId: "metric-group",

      x: 24,
      y: 52,

      width: 190,
      height: 54,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "10,000",

      fontFamily: "Arial",
      fontSize: 44,
      fontWeight: 700,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#ffffff",
      },
    },

    "metric-copy": {
      id: "metric-copy",
      type: "text",
      name: "Stress Harness Description",

      parentId: "metric-group",

      x: 24,
      y: 114,

      width: 236,
      height: 38,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "objects verified with\n60 FPS observed cadence",

      fontFamily: "Arial",
      fontSize: 13,
      fontWeight: 500,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#e0e7ff",
      },
    },

    "decision-group": {
      id: "decision-group",
      type: "frame",
      name: "Renderer Decision Card",

      parentId: "frame-main",

      x: 852,
      y: 480,

      width: 300,
      height: 176,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      childIds: [
        "decision-background",
        "decision-status-dot",
        "decision-kicker",
        "decision-title",
        "decision-copy",
        "decision-accent",
      ],

      fill: null,
      clipContent: false,
    },

    "decision-background": {
      id: "decision-background",
      type: "rectangle",
      name: "Renderer Decision Background",

      parentId: "decision-group",

      x: 0,
      y: 0,

      width: 300,
      height: 176,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#ffffff",
      },

      cornerRadius: 24,
    },

    "decision-status-dot": {
      id: "decision-status-dot",
      type: "ellipse",
      name: "Renderer Decision Status",

      parentId: "decision-group",

      x: 24,
      y: 28,

      width: 12,
      height: 12,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#22c55e",
      },
    },

    "decision-kicker": {
      id: "decision-kicker",
      type: "text",
      name: "Renderer Decision Label",

      parentId: "decision-group",

      x: 46,
      y: 27,

      width: 170,
      height: 14,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "RENDERER DECISION",

      fontFamily: "Arial",
      fontSize: 10,
      fontWeight: 700,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#64748b",
      },
    },

    "decision-title": {
      id: "decision-title",
      type: "text",
      name: "Renderer Decision Title",

      parentId: "decision-group",

      x: 24,
      y: 58,

      width: 250,
      height: 30,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content: "Canvas2D stays.",

      fontFamily: "Arial",
      fontSize: 24,
      fontWeight: 700,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#0f172a",
      },
    },

    "decision-copy": {
      id: "decision-copy",
      type: "text",
      name: "Renderer Decision Description",

      parentId: "decision-group",

      x: 24,
      y: 100,

      width: 252,
      height: 52,

      rotation: 0,
      opacity: 1,

      visible: true,
      locked: false,

      content:
        "WebGPU was benchmarked, but the measured trade-off did not justify a production rewrite.",

      fontFamily: "Arial",
      fontSize: 12,
      fontWeight: 400,

      textAlign: "left",

      fill: {
        type: "solid",
        color: "#64748b",
      },
    },

    "decision-accent": {
      id: "decision-accent",
      type: "rectangle",
      name: "Renderer Decision Accent",

      parentId: "decision-group",

      x: 236,
      y: 142,

      width: 40,
      height: 10,

      rotation: -8,
      opacity: 1,

      visible: true,
      locked: false,

      fill: {
        type: "solid",
        color: "#8b5cf6",
      },

      cornerRadius: 5,
    },
  },
};
