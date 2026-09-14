import { describe, expect, it } from "vitest";

import {
  clampZoom,
  createCamera,
  fitCameraToBounds,
  MAX_ZOOM,
  MIN_ZOOM,
  panCamera,
  screenToWorld,
  worldToScreen,
  zoomCameraAtPoint,
} from "./camera";

describe("camera", () => {
  it("creates a camera at the default position", () => {
    expect(createCamera()).toEqual({
      offsetX: 0,
      offsetY: 0,
      zoom: 1,
    });
  });

  it("pans the camera by the provided screen delta", () => {
    const camera = {
      offsetX: 100,
      offsetY: 50,
      zoom: 1,
    };

    const result = panCamera(camera, 40, -20);

    expect(result).toEqual({
      offsetX: 140,
      offsetY: 30,
      zoom: 1,
    });
  });

  it("does not mutate the original camera when panning", () => {
    const camera = {
      offsetX: 100,
      offsetY: 50,
      zoom: 2,
    };

    panCamera(camera, 40, 20);

    expect(camera).toEqual({
      offsetX: 100,
      offsetY: 50,
      zoom: 2,
    });
  });

  it("zooms around a screen point", () => {
    const camera = {
      offsetX: 100,
      offsetY: 50,
      zoom: 1,
    };

    const screenPoint = {
      x: 500,
      y: 350,
    };

    const worldPointBeforeZoom = screenToWorld(screenPoint, camera);

    const nextCamera = zoomCameraAtPoint(camera, screenPoint, 2);

    const screenPointAfterZoom = worldToScreen(
      worldPointBeforeZoom,
      nextCamera,
    );

    expect(nextCamera.zoom).toBe(2);

    expect(screenPointAfterZoom.x).toBeCloseTo(screenPoint.x);

    expect(screenPointAfterZoom.y).toBeCloseTo(screenPoint.y);
  });

  it("preserves the pointer anchor after panning and zooming", () => {
    const initialCamera = createCamera();

    const pannedCamera = panCamera(initialCamera, -240, 160);

    const pointerPosition = {
      x: 620,
      y: 410,
    };

    const worldPointBeforeZoom = screenToWorld(pointerPosition, pannedCamera);

    const zoomedCamera = zoomCameraAtPoint(pannedCamera, pointerPosition, 2.25);

    const screenPointAfterZoom = worldToScreen(
      worldPointBeforeZoom,
      zoomedCamera,
    );

    expect(screenPointAfterZoom.x).toBeCloseTo(pointerPosition.x);

    expect(screenPointAfterZoom.y).toBeCloseTo(pointerPosition.y);
  });

  it("clamps zoom when zooming around a point", () => {
    const camera = createCamera();

    const screenPoint = {
      x: 400,
      y: 300,
    };

    const zoomedOutCamera = zoomCameraAtPoint(camera, screenPoint, 0);

    const zoomedInCamera = zoomCameraAtPoint(camera, screenPoint, 100);

    expect(zoomedOutCamera.zoom).toBe(MIN_ZOOM);

    expect(zoomedInCamera.zoom).toBe(MAX_ZOOM);
  });

  it("does not mutate the original camera when zooming", () => {
    const camera = {
      offsetX: 120,
      offsetY: -40,
      zoom: 1.5,
    };

    zoomCameraAtPoint(
      camera,
      {
        x: 300,
        y: 200,
      },
      2,
    );

    expect(camera).toEqual({
      offsetX: 120,
      offsetY: -40,
      zoom: 1.5,
    });
  });

  it("fits content inside the viewport", () => {
    const camera = fitCameraToBounds(
      {
        x: 100,
        y: 100,
        width: 1200,
        height: 720,
      },
      {
        width: 1000,
        height: 700,
      },
      50,
    );

    const topLeft = worldToScreen(
      {
        x: 100,
        y: 100,
      },
      camera,
    );

    const bottomRight = worldToScreen(
      {
        x: 1300,
        y: 820,
      },
      camera,
    );

    expect(topLeft.x).toBeGreaterThanOrEqual(50);

    expect(topLeft.y).toBeGreaterThanOrEqual(50);

    expect(bottomRight.x).toBeLessThanOrEqual(950);

    expect(bottomRight.y).toBeLessThanOrEqual(650);
  });

  it("centers fitted content in the viewport", () => {
    const camera = fitCameraToBounds(
      {
        x: 100,
        y: 50,
        width: 800,
        height: 400,
      },
      {
        width: 1200,
        height: 800,
      },
    );

    const contentCenter = worldToScreen(
      {
        x: 500,
        y: 250,
      },
      camera,
    );

    expect(contentCenter.x).toBeCloseTo(600);

    expect(contentCenter.y).toBeCloseTo(400);
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
