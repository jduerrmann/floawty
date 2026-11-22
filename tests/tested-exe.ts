// The build the app tests start.
import path from 'node:path';

const RELEASE = path.join(
  import.meta.dirname,
  '..',
  'src-tauri',
  'target',
  'release',
  'floawty.exe',
);

export function testedExe(env: NodeJS.ProcessEnv): string {
  return env.FLOAWTY_TEST_EXE ?? RELEASE;
}

export const EXE = testedExe(process.env);

if (process.env.FLOAWTY_TEST_EXE) console.log(`testing another build: ${EXE}`);
