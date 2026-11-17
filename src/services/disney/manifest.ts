import type { ServiceManifest } from '../manifest';

export const disney: ServiceManifest = {
  id: 'disney',
  name: 'Disney+',
  startUrl: 'https://www.disneyplus.com/',
  allowedDomains: ['disneyplus.com', 'disney.com'],
  brandColor: '#0e2a73',
  symbol: 'disney.svg',
};
