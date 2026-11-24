// Screen points of a window, in physical pixels, for the cursor a hidden run sets.
export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Point {
  x: number;
  y: number;
}

/** The screen point at a fraction of the window, e.g. (0.5, 0.6) for the video's middle. */
export function screenPoint(rect: Rect, fx: number, fy: number): Point {
  return {
    x: Math.round(rect.left + (rect.right - rect.left) * fx),
    y: Math.round(rect.top + (rect.bottom - rect.top) * fy),
  };
}

/** Off the window, above and left of it, as far as the real cursor is moved away. */
export function awayPoint(rect: Rect): Point {
  return { x: rect.left - 200, y: rect.top - 200 };
}
