import { expect, test } from 'vitest';

// Deliberately red: proves that CI fails on a failing unit test (rel-01). Never merged.
test('CI turns red on a failing unit test', () => {
  expect(1 + 1).toBe(3);
});
