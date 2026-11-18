// Twitch page script: "video only" over channel and video pages, asked by floawty's `__floawty.sync`.
import { startVideoOnlyPage } from '../video-only';
import { VIDEO_ONLY } from './selectors';

startVideoOnlyPage(['twitch.tv'], VIDEO_ONLY);
