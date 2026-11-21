import type { ServiceManifest } from '../manifest';

export const disney: ServiceManifest = {
  id: 'disney',
  name: 'Disney+',
  startUrl: 'https://www.disneyplus.com/',
  allowedDomains: ['disneyplus.com', 'disney.com'],
  // Lighter than Disney+'s navy so the glass tile shows its colour on the dark ground.
  brandColor: '#3d7bff',
  symbol: 'logos/disney.svg',
};
