import { createServer, type AddressInfo, type Server } from 'node:net';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { startOnFreePort } from './debug-port';

let lastBrowser: Server;
let port: number;

beforeEach(async () => {
  lastBrowser = createServer();
  await new Promise<void>((resolve) => lastBrowser.listen(0, '127.0.0.1', resolve));
  port = (lastBrowser.address() as AddressInfo).port;
});

afterEach(() => {
  vi.useRealTimers();
  lastBrowser.close();
});

test('starts only once the last browser has let go of the port', async () => {
  const started = startOnFreePort(port, () => lastBrowser.listening);
  // One turn of the event loop, so the first probe meets the taken port.
  await new Promise((resolve) => setImmediate(resolve));
  lastBrowser.close();
  expect(await started).toBe(false);
});

test('never starts while another browser keeps the port', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  const start = vi.fn();
  const started = startOnFreePort(port, start);
  vi.setSystemTime(Date.now() + 60_000);
  await expect(started).rejects.toThrow(`debug port ${port} is still taken`);
  expect(start).not.toHaveBeenCalled();
});
