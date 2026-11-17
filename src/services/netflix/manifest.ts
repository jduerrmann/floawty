import type { ServiceManifest } from '../manifest';

export const netflix: ServiceManifest = {
  id: 'netflix',
  name: 'Netflix',
  startUrl: 'https://www.netflix.com/browse',
  allowedDomains: ['netflix.com'],
  brandColor: '#e50914',
  symbol: 'netflix.svg',
};
