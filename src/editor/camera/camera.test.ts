import { describe, expect, it } from "vitest";

import {
  clampZoom,
  createCamera,
  MAX_ZOOM,
  MIN_ZOOM,
  screenToWorld,
  worldToScreen,
} from "./camera";

describe("camera", () => {
  it("creates a camera at the default position", () => {
    expect(createCamera()).toEqual({
      offsetX: 0,
      offsetY: 0,
      zoom: 1,
    });
  });

  it("converts world coordinates to screen coordinates", () => {
    const camera = {
      offsetX: -200,
      offsetY: 50,
      zoom: 2,
    };

    const result = worldToScreen(
      {
        x: 500,
        y: 300,
      },
      camera,
    );

    expect(result).toEqual({
      x: 800,
      y: 650,
    });
  });

  it("converts screen coordinates back to world coordinates", () => {
    const camera = {
      offsetX: -200,
      offsetY: 50,
      zoom: 2,
    };

    const result = screenToWorld(
      {
        x: 800,
        y: 650,
      },
      camera,
    );

    expect(result).toEqual({
      x: 500,
      y: 300,
    });
  });

  it("keeps coordinate conversion reversible", () => {
    const camera = {
      offsetX: 120,
      offsetY: -80,
      zoom: 1.75,
    };

    const worldPoint = {
      x: 420,
      y: 240,
    };

    const screenPoint = worldToScreen(worldPoint, camera);

    const convertedBack = screenToWorld(screenPoint, camera);

    expect(convertedBack.x).toBeCloseTo(worldPoint.x);

    expect(convertedBack.y).toBeCloseTo(worldPoint.y);
  });

  it("clamps zoom to the supported range", () => {
    expect(clampZoom(0)).toBe(MIN_ZOOM);
    expect(clampZoom(0.5)).toBe(0.5);
    expect(clampZoom(10)).toBe(MAX_ZOOM);
  });
});
