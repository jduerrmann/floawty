import { describe, expect, it } from 'vitest';
import { tiltOf, tiltStyle, type Size } from './tilt';

const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** Where a corner lands: perspective(p) translateZ(back) rotateX(rx) rotateY(ry) round the centre. */
function project(corner: [number, number], tilt: ReturnType<typeof tiltOf>): [number, number] {
  const [x, y] = corner;
  const [rx, ry] = [radians(tilt.rotateX), radians(tilt.rotateY)];
  const turnedX = x * Math.cos(ry);
  const depthX = -x * Math.sin(ry);
  const turnedY = y * Math.cos(rx) - depthX * Math.sin(rx);
  const depth = y * Math.sin(rx) + depthX * Math.cos(rx) + tilt.back;
  const scale = tilt.perspective / (tilt.perspective - depth);
  return [turnedX * scale, turnedY * scale];
}

const SHAPES: Size[] = [
  { width: 70, height: 52 },
  { width: 109, height: 60 },
  { width: 430, height: 242 },
  { width: 851, height: 464 },
  { width: 400, height: 52 },
  { width: 80, height: 200 },
];
const FRACTIONS = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];

describe('tiltOf', () => {
  it('lies flat and in place under a pointer in the middle', () => {
    const tilt = tiltOf({ x: 0.5, y: 0.5 }, { width: 430, height: 242 });
    expect(tilt.rotateX).toBeCloseTo(0);
    expect(tilt.rotateY).toBeCloseTo(0);
    expect(tilt.back).toBeCloseTo(0);
  });

  it('turns the side under the pointer away, by at most 7 degrees', () => {
    const tilt = tiltOf({ x: 1, y: 0 }, { width: 430, height: 242 });
    expect(tilt.rotateY).toBeCloseTo(7);
    expect(tilt.rotateX).toBeCloseTo(7);
  });

  it('treats a pointer beyond the tile like one on its edge', () => {
    const size = { width: 430, height: 242 };
    expect(tiltOf({ x: 1.4, y: -2 }, size)).toEqual(tiltOf({ x: 1, y: 0 }, size));
  });

  it('keeps every corner inside the tile, and one on its edge', () => {
    for (const size of SHAPES) {
      for (const x of FRACTIONS) {
        for (const y of FRACTIONS) {
          const tilt = tiltOf({ x, y }, size);
          const reach = [-1, 1].flatMap((sx) =>
            [-1, 1].flatMap((sy) => {
              const [px, py] = project([(sx * size.width) / 2, (sy * size.height) / 2], tilt);
              return [Math.abs(px) / (size.width / 2), Math.abs(py) / (size.height / 2)];
            }),
          );
          const name = `${size.width}x${size.height} at ${x}/${y}`;
          expect(Math.max(...reach), name).toBeLessThanOrEqual(1 + 1e-9);
          // Not pushed back further than needed.
          if (tilt.back < 0) expect(Math.max(...reach), name).toBeCloseTo(1, 6);
        }
      }
    }
  });
});

describe('tiltStyle', () => {
  it('moves the light with the pointer and floats the logo a little after it', () => {
    const style = tiltStyle({ x: 0.75, y: 0 }, { width: 400, height: 200 });
    expect(style).toMatchObject({
      '--light-x': '75%',
      '--light-y': '0%',
      '--float-x': '1.5%',
      '--float-y': '-3%',
      '--perspective': '1000px',
      '--tile-width': '400px',
      '--tile-height': '200px',
    });
  });
});
