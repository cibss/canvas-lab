import { describe, expect, it } from "vitest";

import { getResizeHandlePoint, getResizeHandles } from "./resizeHandles";
import type { TransformBounds } from "./types";

const bounds: TransformBounds = {
  x: 100,
  y: 200,

  width: 400,
  height: 300,

  centerX: 300,
  centerY: 350,
};

describe("resize handles", () => {
  it("creates eight resize handles", () => {
    expect(getResizeHandles(bounds)).toHaveLength(8);
  });

  it("places the north-west handle at the top-left corner", () => {
    expect(getResizeHandlePoint(bounds, "north-west")).toEqual({
      x: 100,
      y: 200,
    });
  });

  it("places the east handle at the right-center", () => {
    expect(getResizeHandlePoint(bounds, "east")).toEqual({
      x: 500,
      y: 350,
    });
  });

  it("places the south handle at the bottom-center", () => {
    expect(getResizeHandlePoint(bounds, "south")).toEqual({
      x: 300,
      y: 500,
    });
  });

  it("places the south-east handle at the bottom-right corner", () => {
    expect(getResizeHandlePoint(bounds, "south-east")).toEqual({
      x: 500,
      y: 500,
    });
  });
});
