export type ToolbarNavigationKey = "ArrowUp" | "ArrowDown" | "Home" | "End";

export function isToolbarNavigationKey(
  key: string,
): key is ToolbarNavigationKey {
  return (
    key === "ArrowUp" || key === "ArrowDown" || key === "Home" || key === "End"
  );
}

export function getToolbarFocusIndex(
  currentIndex: number,
  key: ToolbarNavigationKey,
  itemCount: number,
): number {
  if (itemCount <= 0) {
    return -1;
  }

  const normalizedIndex =
    currentIndex >= 0 && currentIndex < itemCount ? currentIndex : 0;

  switch (key) {
    case "ArrowDown":
      return (normalizedIndex + 1) % itemCount;

    case "ArrowUp":
      return (normalizedIndex - 1 + itemCount) % itemCount;

    case "Home":
      return 0;

    case "End":
      return itemCount - 1;
  }
}
