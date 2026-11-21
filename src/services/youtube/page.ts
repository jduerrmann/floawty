// YouTube page script: the Shorts feed with its auto mode, and video only on watch and Shorts pages.
import { startShortFeed } from '../short-feed/feed';
import { NEXT_CONTROL, SHORT_VIDEO, VIDEO_ONLY } from './selectors';

startShortFeed({
  hosts: ['youtube.com'],
  onFeed: () => location.pathname.startsWith('/shorts/'),
  feedFound: () => document.querySelector(SHORT_VIDEO) !== null,
  currentMedia: () => document.querySelector<HTMLVideoElement>(SHORT_VIDEO),
  nextControl: () => document.querySelector<HTMLElement>(NEXT_CONTROL),
  // Every Short has its own path; an ad between Shorts only restarts the same video.
  itemKey: () => location.pathname,
  startEvents: ['loadstart'],
  videoOnly: VIDEO_ONLY,
});
