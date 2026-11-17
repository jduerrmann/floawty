import { describe, expect, it } from 'vitest';
import { createCustomTile, customTileDomains, MAX_NAME_LENGTH } from './custom-tiles';

describe('createCustomTile', () => {
  it('creates a tile and adds https when the scheme is missing', () => {
    const result = createCustomTile(' My stream ', 'example.com/live', []);
    expect(result).toMatchObject({
      ok: true,
      tile: { name: 'My stream', url: 'https://example.com/live' },
    });
  });

  it('rejects an empty or too long name', () => {
    expect(createCustomTile('  ', 'https://example.com', [])).toEqual({
      ok: false,
      problem: 'nameEmpty',
    });
    const long = 'x'.repeat(MAX_NAME_LENGTH + 1);
    expect(createCustomTile(long, 'https://example.com', [])).toEqual({
      ok: false,
      problem: 'nameTooLong',
    });
  });

  it('rejects URLs that are not web pages', () => {
    for (const url of ['', 'not a url', 'file:///C:/x.html', 'javascript:alert(1)']) {
      expect(createCustomTile('Name', url, []), url).toEqual({ ok: false, problem: 'urlInvalid' });
    }
  });

  it('rejects the same URL twice', () => {
    const first = createCustomTile('A', 'https://example.com/', []);
    if (!first.ok) throw new Error('first tile must be valid');
    expect(createCustomTile('B', 'example.com/', [first.tile])).toEqual({
      ok: false,
      problem: 'urlDuplicate',
    });
  });

  it('gives every tile its own id', () => {
    const first = createCustomTile('A', 'https://a.example/', []);
    const second = createCustomTile('B', 'https://b.example/', first.ok ? [first.tile] : []);
    expect(first.ok && second.ok && first.tile.id !== second.tile.id).toBe(true);
  });
});

describe('customTileDomains', () => {
  it('allows the site without www and its subdomains', () => {
    const tile = { id: 'custom-1', name: 'A', url: 'https://www.example.com/live' };
    expect(customTileDomains(tile)).toEqual(['example.com']);
  });
});
