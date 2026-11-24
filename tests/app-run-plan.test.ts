import { expect, test } from 'vitest';
import { planRun, type Plan } from '../scripts/app-run-plan.mjs';

function planned(mode: string, extra: string[] = []) {
  const plan: Plan = planRun(mode, extra);
  if ('refused' in plan) throw new Error(`refused: ${plan.refused.join(' ')}`);
  return plan;
}

const refused = (mode: string, extra: string[]) => {
  const plan = planRun(mode, extra);
  return 'refused' in plan ? plan.refused : null;
};

test('smoke:hidden runs the app project without @real on a hidden desktop, with the filters', () => {
  const plan = planned('hidden', ['tests/bar.spec.ts', '--grep', 'grip']);
  expect(plan.hiddenDesktop).toBe(true);
  expect(plan.playwrightArgs).toEqual([
    'test',
    '--project=app',
    '--grep-invert',
    '@real',
    'tests/bar.spec.ts',
    '--grep',
    'grip',
  ]);
});

test('smoke:real runs only the @real tests, on the real desktop', () => {
  const plan = planned('real');
  expect(plan.hiddenDesktop).toBe(false);
  expect(plan.playwrightArgs).toEqual(['test', '--project=app', '--grep', '@real']);
});

test('smoke runs the whole app project on the real desktop', () => {
  const plan = planned('visible', ['tests/zoom.spec.ts']);
  expect(plan.hiddenDesktop).toBe(false);
  expect(plan.playwrightArgs).toEqual(['test', '--project=app', 'tests/zoom.spec.ts']);
});

test('measure runs the measure config on a hidden desktop with a longer time limit', () => {
  const plan = planned('measure');
  expect(plan.hiddenDesktop).toBe(true);
  expect(plan.playwrightArgs).toEqual(['test', '-c', 'tests/measure']);
  expect(plan.timeoutS).toBeGreaterThan(planned('hidden').timeoutS);
});

test('flags that open a window, change the reporter or the project are refused in every mode', () => {
  for (const mode of ['hidden', 'real', 'visible', 'measure']) {
    const flags = ['--ui', '--debug', '--headed', '--reporter=html', '--project=adapter'];
    expect(refused(mode, [...flags, 'x.spec.ts']), mode).toEqual(flags);
  }
});

test('a hidden run refuses --grep-invert but takes --grep', () => {
  expect(refused('hidden', ['--grep-invert', 'x'])).toEqual(['--grep-invert']);
  expect(refused('hidden', ['--grep', 'x'])).toBeNull();
});

test('a real run refuses both greps, because it brings its own', () => {
  expect(refused('real', ['--grep', 'x', '--grep-invert=y'])).toEqual([
    '--grep',
    '--grep-invert=y',
  ]);
});

test('another config is refused in every mode, long or short, so no run turns into a measurement', () => {
  for (const mode of ['hidden', 'real', 'visible', 'measure']) {
    expect(refused(mode, ['-c', 'tests/measure']), mode).toEqual(['-c']);
    expect(refused(mode, ['--config=tests/measure']), mode).toEqual(['--config=tests/measure']);
  }
});

test('every UI flag and attached short values are refused too', () => {
  expect(refused('hidden', ['--ui-port=0', '--ui-host', 'x'])).toEqual([
    '--ui-port=0',
    '--ui-host',
  ]);
  expect(refused('hidden', ['-cother.config.ts'])).toEqual(['-cother.config.ts']);
  expect(refused('real', ['-gx'])).toEqual(['-gx']);
  expect(refused('hidden', ['-j', '2', '-x'])).toBeNull();
});

test('short greps count like long ones', () => {
  expect(refused('real', ['-g', 'x'])).toEqual(['-g']);
  expect(refused('hidden', ['-gv', 'x'])).toEqual(['-gv']);
  expect(refused('hidden', ['-g', 'grip'])).toBeNull();
});

test('an unknown mode is refused by name', () => {
  expect(refused('fast', [])).toEqual(['fast']);
});
