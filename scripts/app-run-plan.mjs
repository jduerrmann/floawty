// What `npm run smoke:hidden`, `smoke:real`, `smoke` and `measure` start, and which flags they refuse.
const HALF_HOUR_S = 1800;
const HOUR_S = 3600;
// These would open a window or a browser on the real desktop, or change what the mode runs.
const ALWAYS_REFUSED = ['ui', 'debug', 'headed', 'reporter', 'project', 'config'];
// Playwright's short spellings of the refused flags.
const SHORT = { c: 'config', g: 'grep', gv: 'grep-invert' };

const MODES = {
  hidden: {
    hiddenDesktop: true,
    timeoutS: HALF_HOUR_S,
    banner: 'hidden run: nothing appears on your screen',
    playwrightArgs: ['test', '--project=app', '--grep-invert', '@real'],
    refused: [...ALWAYS_REFUSED, 'grep-invert'],
  },
  real: {
    hiddenDesktop: false,
    timeoutS: HALF_HOUR_S,
    banner: "real run: floawty uses this PC's mouse, keyboard and screen; keep your hands off them",
    playwrightArgs: ['test', '--project=app', '--grep', '@real'],
    refused: [...ALWAYS_REFUSED, 'grep', 'grep-invert'],
  },
  visible: {
    hiddenDesktop: false,
    timeoutS: HALF_HOUR_S,
    banner:
      "visible run: floawty uses this PC's mouse, keyboard and screen; keep your hands off them",
    playwrightArgs: ['test', '--project=app'],
    refused: ALWAYS_REFUSED,
  },
  measure: {
    hiddenDesktop: true,
    timeoutS: HOUR_S,
    banner: 'hidden measurement: nothing appears on your screen',
    playwrightArgs: ['test', '-c', 'tests/measure'],
    refused: ALWAYS_REFUSED,
  },
};

// `--ui-host` and `--ui-port` open the UI mode as well; a short flag may carry its value (`-cx`).
const flagName = (arg) => {
  const long = /^--([\w-]+)/.exec(arg)?.[1];
  if (long !== undefined) return long.startsWith('ui') ? 'ui' : long;
  const short = /^-(\w+)/.exec(arg)?.[1] ?? '';
  const key = Object.keys(SHORT)
    .sort((a, b) => b.length - a.length)
    .find((name) => short.startsWith(name));
  return key === undefined ? undefined : SHORT[key];
};

/** The plan of a mode with the arguments the caller added, or the arguments it refuses. */
export function planRun(mode, extra) {
  const plan = Object.hasOwn(MODES, mode) ? MODES[mode] : undefined;
  if (!plan) return { refused: [mode] };
  const refused = extra.filter((arg) => plan.refused.includes(flagName(arg)));
  if (refused.length > 0) return { refused };
  const { hiddenDesktop, timeoutS, banner, playwrightArgs } = plan;
  return { hiddenDesktop, timeoutS, banner, playwrightArgs: [...playwrightArgs, ...extra] };
}
