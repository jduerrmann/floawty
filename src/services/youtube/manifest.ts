import type { ServiceManifest } from '../manifest';

// Google domains are needed for signing in and for the cookie consent pages.
export const youtube: ServiceManifest = {
  id: 'youtube',
  name: 'YouTube',
  startUrl: 'https://www.youtube.com/',
  allowedDomains: ['youtube.com', 'google.com', 'google.de'],
  brandColor: '#ff0000',
  symbol: 'logos/youtube.svg',
  shortsAutoMode: true,
  videoOnly: true,
};
