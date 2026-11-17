// Text for the about line; the WebView2 version matters for bug reports.
export interface Versions {
  appVersion: string;
  webviewVersion: string | null;
}

export function aboutText({ appVersion, webviewVersion }: Versions): string {
  return `floawty ${appVersion} · WebView2 ${webviewVersion ?? 'unknown'}`;
}
