// TikTok page script: the For You and Following feeds with the auto mode.
import { startShortFeed } from '../short-feed/feed';
import {
  ACTIVE_SLIDE,
  FEED_ARTICLE,
  FEED_HOST,
  FEED_PATHS,
  ITEM_MUSIC,
  ITEM_VIDEO,
  NEXT_CONTROL,
  SLIDE,
  SLIDE_INDEX,
  VIDEO_ONLY,
} from './selectors';

// The item in view is the article across the middle of the window.
function currentArticle(): Element | null {
  const middle = innerHeight / 2;
  for (const article of document.querySelectorAll(FEED_ARTICLE)) {
    const { top, bottom } = article.getBoundingClientRect();
    if (top <= middle && bottom > middle) return article;
  }
  return null;
}

// A photo series is a slideshow with music; a video parked in its item must not count.
function photoMusic(article: Element | null): HTMLMediaElement | null {
  return article?.querySelector(SLIDE) ? article.querySelector<HTMLMediaElement>(ITEM_MUSIC) : null;
}

function currentMedia(): HTMLMediaElement | null {
  const article = currentArticle();
  return (
    photoMusic(article) ??
    article?.querySelector<HTMLMediaElement>(ITEM_VIDEO) ??
    article?.querySelector<HTMLMediaElement>(ITEM_MUSIC) ??
    null
  );
}

// Swiper's loop mode copies pictures, so the count is the number of distinct indices.
function currentSlide(): { index: number; count: number } | null {
  const article = currentArticle();
  const active = photoMusic(article) && article?.querySelector(ACTIVE_SLIDE);
  if (!article || !active) return null;
  const indices = new Set(
    [...article.querySelectorAll(SLIDE)].map((slide) => slide.getAttribute(SLIDE_INDEX)),
  );
  const index = Number(active.getAttribute(SLIDE_INDEX));
  return Number.isInteger(index) && indices.size > 1 ? { index, count: indices.size } : null;
}

startShortFeed({
  hosts: ['tiktok.com'],
  onFeed: () => location.hostname === FEED_HOST && FEED_PATHS.includes(location.pathname),
  feedFound: () => currentArticle() !== null,
  currentMedia,
  // TikTok hides its arrows in narrow windows; a click on the hidden one still pages.
  nextControl: () => document.querySelector<HTMLElement>(NEXT_CONTROL),
  // The path stays the same in the feed; each item has its own article.
  itemKey: () => currentArticle()?.id ?? '',
  // TikTok preloads the next item and reuses its video elements, so loadstart says nothing.
  startEvents: [],
  slide: currentSlide,
  videoOnly: VIDEO_ONLY,
});
