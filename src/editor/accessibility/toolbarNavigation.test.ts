import { describe, expect, it } from "vitest";

import {
  getToolbarFocusIndex,
  isToolbarNavigationKey,
} from "./toolbarNavigation";

describe("toolbar navigation", () => {
  it("recognizes toolbar navigation keys", () => {
    expect(isToolbarNavigationKey("ArrowUp")).toBe(true);

    expect(isToolbarNavigationKey("ArrowDown")).toBe(true);

    expect(isToolbarNavigationKey("Home")).toBe(true);

    expect(isToolbarNavigationKey("End")).toBe(true);

    expect(isToolbarNavigationKey("Enter")).toBe(false);
  });

  it("moves to the next toolbar item", () => {
    expect(getToolbarFocusIndex(0, "ArrowDown", 5)).toBe(1);
  });

  it("wraps when moving past the last toolbar item", () => {
    expect(getToolbarFocusIndex(4, "ArrowDown", 5)).toBe(0);
  });

  it("moves to the previous toolbar item", () => {
    expect(getToolbarFocusIndex(3, "ArrowUp", 5)).toBe(2);
  });

  it("wraps when moving before the first toolbar item", () => {
    expect(getToolbarFocusIndex(0, "ArrowUp", 5)).toBe(4);
  });

  it("supports Home and End", () => {
    expect(getToolbarFocusIndex(3, "Home", 5)).toBe(0);

    expect(getToolbarFocusIndex(1, "End", 5)).toBe(4);
  });

  it("returns -1 for an empty toolbar", () => {
    expect(getToolbarFocusIndex(0, "ArrowDown", 0)).toBe(-1);
  });
});
