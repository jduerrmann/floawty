// The services with a tile, in tile order.
import { appletv } from './appletv/manifest';
import { crunchyroll } from './crunchyroll/manifest';
import { disney } from './disney/manifest';
import type { ServiceManifest } from './manifest';
import { netflix } from './netflix/manifest';
import { prime } from './prime/manifest';
import { rtlplus } from './rtlplus/manifest';
import { twitch } from './twitch/manifest';
import { youtube } from './youtube/manifest';
import { youtubeShorts } from './youtube-shorts/manifest';

export const services: ServiceManifest[] = [
  youtube,
  youtubeShorts,
  twitch,
  netflix,
  prime,
  disney,
  rtlplus,
  crunchyroll,
  appletv,
];
