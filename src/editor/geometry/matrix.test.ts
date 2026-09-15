import { describe, expect, it } from "vitest";

import {
  applyMatrixToPoint,
  createRotationMatrix,
  createTranslationMatrix,
  invertMatrix,
  multiplyMatrices,
  rotateVector,
} from "./matrix";

describe("matrix", () => {
  it("translates a point", () => {
    const result = applyMatrixToPoint(createTranslationMatrix(100, 50), {
      x: 20,
      y: 10,
    });

    expect(result).toEqual({
      x: 120,
      y: 60,
    });
  });

  it("rotates a point by 90 degrees", () => {
    const result = applyMatrixToPoint(createRotationMatrix(90), {
      x: 100,
      y: 0,
    });

    expect(result.x).toBeCloseTo(0);

    expect(result.y).toBeCloseTo(100);
  });

  it("combines transforms", () => {
    const matrix = multiplyMatrices(
      createTranslationMatrix(100, 50),
      createRotationMatrix(90),
    );

    const result = applyMatrixToPoint(matrix, {
      x: 100,
      y: 0,
    });

    expect(result.x).toBeCloseTo(100);

    expect(result.y).toBeCloseTo(150);
  });

  it("inverts a transform", () => {
    const matrix = multiplyMatrices(
      createTranslationMatrix(200, 100),
      createRotationMatrix(45),
    );

    const inverse = invertMatrix(matrix);

    expect(inverse).not.toBeNull();

    if (!inverse) {
      return;
    }

    const worldPoint = applyMatrixToPoint(matrix, {
      x: 50,
      y: 25,
    });

    const localPoint = applyMatrixToPoint(inverse, worldPoint);

    expect(localPoint.x).toBeCloseTo(50);

    expect(localPoint.y).toBeCloseTo(25);
  });

  it("rotates a vector without translation", () => {
    const result = rotateVector(
      {
        x: 100,
        y: 0,
      },
      90,
    );

    expect(result.x).toBeCloseTo(0);

    expect(result.y).toBeCloseTo(100);
  });
});
