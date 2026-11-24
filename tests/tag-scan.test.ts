import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { scanImports, scanSpec } from './tag-scan';

const IMPORT = `import { pointAt, pressKeys as press } from './real-input';\n`;
const scan = (body: string) => scanSpec('a.spec.ts', IMPORT + body);

test('a test that calls real input without @real is named with its file', () => {
  expect(scan(`test('moves the cursor', async () => { pointAt(1, 0, 0); });`)).toEqual([
    'a.spec.ts: test "moves the cursor" uses real input (pointAt) but has no @real tag',
  ]);
});

test('a tagged test that reaches real input passes, also under an alias', () => {
  expect(scan(`test('keys', { tag: '@real' }, async () => { press('a'); });`)).toEqual([]);
});

test('a tagged test that reaches no real input is named', () => {
  expect(scan(`test('plain', { tag: '@real' }, async () => { await 1; });`)).toEqual([
    'a.spec.ts: test "plain" is tagged @real but reaches no real input',
  ]);
});

test('a tag among others counts, another tag alone does not', () => {
  expect(scan(`test('a', { tag: ['@slow', '@real'] }, () => { pointAt(1, 0, 0); });`)).toEqual([]);
  expect(scan(`test('b', { tag: '@slow' }, () => { pointAt(1, 0, 0); });`)).toHaveLength(1);
});

test('a helper of the file carries real input to the tests that call it, across helpers', () => {
  const body = `
    function hover() { pointAt(1, 0, 0); }
    const deeper = async () => { hover(); };
    function unused() { pointAt(1, 0, 0); }
    test('direct', async () => { hover(); });
    test('deep', { tag: '@real' }, async () => { await deeper(); });
    test('none', async () => { await 1; });`;
  expect(scan(body)).toEqual([
    'a.spec.ts: test "direct" uses real input (pointAt) but has no @real tag',
  ]);
});

test('recursive helpers end the search', () => {
  expect(scan(`function a() { b(); } function b() { a(); } test('t', () => { a(); });`)).toEqual(
    [],
  );
});

test('tests made in a loop are checked once per declaration, named by their template', () => {
  const body = `for (const on of [true, false]) {
    test(\`with \${on ? 'on' : 'off'}\`, async () => { pointAt(1, 0, 0); });
  }`;
  expect(scan(body)).toEqual([
    "a.spec.ts: test \"with ${on ? 'on' : 'off'}\" uses real input (pointAt) but has no @real tag",
  ]);
});

test('test.only, test.skip and test.fixme are checked like tests', () => {
  const body = `
    test.only('o', async () => { pointAt(1, 0, 0); });
    test.skip('s', { tag: '@real' }, async () => { pointAt(1, 0, 0); });
    test.fixme('f', async () => { await 1; });`;
  expect(scan(body)).toEqual([
    'a.spec.ts: test "o" uses real input (pointAt) but has no @real tag',
  ]);
});

test('a hook that reaches real input is named, since a tag cannot cover it', () => {
  const body = `
    test.afterEach(async () => { pointAt(1, 0, 0); });
    test.beforeEach(async () => { await 1; });`;
  expect(scan(body)).toEqual(['a.spec.ts: hook "afterEach" uses real input (pointAt)']);
});

test('only names imported from ./real-input count, and a property of the same name does not', () => {
  const body = `
    import { pointAt as other } from './desktop';
    test('t', () => { other(1); app.pointAt(); app.press(); });`;
  expect(scan(body)).toEqual([]);
});

test('a namespace import counts through its properties', () => {
  const body = `import * as real from './real-input';
    test('t', () => { real.clickAt(1, 0, 0); });`;
  expect(scanSpec('a.spec.ts', body)).toEqual([
    'a.spec.ts: test "t" uses real input (real) but has no @real tag',
  ]);
});

test('only the app module and spec files import the real input module', () => {
  const imports = `import { pointAt } from './real-input';`;
  const files = [
    { name: 'tests/app.ts', source: imports },
    { name: 'tests/bar.spec.ts', source: imports },
    { name: 'tests/measure/budgets.spec.ts', source: `import { pointAt } from '../real-input';` },
    { name: 'tests/desktop.ts', source: imports },
    { name: 'tests/helper.test.ts', source: `export { pointAt } from './real-input';` },
    { name: 'tests/real-input.ts', source: `import { windowPosition } from './desktop';` },
  ];
  expect(scanImports(files)).toEqual([
    'tests/desktop.ts: imports real-input; only tests/app.ts and spec files may',
    'tests/helper.test.ts: imports real-input; only tests/app.ts and spec files may',
  ]);
});

const TESTS = import.meta.dirname;
// The app project's specs: every spec outside the adapter and measure folders.
const specs = readdirSync(TESTS, { recursive: true, encoding: 'utf8' })
  .map((name) => name.replaceAll(path.sep, '/'))
  .filter((name) => name.endsWith('.spec.ts') && !/^(adapters|measure)\//.test(name));

test('every spec of the app tests tags exactly the tests that reach real input', () => {
  const problems = specs.flatMap((name) =>
    scanSpec(`tests/${name}`, readFileSync(path.join(TESTS, name), 'utf8')),
  );
  expect(problems).toEqual([]);
});

test('real input is imported only where it may be', () => {
  const names = readdirSync(TESTS, { recursive: true, encoding: 'utf8' })
    .map((name) => name.replaceAll(path.sep, '/'))
    .filter((name) => name.endsWith('.ts') && !name.startsWith('adapters/'));
  const files = names.map((name) => ({
    name: `tests/${name}`,
    source: readFileSync(path.join(TESTS, name), 'utf8'),
  }));
  expect(scanImports(files)).toEqual([]);
});
