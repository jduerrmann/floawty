// All Twitch DOM selectors of the adapter.
import type { VideoOnlyRules } from '../video-only';

const PLAYER_BOX = '.persistent-player';
const PLAYER = `${PLAYER_BOX} .video-player`;
// Above Twitch's top navigation (1000) and channel details.
const LAYER = 2200;
// First path parts that are Twitch's own pages, not channels with a player.
const NOT_CHANNELS = new Set([
  'directory', 'search', 'settings', 'subscriptions', 'inventory', 'wallet', 'drops',
  'downloads', 'jobs', 'p', 'turbo', 'prime', 'friends', 'messages', 'moderator', 'u',
]); // prettier-ignore

function isChannelOrVideo(host: string, path: string): boolean {
  if (host !== 'www.twitch.tv') return false;
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'videos') return parts.length === 2;
  return parts.length === 1 && !NOT_CHANNELS.has(parts[0] ?? '');
}

// The player box carries a transform and height limits in inline styles, which would trap
// and clip the fixed player; its stacking contexts must also rise above the navigation.
export const VIDEO_ONLY: VideoOnlyRules = {
  pages: [{ matches: isChannelOrVideo, player: PLAYER }],
  css: `
    html.floawty-video-only main.twilight-main { z-index: ${LAYER} !important; }
    html.floawty-video-only ${PLAYER_BOX} {
      transform: none !important; overflow: visible !important; max-height: none !important;
      z-index: ${LAYER} !important;
    }
    html.floawty-video-only ${PLAYER} {
      position: fixed !important; inset: 0 !important; width: 100vw !important;
      height: 100vh !important; z-index: ${LAYER} !important; background: #000 !important;
    }
    html.floawty-video-only ${PLAYER} .video-player__container { max-height: none !important; }
  `,
};
