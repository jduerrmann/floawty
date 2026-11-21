// All YouTube DOM selectors of the adapter. The next control's label is localized, never match text.
import type { VideoOnlyRules } from '../video-only';

export const SHORT_VIDEO = 'ytd-shorts #shorts-player video';
export const NEXT_CONTROL = 'ytd-shorts #navigation-button-down button';

// Other hosts (music, m) have their own layouts without these players.
const HOST = 'www.youtube.com';
// The last watch page stays in the DOM, hidden, while the user browses elsewhere.
const WATCH_PLAYER = 'ytd-watch-flexy:not([hidden]) #movie_player';
// YouTube swipes from Short to Short by scrolling this list; each Short sits in its own box.
const SHORTS_LIST = 'ytd-shorts #shorts-container';
const SHORT_BOX = `${SHORTS_LIST} #shorts-inner-container > [class*='reel-video-in-sequence']`;
// The boxes nested in a Short, from its renderer down to the player, all as big as the window.
const SHORT_PARTS = `${SHORT_BOX} :is(ytd-reel-video-renderer, #reel-overlay-container,
  #short-video-container, .player-wrapper, #player-container, ytd-player, #shorts-player)`;
// YouTube's own row (play, volume, more actions) and seek bar of the Short that plays.
const CONTROL_ROW = `${SHORT_BOX}:has(#shorts-player) #player-container > .player-controls`;
const SEEK_BAR = `${SHORT_BOX}:has(#shorts-player) .player-wrapper > #scrubber`;
// Beside the way to the player (never the player, its controls, nor an ad Short's card) content is skipped: YouTube's parts undo a hidden visibility.
const BESIDE_THE_PLAYER = `${SHORT_BOX} :is(#reel-overlay-container > :not(ytd-reel-video-renderer, #ads-overlay),
  ytd-reel-video-renderer > :not(#short-video-container),
  #short-video-container > :not(.player-wrapper), .player-wrapper > :not(#player-container),
  #player-container > :not(ytd-player)):not(#shorts-player, :has(#shorts-player), ${CONTROL_ROW}, ${SEEK_BAR})`;
// The ad card shares the bottom with the row and seek bar and must stay on top of them.
const AD_CARD = `${SHORT_BOX} #reel-overlay-container > #ads-overlay`;
// The seek bar's 24 px hit area reaches 14 px above its 3 px line; the row sits right above it.
const AT_THE_BOTTOM = `position: fixed !important; left: 0 !important; right: auto !important;
  top: auto !important; width: 100vw !important; z-index: 1 !important;`;
// Above the masthead (2020) and guide (2030), below YouTube's own dialogs (2201 and up).
const LAYER = 2200;
const FILL = `position: fixed !important; inset: 0 !important; width: 100vw !important;
  height: 100vh !important; z-index: ${LAYER} !important; background: #000 !important;
  border-radius: 0 !important;`;
const WINDOW_SIZED = `width: 100vw !important; height: 100vh !important; max-width: none !important;
  max-height: none !important; margin: 0 !important; padding: 0 !important;
  border-radius: 0 !important;`;

export const VIDEO_ONLY: VideoOnlyRules = {
  pages: [
    { matches: (host, path) => host === HOST && path === '/watch', player: WATCH_PLAYER },
    {
      matches: (host, path) => host === HOST && path.startsWith('/shorts/'),
      player: SHORT_BOX,
    },
  ],
  // The wider watch layout names the player's container for view transitions, which would trap
  // the fixed player. Shorts keep YouTube's own swipe: the whole list fills the window instead.
  css: `
    html.floawty-video-only ${WATCH_PLAYER} { ${FILL} }
    html.floawty-video-only ytd-watch-flexy:not([hidden]) :has(#movie_player) {
      view-transition-name: none !important;
    }
    html.floawty-video-only ${SHORTS_LIST} { ${FILL} margin: 0 !important; padding: 0 !important; }
    html.floawty-video-only ${SHORTS_LIST} #shorts-inner-container {
      width: 100vw !important; margin: 0 !important; padding: 0 !important;
    }
    html.floawty-video-only ${SHORT_BOX} { ${WINDOW_SIZED} }
    html.floawty-video-only ${SHORT_PARTS} { ${WINDOW_SIZED} }
    html.floawty-video-only ${BESIDE_THE_PLAYER} {
      content-visibility: hidden !important; pointer-events: none !important;
    }
    html.floawty-video-only ${SEEK_BAR} { ${AT_THE_BOTTOM} bottom: 8px !important; }
    html.floawty-video-only ${CONTROL_ROW} { ${AT_THE_BOTTOM} bottom: 24px !important; }
    html.floawty-video-only ${AD_CARD} { z-index: 2 !important; }
  `,
};
