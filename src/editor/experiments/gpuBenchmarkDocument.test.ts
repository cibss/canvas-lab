import { describe, expect, it } from "vitest";

import { createGpuBenchmarkDocument } from "./gpuBenchmarkDocument";

describe("GPU benchmark document", () => {
  it("creates the requested rectangle count", () => {
    const document = createGpuBenchmarkDocument({
      columns: 80,

      rows: 50,
    });

    expect(document.rootNodeIds).toHaveLength(4000);

    expect(Object.keys(document.nodes)).toHaveLength(4000);
  });

  it("uses plain root rectangles for a comparable renderer workload", () => {
    const document = createGpuBenchmarkDocument({
      columns: 2,

      rows: 2,
    });

    for (const node of Object.values(document.nodes)) {
      expect(node.type).toBe("rectangle");

      expect(node.parentId).toBeNull();

      if (node.type !== "rectangle") {
        continue;
      }

      expect(node.cornerRadius).toBe(0);

      expect(node.fill).not.toBeNull();
    }
  });
});
