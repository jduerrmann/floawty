// How a tile's face tilts towards the pointer without leaving the tile's box.

const MAX_DEGREES = 7;
const VIEW_DISTANCE = 2.5;
const FLOAT_PERCENT = 3;

/** The pointer within the tile, 0 to 1 from the top left. */
export interface Pointer {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Values for perspective(perspective) translateZ(back) rotateX(rotateX) rotateY(rotateY). */
export interface Tilt {
  rotateX: number;
  rotateY: number;
  back: number;
  perspective: number;
}

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

export function tiltOf(pointer: Pointer, { width, height }: Size): Tilt {
  const rotateX = (0.5 - clamp(pointer.y)) * 2 * MAX_DEGREES;
  const rotateY = (clamp(pointer.x) - 0.5) * 2 * MAX_DEGREES;
  const perspective = width * VIEW_DISTANCE;
  return {
    rotateX,
    rotateY,
    perspective,
    back: backOff(rotateX, rotateY, perspective, width, height),
  };
}

/** The same as custom properties for tiles.css, with the light and the floating logo. */
export function tiltStyle(pointer: Pointer, size: Size): Record<string, string> {
  const { rotateX, rotateY, back, perspective } = tiltOf(pointer, size);
  const [x, y] = [clamp(pointer.x), clamp(pointer.y)];
  return {
    '--light-x': `${x * 100}%`,
    '--light-y': `${y * 100}%`,
    '--float-x': `${(x - 0.5) * 2 * FLOAT_PERCENT}%`,
    '--float-y': `${(y - 0.5) * 2 * FLOAT_PERCENT}%`,
    '--rotate-x': `${rotateX}deg`,
    '--rotate-y': `${rotateY}deg`,
    '--back': `${back}px`,
    '--perspective': `${perspective}px`,
    '--tile-width': `${size.width}px`,
    '--tile-height': `${size.height}px`,
  };
}

// A corner that comes nearer looks bigger, so each one limits how near the whole face may be.
function backOff(
  degreesX: number,
  degreesY: number,
  perspective: number,
  width: number,
  height: number,
): number {
  const [ax, ay] = [(degreesX * Math.PI) / 180, (degreesY * Math.PI) / 180];
  let back = 0;
  for (const x of [-width / 2, width / 2]) {
    for (const y of [-height / 2, height / 2]) {
      const turnedX = x * Math.cos(ay);
      const turnedY = y * Math.cos(ax) + x * Math.sin(ay) * Math.sin(ax);
      const depth = y * Math.sin(ax) - x * Math.sin(ay) * Math.cos(ax);
      const reach = Math.max(Math.abs(turnedX / x), Math.abs(turnedY / y));
      back = Math.min(back, perspective * (1 - reach) - depth);
    }
  }
  return back;
}
