import type { ServiceManifest } from '../manifest';

// Apple TV, called Apple TV+ until 2025. Sign-in runs on idmsa.apple.com and appleid.apple.com.
export const appletv: ServiceManifest = {
  id: 'appletv',
  name: 'Apple TV',
  startUrl: 'https://tv.apple.com/',
  allowedDomains: ['apple.com'],
  brandColor: '#1c1c1e',
  symbol: 'appletv.svg',
};
