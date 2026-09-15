import { describe, expect, it } from "vitest";

import { resizeBoundsFromHandle } from "./resizeBounds";

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

  it("prevents the east edge from crossing the west edge", () => {
    expect(
      resizeBoundsFromHandle(initialBounds, "east", {
        x: 50,
        y: 350,
      }),
    ).toEqual({
      x: 100,
      y: 200,

      width: 1,
      height: 300,
    });
  });

  it("prevents the north-west handle from crossing the opposite corner", () => {
    expect(
      resizeBoundsFromHandle(initialBounds, "north-west", {
        x: 900,
        y: 900,
      }),
    ).toEqual({
      x: 499,
      y: 499,

      width: 1,
      height: 1,
    });
  });
});
