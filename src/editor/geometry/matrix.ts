import type { Point } from "@/editor/camera/types";

export interface Matrix2D {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export const IDENTITY_MATRIX: Matrix2D = {
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
};

export function createTranslationMatrix(x: number, y: number): Matrix2D {
  return {
    a: 1,
    b: 0,
    c: 0,
    d: 1,
    e: x,
    f: y,
  };
}

export function createRotationMatrix(degrees: number): Matrix2D {
  const radians = degrees * (Math.PI / 180);

  const cosine = Math.cos(radians);

  const sine = Math.sin(radians);

  return {
    a: cosine,
    b: sine,
    c: -sine,
    d: cosine,
    e: 0,
    f: 0,
  };
}

export function multiplyMatrices(left: Matrix2D, right: Matrix2D): Matrix2D {
  return {
    a: left.a * right.a + left.c * right.b,

    b: left.b * right.a + left.d * right.b,

    c: left.a * right.c + left.c * right.d,

    d: left.b * right.c + left.d * right.d,

    e: left.a * right.e + left.c * right.f + left.e,

    f: left.b * right.e + left.d * right.f + left.f,
  };
}

export function applyMatrixToPoint(matrix: Matrix2D, point: Point): Point {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,

    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}

export function invertMatrix(matrix: Matrix2D): Matrix2D | null {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;

  if (Math.abs(determinant) < Number.EPSILON) {
    return null;
  }

  return {
    a: matrix.d / determinant,

    b: -matrix.b / determinant,

    c: -matrix.c / determinant,

    d: matrix.a / determinant,

    e: (matrix.c * matrix.f - matrix.d * matrix.e) / determinant,

    f: (matrix.b * matrix.e - matrix.a * matrix.f) / determinant,
  };
}

export function rotateVector(vector: Point, degrees: number): Point {
  const radians = degrees * (Math.PI / 180);

  const cosine = Math.cos(radians);

  const sine = Math.sin(radians);

  return {
    x: vector.x * cosine - vector.y * sine,

    y: vector.x * sine + vector.y * cosine,
  };
}

export function getMatrixRotationDegrees(matrix: Matrix2D): number {
  return Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
}
