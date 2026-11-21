import { describe, expect, it } from 'vitest';
import { contrastWithWhite, CUSTOM_COLOR, labelShade } from './tile-colors';
import { services } from './services';

const AA = 4.5;

describe('contrastWithWhite', () => {
  it('is 21 for black and 1 for white', () => {
    expect(contrastWithWhite('#000000')).toBeCloseTo(21, 5);
    expect(contrastWithWhite('#ffffff')).toBeCloseTo(1, 5);
  });
});

describe('labelShade', () => {
  it('keeps a colour that already reaches AA against white', () => {
    expect(labelShade('#0e2a73')).toBe('#0e2a73');
    expect(labelShade('#000000')).toBe('#000000');
  });

  it('darkens white until white text reaches AA', () => {
    expect(contrastWithWhite(labelShade('#ffffff'))).toBeGreaterThanOrEqual(AA);
  });

  it.each(['#ffffff', '#25f4ee', '#f47521'])('darkens %s no further than AA needs', (color) => {
    expect(contrastWithWhite(labelShade(color))).toBeLessThan(4.6);
  });

  it.each(services.map((service) => [service.name, service.brandColor]))(
    'gives %s a label background with AA contrast',
    (_, color) => {
      expect(contrastWithWhite(labelShade(color))).toBeGreaterThanOrEqual(AA);
    },
  );

  it('gives own pages AA contrast', () => {
    expect(contrastWithWhite(labelShade(CUSTOM_COLOR))).toBeGreaterThanOrEqual(AA);
  });

  it('keeps the hue: only darkens, channel by channel in the same ratio', () => {
    expect(labelShade('#f47521')).toMatch(/^#[0-9a-f]{6}$/);
    const shade = labelShade('#f47521');
    const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => parseInt(shade.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
  });
});
