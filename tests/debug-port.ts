// Starts floawty for a test on the debug port that all app runs share.
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

const RELEASE_TIMEOUT_MS = 5000;
const POLL_MS = 25;

// Binding, not connecting: the old browser stops answering before it frees the port.
function isFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer().once('error', () => resolve(false));
    probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
  });
}

// WebView2's browser outlives floawty.exe and would answer in place of the new app's browser.
export async function startOnFreePort<T>(port: number, start: () => T): Promise<T> {
  const deadline = Date.now() + RELEASE_TIMEOUT_MS;
  while (!(await isFree(port))) {
    if (Date.now() > deadline) {
      throw new Error(`debug port ${port} is still taken: is another floawty or test run open?`);
    }
    await delay(POLL_MS);
  }
  return start();
}
