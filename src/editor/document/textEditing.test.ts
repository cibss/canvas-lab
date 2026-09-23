import { describe, expect, it } from "vitest";

import { sampleDocument } from "./sampleDocument";
import {
  createTextNodeId,
  DEFAULT_TEXT_HEIGHT,
  DEFAULT_TEXT_WIDTH,
  insertRootText,
  insertText,
  updateTextNodeContent,
} from "./textEditing";

describe("text editing", () => {
  it("creates a unique text node id", () => {
    const firstId = createTextNodeId(sampleDocument);

    const firstDocument = insertRootText(sampleDocument, firstId, {
      x: 400,
      y: 300,
    });

    const secondId = createTextNodeId(firstDocument);

    expect(secondId).not.toBe(firstId);
  });

  it("inserts an empty root text node", () => {
    const nodeId = createTextNodeId(sampleDocument);

    const result = insertRootText(sampleDocument, nodeId, {
      x: 400,
      y: 300,
    });

    const node = result.nodes[nodeId];

    expect(node.type).toBe("text");

    if (node.type !== "text") {
      return;
    }

    expect(node.parentId).toBeNull();

    expect(node.x).toBe(400);
    expect(node.y).toBe(300);

    expect(node.width).toBe(DEFAULT_TEXT_WIDTH);

    expect(node.height).toBe(DEFAULT_TEXT_HEIGHT);

    expect(node.content).toBe("");

    expect(result.rootNodeIds).toContain(nodeId);

    expect(sampleDocument.nodes[nodeId]).toBeUndefined();
  });

  it("parents text created inside a frame", () => {
    const nodeId = createTextNodeId(sampleDocument);

    const result = insertText(sampleDocument, nodeId, {
      x: 300,
      y: 300,
    });

    const node = result.nodes[nodeId];

    expect(node.type).toBe("text");

    if (node.type !== "text") {
      return;
    }

    expect(node.parentId).toBe("frame-main");
    expect(result.rootNodeIds).not.toContain(nodeId);

    const frame = result.nodes["frame-main"];

    expect(frame.type).toBe("frame");

    if (frame.type !== "frame") {
      return;
    }

    expect(frame.childIds).toContain(nodeId);
  });

  it("keeps text created outside frames at the root", () => {
    const nodeId = createTextNodeId(sampleDocument);

    const result = insertText(sampleDocument, nodeId, {
      x: 1500,
      y: 900,
    });

    expect(result.nodes[nodeId].parentId).toBeNull();
    expect(result.rootNodeIds).toContain(nodeId);
  });

  it("updates text content immutably", () => {
    const result = updateTextNodeContent(
      sampleDocument,
      "text-title",
      "Updated title",
    );

    const node = result.nodes["text-title"];

    expect(node.type).toBe("text");

    if (node.type !== "text") {
      return;
    }

    expect(node.content).toBe("Updated title");

    expect(result).not.toBe(sampleDocument);

    const originalNode = sampleDocument.nodes["text-title"];

    expect(originalNode.type).toBe("text");

    if (originalNode.type !== "text") {
      return;
    }

    expect(originalNode.content).not.toBe("Updated title");
  });

  it("returns the same document when content did not change", () => {
    const node = sampleDocument.nodes["text-title"];

    expect(node.type).toBe("text");

    if (node.type !== "text") {
      return;
    }

    const result = updateTextNodeContent(sampleDocument, node.id, node.content);

    expect(result).toBe(sampleDocument);
  });

  it("grows text height for multiline content", () => {
    const nodeId = createTextNodeId(sampleDocument);

    const document = insertRootText(sampleDocument, nodeId, {
      x: 0,
      y: 0,
    });

    const result = updateTextNodeContent(
      document,
      nodeId,
      ["Line one", "Line two", "Line three"].join("\n"),
    );

    expect(result.nodes[nodeId].height).toBeGreaterThan(DEFAULT_TEXT_HEIGHT);
  });

  it("does not update a non-text node", () => {
    const result = updateTextNodeContent(
      sampleDocument,
      "rectangle-hero",
      "Not text",
    );

    expect(result).toBe(sampleDocument);
  });
});
