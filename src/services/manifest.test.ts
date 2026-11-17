import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hostAllowed, manifestProblems, type ServiceManifest } from './manifest';
import { services } from './index';

const SYMBOLS = path.join(import.meta.dirname, '..', 'assets', 'symbols');

const valid: ServiceManifest = {
  id: 'example',
  name: 'Example',
  startUrl: 'https://www.example.com/',
  allowedDomains: ['example.com'],
  brandColor: '#123456',
  symbol: 'example.svg',
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

  it('needs one of the own SVG symbols', () => {
    expect(manifestProblems({ ...valid, symbol: '' })).toContain('symbol must be an svg file name');
    expect(manifestProblems({ ...valid, symbol: 'https://x.org/logo.svg' })).toContain(
      'symbol must be an svg file name',
    );
  });

  it('rejects plain http and missing fields', () => {
    const problems = manifestProblems({ ...valid, startUrl: 'http://example.com', name: ' ' });
    expect(problems).toContain('startUrl must use https');
    expect(problems).toContain('name is empty');
  });

  it('every shipped service is valid and unique', () => {
    expect(services.map((s) => s.id)).toEqual([
      'youtube',
      'twitch',
      'netflix',
      'prime',
      'disney',
      'rtlplus',
    ]);
    for (const service of services) {
      expect(manifestProblems(service), service.id).toEqual([]);
      expect(existsSync(path.join(SYMBOLS, service.symbol)), service.symbol).toBe(true);
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
