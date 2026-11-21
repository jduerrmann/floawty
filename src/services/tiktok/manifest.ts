import type { ServiceManifest } from '../manifest';

// Straight to the For You feed with the auto mode on, like the YouTube Shorts tile.
export const tiktok: ServiceManifest = {
  id: 'tiktok',
  name: 'TikTok',
  startUrl: 'https://www.tiktok.com/foryou',
  allowedDomains: ['tiktok.com'],
  brandColor: '#010101',
  symbol: 'tiktok.svg',
  shortsAutoMode: true,
  startsShortsAuto: true,
};
