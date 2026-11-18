// Netflix page script: no page scrollbar beside the player while a title plays.
import { hostAllowed } from '../manifest';
import { WATCH_PATH } from './selectors';

const CLASS = 'floawty-watching';

function start(): void {
  const style = document.createElement('style');
  style.textContent = `html.${CLASS}, html.${CLASS} body { overflow: hidden !important; }`;
  const update = () => {
    if (!document.documentElement) return;
    if (!style.isConnected) document.documentElement.append(style);
    document.documentElement.classList.toggle(CLASS, WATCH_PATH.test(location.pathname));
  };
  update();
  document.addEventListener('DOMContentLoaded', update);
  // Netflix changes pages without loading; the Navigation API reports every change.
  navigation.addEventListener('currententrychange', update);
}

if (window.top === window && hostAllowed(location.hostname, ['netflix.com'])) start();
