import { describe, expect, it } from 'vitest';
import { updateView } from './update-view';

describe('updateView', () => {
  it('shows nothing special before the first click', () => {
    expect(updateView({ kind: 'idle' })).toEqual({
      status: null,
      vars: {},
      showInstall: false,
      showReleasePage: false,
      checkDisabled: false,
    });
  });

  it('says it asks GitHub and blocks a second check while checking', () => {
    expect(updateView({ kind: 'checking' })).toEqual({
      status: 'updateChecking',
      vars: {},
      showInstall: false,
      showReleasePage: false,
      checkDisabled: true,
    });
  });

  it('says floawty is up to date', () => {
    expect(updateView({ kind: 'current' })).toEqual({
      status: 'updateCurrent',
      vars: {},
      showInstall: false,
      showReleasePage: false,
      checkDisabled: false,
    });
  });

  it('offers the install button for a found update in the installed build', () => {
    expect(updateView({ kind: 'available', version: '0.1.1', installed: true })).toEqual({
      status: 'updateAvailable',
      vars: { version: '0.1.1' },
      showInstall: true,
      showReleasePage: false,
      checkDisabled: false,
    });
  });

  it('offers the release page for a found update in the portable build', () => {
    expect(updateView({ kind: 'available', version: '0.1.1', installed: false })).toEqual({
      status: 'updateAvailable',
      vars: { version: '0.1.1' },
      showInstall: false,
      showReleasePage: true,
      checkDisabled: false,
    });
  });

  it('blocks both buttons and hides the install button while installing', () => {
    expect(updateView({ kind: 'installing' })).toEqual({
      status: 'updateInstalling',
      vars: {},
      showInstall: false,
      showReleasePage: false,
      checkDisabled: true,
    });
  });

  it.each([
    ['offline', 'updateOffline'],
    ['unavailable', 'updateUnavailable'],
    ['signature', 'updateSignature'],
    ['failed', 'updateFailed'],
  ] as const)('explains the problem code %s', (code, status) => {
    expect(updateView({ kind: 'problem', code })).toEqual({
      status,
      vars: {},
      showInstall: false,
      showReleasePage: false,
      checkDisabled: false,
    });
  });

  it('treats an unknown problem code as a failure', () => {
    expect(updateView({ kind: 'problem', code: 'busy' }).status).toBe('updateFailed');
  });
});
