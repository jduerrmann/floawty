// TikTok's DOM selectors: ids and data-e2e first, else the component name in a class, never its hash.
import type { VideoOnlyRules } from '../video-only';

export const FEED_ARTICLE = 'article[data-e2e="recommend-list-item-container"]';
export const ITEM_VIDEO = 'video';
// A photo series plays its music in an audio element, which ends and restarts like a video.
export const ITEM_MUSIC = 'audio';
// The pictures of a photo series are a Swiper slideshow; its classes come from the library.
export const SLIDE_INDEX = 'data-swiper-slide-index';
export const SLIDE = `[${SLIDE_INDEX}]`;
export const ACTIVE_SLIDE = `.swiper-slide-active[${SLIDE_INDEX}]`;
export const NEXT_CONTROL = '[data-e2e="feed-navigation-next"]';
const FEED_HOST = 'www.tiktok.com';
const FEED_PATHS: readonly string[] = ['/', '/foryou', '/following'];
// A video page goes on as a feed whose paging moves the path to each item's own page (live 2026-11-21).
const ITEM_PAGE = /^\/@[^/]+\/(video|photo)\/\d+$/;

export function isFeedPage(host: string, path: string): boolean {
  return host === FEED_HOST && (FEED_PATHS.includes(path) || ITEM_PAGE.test(path));
}

// TikTok snaps this list from item to item; on video pages it scrolls natively, with a scrollbar.
const LIST = '#column-list-container';
const ITEM = `${LIST} > ${FEED_ARTICLE}`;
const MEDIA_CARD = `${ITEM} section[data-e2e="feed-video"]`;
// Only the card's siblings, so an item of an unknown kind (an ad's, perhaps) stays visible.
const BESIDE_THE_VIDEO = `${MEDIA_CARD} ~ section`;
const ON_THE_VIDEO = `${MEDIA_CARD} :is([class*="-DivCreatorInfoContainer"],
  [class*="-DivMediaCardDescriptionContainer"], [class*="-DivMusicInfoContainer"],
  [data-e2e="more-menu-icon"])`;
// TikTok's volume sits at the top under floawty's bar; it moves above TikTok's label chips.
const VOLUME = `${MEDIA_CARD} [class*="-DivVolumeControlContainer"]`;
// Above TikTok's header (100), below its dialogs (2100 and up, live 2026-11-21).
const LAYER = 1000;
// TikTok gives its card a minimum size, wider than floawty's narrow window (floawty, 2026-11-21).
const WINDOW_SIZED = `width: 100vw !important; height: 100vh !important; min-width: 0 !important;
  min-height: 0 !important; max-width: none !important; max-height: none !important; margin: 0 !important;
  padding: 0 !important; border-radius: 0 !important; aspect-ratio: auto !important;`;

// A short deny list, so whatever else TikTok lays on the video (its labels) stays visible.
export const VIDEO_ONLY: VideoOnlyRules = {
  pages: [{ matches: isFeedPage, player: MEDIA_CARD }],
  css: `
    html.floawty-video-only ${LIST} {
      position: fixed !important; inset: 0 !important; z-index: ${LAYER} !important;
      background: #000 !important; scrollbar-width: none !important; ${WINDOW_SIZED}
    }
    html.floawty-video-only ${ITEM} { ${WINDOW_SIZED} }
    html.floawty-video-only ${ITEM} > * { ${WINDOW_SIZED} }
    html.floawty-video-only ${MEDIA_CARD} { ${WINDOW_SIZED} }
    html.floawty-video-only :is(${BESIDE_THE_VIDEO}, ${ON_THE_VIDEO}) { display: none !important; }
    html.floawty-video-only ${VOLUME} {
      position: absolute !important; top: auto !important; bottom: 48px !important;
      left: 8px !important; right: auto !important;
    }
  `,
};
