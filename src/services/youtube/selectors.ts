// All YouTube DOM selectors of the adapter. The next control's label is localized, never match text.
import type { VideoOnlyRules } from '../video-only';

export const SHORT_VIDEO = 'ytd-shorts #shorts-player video';
export const NEXT_CONTROL = 'ytd-shorts #navigation-button-down button';

// Other hosts (music, m) have their own layouts without these players.
const HOST = 'www.youtube.com';
// The last watch page stays in the DOM, hidden, while the user browses elsewhere.
const WATCH_PLAYER = 'ytd-watch-flexy:not([hidden]) #movie_player';
const SHORTS_PLAYER = 'ytd-shorts #shorts-player';
// Above the masthead (2020) and guide (2030), below YouTube's own dialogs (2201 and up).
const LAYER = 2200;
const FILL = `position: fixed !important; inset: 0 !important; width: 100vw !important;
  height: 100vh !important; z-index: ${LAYER} !important; background: #000 !important;
  border-radius: 0 !important;`;

export const VIDEO_ONLY: VideoOnlyRules = {
  pages: [
    { matches: (host, path) => host === HOST && path === '/watch', player: WATCH_PLAYER },
    {
      matches: (host, path) => host === HOST && path.startsWith('/shorts/'),
      player: SHORTS_PLAYER,
    },
  ],
  // Each Short's box contains its layout, and the wider watch layout names the player's
  // container for view transitions; both would trap the fixed player inside them.
  css: `
    html.floawty-video-only ${WATCH_PLAYER} { ${FILL} }
    html.floawty-video-only ytd-watch-flexy:not([hidden]) :has(#movie_player) {
      view-transition-name: none !important;
    }
    html.floawty-video-only ${SHORTS_PLAYER} { ${FILL} }
    html.floawty-video-only ytd-shorts #shorts-inner-container > * { contain: none !important; }
  `,
};
