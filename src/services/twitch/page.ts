// Twitch page script: "video only" over channel and video pages, asked by floawty's `__floawty.sync`.
import { startBridge, type Status } from '../bridge';
import { createVideoOnly, readVideoOnly } from '../video-only';
import { VIDEO_ONLY } from './selectors';

startBridge(['twitch.tv'], () => {
  const applyVideoOnly = createVideoOnly(VIDEO_ONLY);
  let videoOnly = false;
  return (input: unknown): Status => {
    try {
      videoOnly = readVideoOnly(input) ?? videoOnly;
      return { aspect: 'landscape', problems: applyVideoOnly(videoOnly) ? ['player-missing'] : [] };
    } catch {
      return { aspect: 'landscape', problems: [] };
    }
  };
});
