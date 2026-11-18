import type { ServiceManifest } from '../manifest';
import { youtube } from '../youtube/manifest';

// Straight to the Shorts feed, with the auto mode on, so nobody has to find the Shorts first.
export const youtubeShorts: ServiceManifest = {
  ...youtube,
  id: 'youtube-shorts',
  name: 'YouTube Shorts',
  startUrl: 'https://www.youtube.com/shorts',
  symbol: 'youtube-shorts.svg',
  startsShortsAuto: true,
};
