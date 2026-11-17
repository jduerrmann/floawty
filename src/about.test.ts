import { describe, expect, it } from 'vitest';
import { aboutText } from './about';

describe('aboutText', () => {
  it('names the app and the WebView2 version', () => {
    expect(aboutText({ appVersion: '0.1.0', webviewVersion: '157.0.4341.46' })).toBe(
      'floawty 0.1.0 · WebView2 157.0.4341.46',
    );
  });

  it('says so when the WebView2 version is unknown', () => {
    expect(aboutText({ appVersion: '0.1.0', webviewVersion: null })).toBe(
      'floawty 0.1.0 · WebView2 unknown',
    );
  });
});
