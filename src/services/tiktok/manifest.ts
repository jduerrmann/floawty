import type { ServiceManifest } from '../manifest';

// Straight to the For You feed with the auto mode on, like the YouTube Shorts tile.
export const tiktok: ServiceManifest = {
  id: 'tiktok',
  name: 'TikTok',
  startUrl: 'https://www.tiktok.com/foryou',
  allowedDomains: ['tiktok.com'],
  // TikTok's cyan, not its black: a black tint would leave the glass tile without colour.
  brandColor: '#25f4ee',
  symbol: 'tiktok.svg',
  shortsAutoMode: true,
  startsShortsAuto: true,
  videoOnly: true,
  // "Continue with Google / Apple / Facebook" open these pop-ups (live 2026-11-20).
  signInHosts: ['accounts.google.com', 'appleid.apple.com', 'www.facebook.com'],
};
