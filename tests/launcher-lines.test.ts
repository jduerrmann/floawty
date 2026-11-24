import { expect, test } from 'vitest';
import {
  buttonCommand,
  cursorCommand,
  foregroundCommand,
  LineQueue,
  parseChildren,
  parseCounts,
  parsePidLine,
  parseReply,
  parseStartedLine,
} from './launcher-lines';

test('the first line names floawty by its pid', () => {
  expect(parsePidLine('pid 4242')).toBe(4242);
});

test('a first line with an error fails with the launcher’s cause', () => {
  expect(() => parsePidLine('error the shim DLL is missing: C:/x/shim.dll')).toThrow(
    'the shim DLL is missing: C:/x/shim.dll',
  );
});

test('any other first line is refused and shown', () => {
  expect(() => parsePidLine('hello')).toThrow('hello');
  expect(() => parsePidLine('pid abc')).toThrow('pid abc');
});

test('an ok reply gives its detail, an error reply throws its cause', () => {
  expect(parseReply('ok')).toBe('');
  expect(parseReply('ok 11 22')).toBe('11 22');
  expect(() => parseReply('error not registered: Ctrl+Alt+Shift+T')).toThrow(
    'not registered: Ctrl+Alt+Shift+T',
  );
  expect(() => parseReply('floawty says hi')).toThrow('floawty says hi');
});

test('counts are read from their reply', () => {
  expect(parseCounts('send_input=1 shell_execute=2 drag=3')).toEqual({
    sendInput: 1,
    shellExecute: 2,
    drag: 3,
  });
  expect(() => parseCounts('send_input=1 shell_execute=2')).toThrow('send_input=1');
});

test('lines are handed out in the order they came, before or after they are asked for', async () => {
  const queue = new LineQueue();
  queue.push('first');
  expect(await queue.next()).toBe('first');
  const second = queue.next();
  const third = queue.next();
  queue.push('second');
  queue.push('third');
  expect(await second).toBe('second');
  expect(await third).toBe('third');
});

test('a queue that ended fails those still waiting and every later ask, after the lines it holds', async () => {
  const queue = new LineQueue();
  queue.push('last');
  const waiting = [queue.next(), queue.next()];
  queue.close();
  expect(await waiting[0]).toBe('last');
  await expect(waiting[1]).rejects.toThrow('launcher');
  await expect(queue.next()).rejects.toThrow('launcher');
});

test('the children reply lists the pids of restarted floawtys, or none', () => {
  expect(parseChildren('')).toEqual([]);
  expect(parseChildren('11 22')).toEqual([11, 22]);
  expect(() => parseChildren('11 x')).toThrow('11 x');
});

test('the cursor, button and foreground commands are the lines the launcher parses', () => {
  expect(cursorCommand({ x: 100, y: -5 })).toBe('cursor 100 -5');
  expect(cursorCommand({ x: 10.6, y: 3.2 })).toBe('cursor 11 3');
  expect(cursorCommand(null)).toBe('cursor none');
  expect(buttonCommand('left', true)).toBe('button left down');
  expect(buttonCommand('right', false)).toBe('button right up');
  expect(foregroundCommand('sign-in')).toBe('foreground sign-in');
});

test('the started line gives the milliseconds from resume to window', () => {
  expect(parseStartedLine('started 183')).toBe(183);
});

test('a started line with an error fails with the cause, any other line is shown', () => {
  expect(() => parseStartedLine('error floawty exited before it showed a window')).toThrow(
    'floawty exited before it showed a window',
  );
  expect(() => parseStartedLine('started soon')).toThrow('started soon');
});
