// The launcher's line protocol as the tests read it: the first line, replies in order, the counts.
export interface Counts {
  sendInput: number;
  shellExecute: number;
  /** Requests for Windows' move loop (a press on a drag region) that were swallowed. */
  drag: number;
}

/** The first line of `test-input floawty`: floawty's pid, or the cause it could not start. */
export function parsePidLine(line: string): number {
  if (line.startsWith('error ')) throw new Error(line.slice('error '.length));
  const pid = /^pid (\d+)$/.exec(line)?.[1];
  if (pid === undefined) throw new Error(`unexpected first line of the launcher: ${line}`);
  return Number(pid);
}

/** The second line of `test-input floawty --report-start`: the start time in ms, or the cause. */
export function parseStartedLine(line: string): number {
  if (line.startsWith('error ')) throw new Error(line.slice('error '.length));
  const ms = /^started (\d+)$/.exec(line)?.[1];
  if (ms === undefined) throw new Error(`unexpected start report of the launcher: ${line}`);
  return Number(ms);
}

/** The detail of an `ok` reply; an `error` reply throws its cause. */
export function parseReply(line: string): string {
  if (line === 'ok') return '';
  if (line.startsWith('ok ')) return line.slice('ok '.length);
  if (line.startsWith('error ')) throw new Error(line.slice('error '.length));
  throw new Error(`unexpected reply of the launcher: ${line}`);
}

export function parseCounts(detail: string): Counts {
  const match = /^send_input=(\d+) shell_execute=(\d+) drag=(\d+)$/.exec(detail);
  if (!match) throw new Error(`unexpected counts of the launcher: ${detail}`);
  return {
    sendInput: Number(match[1]),
    shellExecute: Number(match[2]),
    drag: Number(match[3]),
  };
}

/** The pids in the detail of a `children` reply. */
export function parseChildren(detail: string): number[] {
  if (!/^(\d+( \d+)*)?$/.test(detail)) {
    throw new Error(`unexpected children of the launcher: ${detail}`);
  }
  return detail === '' ? [] : detail.split(' ').map(Number);
}

/** Lines from the launcher, handed to whoever asks in the order they arrived. */
export class LineQueue {
  private lines: string[] = [];
  private waiting: { resolve: (line: string) => void; reject: (error: Error) => void }[] = [];
  private closed = false;

  push(line: string): void {
    const waiter = this.waiting.shift();
    if (waiter) waiter.resolve(line);
    else this.lines.push(line);
  }

  /** No more lines come: those still waiting, and every later ask, fail. */
  close(): void {
    this.closed = true;
    for (const waiter of this.waiting.splice(0)) waiter.reject(ENDED());
  }

  next(): Promise<string> {
    const line = this.lines.shift();
    if (line !== undefined) return Promise.resolve(line);
    if (this.closed) return Promise.reject(ENDED());
    return new Promise((resolve, reject) => this.waiting.push({ resolve, reject }));
  }
}

const ENDED = () => new Error('the launcher ended before it answered');

export type ForegroundName = 'main' | 'sign-in' | 'other' | 'none';
export type MouseButton = 'left' | 'right';

/** The cursor at a physical screen point, or none, as the hidden desktop has it. */
export function cursorCommand(point: { x: number; y: number } | null): string {
  return point ? `cursor ${Math.round(point.x)} ${Math.round(point.y)}` : 'cursor none';
}

export function buttonCommand(button: MouseButton, down: boolean): string {
  return `button ${button} ${down ? 'down' : 'up'}`;
}

export function foregroundCommand(name: ForegroundName): string {
  return `foreground ${name}`;
}
