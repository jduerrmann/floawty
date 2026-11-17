import type { ServiceManifest } from '../manifest';

// Signing in to Prime Video happens on the regional Amazon sites.
export const prime: ServiceManifest = {
  id: 'prime',
  name: 'Prime Video',
  startUrl: 'https://www.primevideo.com/',
  allowedDomains: ['primevideo.com', 'amazon.com', 'amazon.de'],
  brandColor: '#1a98ff',
  symbol: 'prime.svg',
};
