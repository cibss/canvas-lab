import { describe, expect, it } from "vitest";

import {
  DEFAULT_MIN_RESIZE_SIZE,
  resizeBoundsFromHandle,
} from "./resizeBounds";

const initialBounds = {
  x: 100,
  y: 200,

  width: 400,
  height: 300,
};

describe("resizeBoundsFromHandle", () => {
  it("resizes from the east handle while keeping the left edge fixed", () => {
    expect(
      resizeBoundsFromHandle(initialBounds, "east", {
        x: 650,
        y: 350,
      }),
    ).toEqual({
      x: 100,
      y: 200,

      width: 550,
      height: 300,
    });
  });

  it("resizes from the south handle while keeping the top edge fixed", () => {
    expect(
      resizeBoundsFromHandle(initialBounds, "south", {
        x: 300,
        y: 600,
      }),
    ).toEqual({
      x: 100,
      y: 200,

      width: 400,
      height: 400,
    });
  });

  it("resizes from the north-west handle while keeping the opposite corner fixed", () => {
    expect(
      resizeBoundsFromHandle(initialBounds, "north-west", {
        x: 50,
        y: 150,
      }),
    ).toEqual({
      x: 50,
      y: 150,

      width: 450,
      height: 350,
    });
  });

  it("resizes from the south-east handle", () => {
    expect(
      resizeBoundsFromHandle(initialBounds, "south-east", {
        x: 700,
        y: 650,
      }),
    ).toEqual({
      x: 100,
      y: 200,

      width: 600,
      height: 450,
    });
  });

  it("enforces the minimum width", () => {
    expect(
      resizeBoundsFromHandle(initialBounds, "east", {
        x: 50,
        y: 350,
      }),
    ).toEqual({
      x: 100,
      y: 200,

      width: DEFAULT_MIN_RESIZE_SIZE,

      height: 300,
    });
  });

  it("enforces minimum dimensions when resizing from north-west", () => {
    expect(
      resizeBoundsFromHandle(initialBounds, "north-west", {
        x: 900,
        y: 900,
      }),
    ).toEqual({
      x: 500 - DEFAULT_MIN_RESIZE_SIZE,

      y: 500 - DEFAULT_MIN_RESIZE_SIZE,

      width: DEFAULT_MIN_RESIZE_SIZE,

      height: DEFAULT_MIN_RESIZE_SIZE,
    });
  });

  it("preserves aspect ratio when resizing from a corner", () => {
    expect(
      resizeBoundsFromHandle(
        initialBounds,
        "south-east",
        {
          x: 700,
          y: 500,
        },
        {
          preserveAspectRatio: true,
        },
      ),
    ).toEqual({
      x: 100,
      y: 200,

      width: 600,
      height: 450,
    });
  });

  it("preserves aspect ratio when resizing from a side handle", () => {
    expect(
      resizeBoundsFromHandle(
        initialBounds,
        "east",
        {
          x: 700,
          y: 350,
        },
        {
          preserveAspectRatio: true,
        },
      ),
    ).toEqual({
      x: 100,
      y: 125,

      width: 600,
      height: 450,
    });
  });

  it("resizes horizontally from the center", () => {
    expect(
      resizeBoundsFromHandle(
        initialBounds,
        "east",
        {
          x: 550,
          y: 350,
        },
        {
          fromCenter: true,
        },
      ),
    ).toEqual({
      x: 50,
      y: 200,

      width: 500,
      height: 300,
    });
  });

  it("resizes from a corner while keeping the center fixed", () => {
    expect(
      resizeBoundsFromHandle(
        initialBounds,
        "south-east",
        {
          x: 600,
          y: 650,
        },
        {
          fromCenter: true,
        },
      ),
    ).toEqual({
      x: 0,
      y: 50,

      width: 600,
      height: 600,
    });
  });

  it("preserves aspect ratio while resizing from the center", () => {
    expect(
      resizeBoundsFromHandle(
        initialBounds,
        "south-east",
        {
          x: 600,
          y: 500,
        },
        {
          fromCenter: true,
          preserveAspectRatio: true,
        },
      ),
    ).toEqual({
      x: 0,
      y: 125,

      width: 600,
      height: 450,
    });
  });

  it("preserves aspect ratio while enforcing minimum dimensions", () => {
    const result = resizeBoundsFromHandle(
      initialBounds,
      "south-east",
      {
        x: 101,
        y: 201,
      },
      {
        preserveAspectRatio: true,
      },
    );

    expect(result).toEqual({
      x: 100,
      y: 200,

      width: 32,
      height: 24,
    });

    expect(result.width / result.height).toBeCloseTo(
      initialBounds.width / initialBounds.height,
    );
  });
});
