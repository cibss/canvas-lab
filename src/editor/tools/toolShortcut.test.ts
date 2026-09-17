import { describe, expect, it } from "vitest";

import { getEditorToolFromShortcut } from "./toolShortcut";

describe("editor tool shortcuts", () => {
  it("maps V to the select tool", () => {
    expect(
      getEditorToolFromShortcut({
        key: "v",

        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
      }),
    ).toBe("select");
  });

  it("maps shape shortcuts", () => {
    expect(
      getEditorToolFromShortcut({
        key: "r",

        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
      }),
    ).toBe("rectangle");

    expect(
      getEditorToolFromShortcut({
        key: "o",

        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
      }),
    ).toBe("ellipse");

    expect(
      getEditorToolFromShortcut({
        key: "f",

        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
      }),
    ).toBe("frame");
  });

  it("maps T to the text tool", () => {
    expect(
      getEditorToolFromShortcut({
        key: "T",

        metaKey: false,
        ctrlKey: false,
        shiftKey: true,
        altKey: false,
      }),
    ).toBe("text");
  });

  it("ignores shortcuts using Command", () => {
    expect(
      getEditorToolFromShortcut({
        key: "r",

        metaKey: true,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
      }),
    ).toBeNull();
  });

  it("ignores shortcuts using Control", () => {
    expect(
      getEditorToolFromShortcut({
        key: "r",

        metaKey: false,
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
      }),
    ).toBeNull();
  });

  it("ignores shortcuts using Alt", () => {
    expect(
      getEditorToolFromShortcut({
        key: "r",

        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: true,
      }),
    ).toBeNull();
  });

  it("ignores unrelated keys", () => {
    expect(
      getEditorToolFromShortcut({
        key: "q",

        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
      }),
    ).toBeNull();
  });
});
