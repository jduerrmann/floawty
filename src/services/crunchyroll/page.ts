// Crunchyroll page script: "video only" over episode pages, asked by floawty's `__floawty.sync`.
import { startVideoOnlyPage } from '../video-only';
import { VIDEO_ONLY } from './selectors';

startVideoOnlyPage(['crunchyroll.com'], VIDEO_ONLY);
