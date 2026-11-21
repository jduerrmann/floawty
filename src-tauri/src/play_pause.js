/* global document, innerHeight */
// Pauses everything that plays, or plays the video across the middle of the window, else the only one.
(() => {
  const playing = [...document.querySelectorAll('video, audio')].filter((media) => !media.paused);
  if (playing.length > 0) {
    playing.forEach((media) => media.pause());
    return;
  }
  const all = [...document.querySelectorAll('video')];
  const middle = innerHeight / 2;
  const across = all.find((video) => {
    const box = video.getBoundingClientRect();
    return box.width > 0 && box.top <= middle && box.bottom > middle;
  });
  // Feeds like TikTok keep their neighbours' videos in the page; those must never start.
  const only = all.length === 1 ? all[0] : undefined;
  (across ?? only)?.play();
})();
