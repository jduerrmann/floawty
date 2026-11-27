export interface Release {
  version: string;
  notes: string;
  pubDate: Date;
  /** The content of the `.sig` file `tauri signer sign` wrote next to the setup. */
  signature: string;
  url: string;
}

export interface LatestJson {
  version: string;
  notes: string;
  pub_date: string;
  platforms: { 'windows-x86_64': { signature: string; url: string } };
}

/** The updater's latest.json for one release; throws on a malformed version, signature or url. */
export function latestJson(release: Release): LatestJson;
