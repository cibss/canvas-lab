import { describe, expect, it } from "vitest";

import { sampleDocument } from "./sampleDocument";
import {
  createShapeNodeId,
  getShapeCreationBounds,
  insertRootShape,
  insertShape,
} from "./shapeCreation";

describe("shape creation", () => {
  it("normalizes a reverse drag", () => {
    expect(
      getShapeCreationBounds(
        {
          x: 200,
          y: 150,
        },
        {
          x: 100,
          y: 80,
        },
      ),
    ).toEqual({
      x: 100,
      y: 80,

      width: 100,
      height: 70,
    });
  });

  it("constrains creation to a square", () => {
    expect(
      getShapeCreationBounds(
        {
          x: 10,
          y: 10,
        },
        {
          x: 60,
          y: 40,
        },
        {
          constrainSquare: true,
        },
      ),
    ).toEqual({
      x: 10,
      y: 10,

      width: 50,
      height: 50,
    });
  });

  it("creates bounds from the center", () => {
    expect(
      getShapeCreationBounds(
        {
          x: 100,
          y: 100,
        },
        {
          x: 130,
          y: 120,
        },
        {
          fromCenter: true,
        },
      ),
    ).toEqual({
      x: 70,
      y: 80,

      width: 60,
      height: 40,
    });
  });

  it("creates a unique root rectangle", () => {
    const nodeId = createShapeNodeId(sampleDocument, "rectangle");

    const result = insertRootShape(sampleDocument, "rectangle", nodeId, {
      x: 400,
      y: 300,

      width: 160,
      height: 90,
    });

    const node = result.nodes[nodeId];

    expect(node.type).toBe("rectangle");

    expect(node.parentId).toBeNull();

    expect(node.x).toBe(400);

    expect(node.y).toBe(300);

    expect(node.width).toBe(160);

    expect(node.height).toBe(90);

    expect(result.rootNodeIds).toContain(nodeId);

    expect(sampleDocument.nodes[nodeId]).toBeUndefined();
  });

  it("parents a created shape when its bounds fit inside a frame", () => {
    const nodeId = createShapeNodeId(sampleDocument, "rectangle");

    const result = insertShape(sampleDocument, "rectangle", nodeId, {
      x: 250,
      y: 220,
      width: 160,
      height: 90,
    });

    const node = result.nodes[nodeId];

    expect(node.parentId).toBe("frame-main");
    expect(result.rootNodeIds).not.toContain(nodeId);

    const frame = result.nodes["frame-main"];

    expect(frame.type).toBe("frame");

    if (frame.type !== "frame") {
      return;
    }

    expect(frame.childIds).toContain(nodeId);
  });

  it("keeps a created shape at the root when it does not fit inside a frame", () => {
    const nodeId = createShapeNodeId(sampleDocument, "rectangle");

    const result = insertShape(sampleDocument, "rectangle", nodeId, {
      x: 1300,
      y: 760,
      width: 160,
      height: 90,
    });

    expect(result.nodes[nodeId].parentId).toBeNull();
    expect(result.rootNodeIds).toContain(nodeId);
  });

  it("creates an empty frame", () => {
    const nodeId = createShapeNodeId(sampleDocument, "frame");

    const result = insertRootShape(sampleDocument, "frame", nodeId, {
      x: 300,
      y: 200,

      width: 500,
      height: 400,
    });

    const node = result.nodes[nodeId];

    expect(node.type).toBe("frame");

    if (node.type !== "frame") {
      return;
    }

    expect(node.childIds).toEqual([]);

    expect(node.clipContent).toBe(true);
  });

  it("increments generated ids when an id already exists", () => {
    const firstId = createShapeNodeId(sampleDocument, "ellipse");

    const firstDocument = insertRootShape(sampleDocument, "ellipse", firstId, {
      x: 0,
      y: 0,

      width: 100,
      height: 100,
    });

    const secondId = createShapeNodeId(firstDocument, "ellipse");

    expect(secondId).not.toBe(firstId);
  });
});
