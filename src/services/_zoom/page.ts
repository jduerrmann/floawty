// Zoom in every service: in an overlay wider than 16:9 the main video fills the width, cut only top and bottom.

const ATTRIBUTE = 'data-floawty-zoom';
// Ratios this close count as equal, so rounding never zooms by a pixel.
const SAME = 1.01;
// A 16:9 overlay never zooms, so a 4:3 picture keeps its height.
const WIDER_THAN = (16 / 9) * SAME;
// The picture must already fill the height of the view, so previews are never zoomed.
const FILLS = 0.95;
// Beyond this, too much picture would be lost: no zoom at all.
const MAX_SCALE = 1.5;

/** The scale that makes the picture as wide as the view, or null when none applies. */
function scaleFor(video: HTMLVideoElement): number | null {
  const ratio = video.videoWidth / video.videoHeight;
  // Layout sizes ignore transforms, so the measurement does not see the zoom itself.
  const box = { width: video.offsetWidth, height: video.offsetHeight };
  if (!ratio || !box.width || !box.height) return null;
  const style = getComputedStyle(video);
  // A page that transforms its video itself, or does not letterbox it, is left alone.
  if (!video.hasAttribute(ATTRIBUTE) && style.transform !== 'none') return null;
  const contained = style.objectFit === 'contain';
  const pictureWidth = contained ? Math.min(box.width, box.height * ratio) : box.width;
  const pictureHeight = contained ? Math.min(box.height, box.width / ratio) : box.height;
  if (pictureHeight < innerHeight * FILLS || !centred(video)) return null;
  const scale = innerWidth / pictureWidth;
  return scale > SAME && scale <= MAX_SCALE ? scale : null;
}

// Scaling about the box's centre cuts both sides evenly only if that is the view's centre.
function centred(video: HTMLVideoElement): boolean {
  const rect = video.getBoundingClientRect();
  return Math.abs(rect.left + rect.width / 2 - innerWidth / 2) <= innerWidth * (SAME - 1);
}

function mainVideo(): HTMLVideoElement | null {
  const area = (video: HTMLVideoElement) => video.offsetWidth * video.offsetHeight;
  const videos = [...document.querySelectorAll('video')].filter((video) => area(video) > 0);
  return videos.sort((a, b) => area(b) - area(a))[0] ?? null;
}

function start(): void {
  let wanted = false;
  let frame = 0;
  let observed: HTMLVideoElement | null = null;
  const style = document.createElement('style');
  // Players resize their video by script too, without a window or media event.
  const watched = new ResizeObserver(() => later());

  const apply = () => {
    frame = 0;
    const video = wanted && innerWidth / innerHeight > WIDER_THAN ? mainVideo() : null;
    // Observing again only on a new video: each observe reports once at once.
    if (video !== observed) {
      watched.disconnect();
      if (video) watched.observe(video);
      observed = video;
    }
    const scale = video ? scaleFor(video) : null;
    for (const zoomed of document.querySelectorAll(`video[${ATTRIBUTE}]`)) {
      if (zoomed !== video || scale === null) zoomed.removeAttribute(ATTRIBUTE);
    }
    if (!video || scale === null) return;
    style.textContent = `video[${ATTRIBUTE}] { transform: scale(${scale.toFixed(4)}) !important;
      transform-origin: 50% 50% !important; }`;
    if (!style.isConnected) document.documentElement.append(style);
    video.setAttribute(ATTRIBUTE, '');
  };
  // Players resize their video in their own resize handlers, so wait for the next frame.
  const later = () => {
    if (!frame) frame = requestAnimationFrame(apply);
  };

  addEventListener('resize', later);
  // Media events do not bubble; capture sees every video, also ones added later.
  document.addEventListener('loadedmetadata', later, true);
  document.addEventListener('resize', later, true);
  define((on) => {
    wanted = on === true;
    later();
  });
}

function define(set: (on: unknown) => void): void {
  Object.defineProperty(window, '__floawtyZoom', { value: Object.freeze(set) });
}

if (window.top === window) {
  // Other documents (about:, data:) get a no-op, so no page can take the name and hear floawty.
  if (/^https?:$/.test(location.protocol)) start();
  else define(() => undefined);
}
