import type { ServiceManifest } from '../manifest';

// Sign-in runs on sso.crunchyroll.com, a subdomain.
export const crunchyroll: ServiceManifest = {
  id: 'crunchyroll',
  name: 'Crunchyroll',
  startUrl: 'https://www.crunchyroll.com/',
  allowedDomains: ['crunchyroll.com'],
  brandColor: '#f47521',
  symbol: 'crunchyroll.svg',
  videoOnly: true,
};
