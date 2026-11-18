// The page side of floawty's bridge: one frozen `__floawty.sync`, only in the top frame.
import { hostAllowed } from './manifest';

export type Problem = 'controls-missing' | 'player-missing';

export interface Status {
  aspect: 'portrait' | 'landscape';
  problems: Problem[];
}

/** Starts the adapter on its own hosts; other hosts get a no-op so a page cannot catch the input. */
export function startBridge(
  hosts: readonly string[],
  start: () => (input: unknown) => Status,
): void {
  if (window.top !== window) return;
  const sync = hostAllowed(location.hostname, hosts) ? start() : () => null;
  Object.defineProperty(window, '__floawty', { value: Object.freeze({ sync }) });
}
