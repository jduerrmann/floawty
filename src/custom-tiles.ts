// Custom URL tiles: validation and the allowed domain derived from the URL.
export interface CustomTile {
  id: string;
  name: string;
  url: string;
}

export type TileProblem = 'nameEmpty' | 'nameTooLong' | 'urlInvalid' | 'urlDuplicate';

export type TileResult = { ok: true; tile: CustomTile } | { ok: false; problem: TileProblem };

export const MAX_NAME_LENGTH = 40;

function normalizeUrl(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = URL.parse(withScheme);
  if (!url || (url.protocol !== 'https:' && url.protocol !== 'http:')) return null;
  if (!url.hostname.includes('.')) return null;
  return url.href;
}

function nextId(existing: readonly CustomTile[]): string {
  const numbers = existing.map((tile) => Number(tile.id.replace('custom-', '')) || 0);
  return `custom-${Math.max(0, ...numbers) + 1}`;
}

export function createCustomTile(
  name: string,
  url: string,
  existing: readonly CustomTile[],
): TileResult {
  const trimmedName = name.trim();
  if (!trimmedName) return { ok: false, problem: 'nameEmpty' };
  if (trimmedName.length > MAX_NAME_LENGTH) return { ok: false, problem: 'nameTooLong' };
  const normalized = normalizeUrl(url);
  if (!normalized) return { ok: false, problem: 'urlInvalid' };
  if (existing.some((tile) => tile.url === normalized)) {
    return { ok: false, problem: 'urlDuplicate' };
  }
  return { ok: true, tile: { id: nextId(existing), name: trimmedName, url: normalized } };
}

export function customTileDomains(tile: CustomTile): string[] {
  return [new URL(tile.url).hostname.replace(/^www\./, '')];
}
