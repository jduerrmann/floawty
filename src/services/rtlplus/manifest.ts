import type { ServiceManifest } from '../manifest';

// "Sign in with Amazon" runs on Amazon's own pages.
export const rtlplus: ServiceManifest = {
  id: 'rtlplus',
  name: 'RTL+',
  startUrl: 'https://plus.rtl.de/',
  allowedDomains: ['rtl.de', 'amazon.de', 'amazon.com'],
  brandColor: '#e5002b',
  symbol: 'logos/rtlplus.svg',
};
