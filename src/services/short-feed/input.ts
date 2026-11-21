// floawty's input to a feed page, read as untrusted data: anything malformed is ignored.
import type { ShortsConfig } from './shorts';

export interface FeedInput {
  shorts: ShortsConfig;
  hover: boolean;
  active: boolean;
  videoOnly: boolean;
}

export function readInput(value: unknown): FeedInput | null {
  if (typeof value !== 'object' || value === null) return null;
  const { shorts, hover, active, videoOnly } = value as Record<string, unknown>;
  if (typeof hover !== 'boolean' || typeof active !== 'boolean') return null;
  if (typeof videoOnly !== 'boolean') return null;
  if (typeof shorts !== 'object' || shorts === null) return null;
  const { auto, pauseSeconds, holdOnHover } = shorts as Record<string, unknown>;
  const valid =
    typeof auto === 'boolean' &&
    typeof holdOnHover === 'boolean' &&
    typeof pauseSeconds === 'number' &&
    Number.isFinite(pauseSeconds) &&
    pauseSeconds >= 0;
  return valid ? { shorts: { auto, pauseSeconds, holdOnHover }, hover, active, videoOnly } : null;
}
