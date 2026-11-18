// All Crunchyroll DOM selectors of the adapter (player nesting seen live, 2026-11-18).
import type { VideoOnlyRules } from '../video-only';

const HOST = 'www.crunchyroll.com';
// Episode pages, with or without a language prefix such as /de/ or /pt-br/.
const EPISODE_PATH = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?watch\//;
const PLAYER = '.video-player-wrapper';
// Above the fixed header (100) and the layout overlay (99), below the consent dialog.
const LAYER = 200;

export const VIDEO_ONLY: VideoOnlyRules = {
  pages: [{ matches: (host, path) => host === HOST && EPISODE_PATH.test(path), player: PLAYER }],
  css: `
    html.floawty-video-only ${PLAYER} {
      position: fixed !important; inset: 0 !important; width: 100vw !important;
      height: 100vh !important; max-height: none !important; z-index: ${LAYER} !important;
      background: #000 !important;
    }
    html.floawty-video-only ${PLAYER} #player-container {
      width: 100% !important; height: 100% !important; padding: 0 !important;
    }
  `,
};
