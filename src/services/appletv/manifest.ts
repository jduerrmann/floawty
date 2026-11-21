import type { ServiceManifest } from '../manifest';

// Apple TV, called Apple TV+ until 2025. Sign-in runs on idmsa.apple.com and appleid.apple.com.
export const appletv: ServiceManifest = {
  id: 'appletv',
  name: 'Apple TV',
  startUrl: 'https://tv.apple.com/',
  allowedDomains: ['apple.com'],
  // Silver instead of Apple's near-black: a black tint would leave the glass tile without colour.
  brandColor: '#c7c7d1',
  symbol: 'appletv.svg',
};
