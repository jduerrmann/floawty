import { expect, test } from 'vitest';
import { startFloawty } from './app';

test('floawty starts only inside a run that holds the run lock', async () => {
  await expect(startFloawty({ FLOAWTY_TEST_HIDDEN: '1' })).rejects.toThrow(
    'start app tests through npm run smoke:hidden, smoke:real, smoke or measure',
  );
  await expect(startFloawty({})).rejects.toThrow('npm run smoke:hidden');
});
