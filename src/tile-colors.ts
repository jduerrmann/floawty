// Tile colours: the shade under a tile's name must keep white text readable (WCAG AA).

export const CUSTOM_COLOR = '#37474f';

const AA = 4.5;

function channels(color: string): number[] {
  return [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16));
}

function luminance([r = 0, g = 0, b = 0]: number[]): number {
  const linear = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function hex(values: number[]): string {
  return `#${values.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

/** Contrast ratio of white text on a #rrggbb colour. */
export function contrastWithWhite(color: string): number {
  return 1.05 / (luminance(channels(color)) + 0.05);
}

/** The colour itself if white text on it reaches AA, else the lightest darker shade of it that does. */
export function labelShade(color: string): string {
  if (contrastWithWhite(color) >= AA) return color.toLowerCase();
  const base = channels(color);
  const scaled = (factor: number) => base.map((value) => Math.floor(value * factor));
  let low = 0;
  let high = 1;
  for (let step = 0; step < 24; step++) {
    const middle = (low + high) / 2;
    if (contrastWithWhite(hex(scaled(middle))) >= AA) low = middle;
    else high = middle;
  }
  return hex(scaled(low));
}
