import { describe, expect, it } from "vitest";

import { getHistoryShortcut } from "./historyShortcut";

describe("history shortcuts", () => {
  it("maps Command + Z to undo", () => {
    expect(
      getHistoryShortcut({
        key: "z",

        metaKey: true,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
      }),
    ).toBe("undo");
  });

  it("maps Control + Z to undo", () => {
    expect(
      getHistoryShortcut({
        key: "z",

        metaKey: false,
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
      }),
    ).toBe("undo");
  });

  it("maps Command + Shift + Z to redo", () => {
    expect(
      getHistoryShortcut({
        key: "z",

        metaKey: true,
        ctrlKey: false,
        shiftKey: true,
        altKey: false,
      }),
    ).toBe("redo");
  });

  it("maps Control + Shift + Z to redo", () => {
    expect(
      getHistoryShortcut({
        key: "z",

        metaKey: false,
        ctrlKey: true,
        shiftKey: true,
        altKey: false,
      }),
    ).toBe("redo");
  });

  it("maps the primary modifier plus Y to redo", () => {
    expect(
      getHistoryShortcut({
        key: "y",

        metaKey: false,
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
      }),
    ).toBe("redo");
  });

  it("ignores Z without a primary modifier", () => {
    expect(
      getHistoryShortcut({
        key: "z",

        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
      }),
    ).toBeNull();
  });

  it("ignores Alt-modified shortcuts", () => {
    expect(
      getHistoryShortcut({
        key: "z",

        metaKey: false,
        ctrlKey: true,
        shiftKey: false,
        altKey: true,
      }),
    ).toBeNull();
  });

  it("ignores unrelated shortcuts", () => {
    expect(
      getHistoryShortcut({
        key: "a",

        metaKey: true,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
      }),
    ).toBeNull();
  });
});
