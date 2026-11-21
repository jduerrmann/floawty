import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hostAllowed, manifestProblems, type ServiceManifest } from './manifest';
import { services } from './index';

const ASSETS = path.join(import.meta.dirname, '..', 'assets');

const valid: ServiceManifest = {
  id: 'example',
  name: 'Example',
  startUrl: 'https://www.example.com/',
  allowedDomains: ['example.com'],
  brandColor: '#123456',
  symbol: 'logos/example.svg',
};

describe('service manifests', () => {
  it('accepts a complete manifest', () => {
    expect(manifestProblems(valid)).toEqual([]);
  });

  it('rejects a start URL outside the allowed domains', () => {
    expect(manifestProblems({ ...valid, startUrl: 'https://other.org/' })).toContain(
      'startUrl is not on an allowed domain',
    );
  });

  it('needs an SVG file in logos/ or symbols/', () => {
    expect(manifestProblems({ ...valid, symbol: 'symbols/example.svg' })).toEqual([]);
    for (const symbol of [
      '',
      'example.svg',
      'icons/more.svg',
      '../logos/x.svg',
      'https://x.org/logo.svg',
    ]) {
      expect(manifestProblems({ ...valid, symbol }), symbol).toContain(
        'symbol must be an svg file in logos/ or symbols/',
      );
    }
  });

  it('sign-in hosts are bare lower-case host names', () => {
    expect(manifestProblems({ ...valid, signInHosts: ['accounts.google.com'] })).toEqual([]);
    for (const host of [
      'https://accounts.google.com',
      'accounts.google.com/o',
      '',
      'Accounts.Google.com',
      'localhost',
    ]) {
      expect(manifestProblems({ ...valid, signInHosts: [host] }), host).toContain(
        'signInHosts must be bare host names',
      );
    }
  });

  it('rejects plain http and missing fields', () => {
    const problems = manifestProblems({ ...valid, startUrl: 'http://example.com', name: ' ' });
    expect(problems).toContain('startUrl must use https');
    expect(problems).toContain('name is empty');
  });

  it('every shipped service is valid and unique', () => {
    expect(services.map((s) => s.id)).toEqual([
      'youtube',
      'youtube-shorts',
      'tiktok',
      'twitch',
      'netflix',
      'prime',
      'disney',
      'rtlplus',
      'crunchyroll',
      'appletv',
    ]);
    for (const service of services) {
      expect(manifestProblems(service), service.id).toEqual([]);
    }
    expect(services.filter((s) => s.shortsAutoMode).map((s) => s.id)).toEqual([
      'youtube',
      'youtube-shorts',
      'tiktok',
    ]);
    expect(services.filter((s) => s.videoOnly).map((s) => s.id)).toEqual([
      'youtube',
      'youtube-shorts',
      'tiktok',
      'twitch',
      'crunchyroll',
    ]);
    expect(services.filter((s) => s.startsShortsAuto).map((s) => s.id)).toEqual([
      'youtube-shorts',
      'tiktok',
    ]);
    // Only TikTok signs in through pop-ups (live 2026-11-20); all others need none.
    expect(services.filter((s) => s.signInHosts).map((s) => [s.id, s.signInHosts])).toEqual([
      ['tiktok', ['accounts.google.com', 'appleid.apple.com', 'www.facebook.com']],
    ]);
  });

  // Logos are shown as <img>, but plain shapes keep them free of scripts, rasters and fonts.
  it('every service has its logo or symbol, made of vector shapes only', () => {
    for (const service of services) {
      const file = path.join(ASSETS, service.symbol);
      expect(existsSync(file), service.symbol).toBe(true);
      expect(readFileSync(file, 'utf8'), service.symbol).not.toMatch(
        /<script|<image|<text|<foreignObject|<style|href="(?!#)/i,
      );
    }
  });
});

describe('hostAllowed', () => {
  it('allows the domain and its subdomains', () => {
    expect(hostAllowed('netflix.com', ['netflix.com'])).toBe(true);
    expect(hostAllowed('www.netflix.com', ['netflix.com'])).toBe(true);
  });

  it('rejects look-alike domains', () => {
    expect(hostAllowed('evilnetflix.com', ['netflix.com'])).toBe(false);
    expect(hostAllowed('netflix.com.evil.org', ['netflix.com'])).toBe(false);
  });
});
