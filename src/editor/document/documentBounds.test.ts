import { describe, expect, it } from "vitest";

import { sampleDocument } from "./sampleDocument";
import { getDocumentBounds } from "./documentBounds";

describe("getDocumentBounds", () => {
  it("returns the bounds of the sample document", () => {
    expect(getDocumentBounds(sampleDocument)).toEqual({
      x: 120,
      y: 80,
      width: 1200,
      height: 720,
    });
  });
});
