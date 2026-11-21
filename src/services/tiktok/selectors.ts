// All TikTok DOM selectors of the adapter; data-e2e attributes, never TikTok's generated class names.
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
export const FEED_HOST = 'www.tiktok.com';
export const FEED_PATHS: readonly string[] = ['/', '/foryou', '/following'];

// Video only for TikTok follows in package sf-03.
export const VIDEO_ONLY: VideoOnlyRules = { pages: [], css: '' };
