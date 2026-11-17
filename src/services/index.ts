// The services with a tile, in tile order.
import { disney } from './disney/manifest';
import type { ServiceManifest } from './manifest';
import { netflix } from './netflix/manifest';
import { prime } from './prime/manifest';
import { rtlplus } from './rtlplus/manifest';
import { twitch } from './twitch/manifest';
import { youtube } from './youtube/manifest';

export const services: ServiceManifest[] = [youtube, twitch, netflix, prime, disney, rtlplus];
