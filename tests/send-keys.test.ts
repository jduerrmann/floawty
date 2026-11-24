import { expect, test } from 'vitest';
import { sendKeysFor } from './send-keys';

test('floawty’s default hotkeys become the keys the tests used to press', () => {
  expect(sendKeysFor('Ctrl+Alt+Shift+T')).toBe('^%+t');
  expect(sendKeysFor('Ctrl+Alt+Shift+O')).toBe('^%+o');
  expect(sendKeysFor('Ctrl+Alt+Shift+F')).toBe('^%+f');
});

test('named keys use their braces, a space stays a space', () => {
  expect(sendKeysFor('Ctrl+Alt+Shift+Space')).toBe('^%+ ');
  expect(sendKeysFor('Ctrl+Alt+Shift+Up')).toBe('^%+{UP}');
  expect(sendKeysFor('Ctrl+Alt+Left')).toBe('^%{LEFT}');
  expect(sendKeysFor('Ctrl+F5')).toBe('^{F5}');
});

test('names are read in any case, and the modifier order does not matter', () => {
  expect(sendKeysFor('shift+control+ALT+d')).toBe('^%+d');
  expect(sendKeysFor('Ctrl+Alt+Shift+7')).toBe('^%+7');
});

test('a key SendKeys cannot press is refused with its name', () => {
  expect(() => sendKeysFor('Super+T')).toThrow('Super');
  expect(() => sendKeysFor('Ctrl+Alt+Nope')).toThrow('Nope');
  expect(() => sendKeysFor('Ctrl+F20')).toThrow('F20');
  expect(() => sendKeysFor('Ctrl+Alt')).toThrow('Alt');
});
