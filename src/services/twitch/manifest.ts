import type { ServiceManifest } from '../manifest';

export const twitch: ServiceManifest = {
  id: 'twitch',
  name: 'Twitch',
  startUrl: 'https://www.twitch.tv/',
  allowedDomains: ['twitch.tv'],
  brandColor: '#9146ff',
  symbol: 'twitch.svg',
  videoOnly: true,
};
