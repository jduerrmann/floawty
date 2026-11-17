// Shape of a service adapter's manifest (AGENTS.md rule 7).
export interface ServiceManifest {
  id: string;
  name: string;
  startUrl: string;
  /** Top-level navigation stays on these domains and their subdomains (incl. sign-in). */
  allowedDomains: string[];
  /** Tile background. */
  brandColor: string;
  /** floawty's own SVG in src/assets/symbols/; never an imitation of the service's logo. */
  symbol: string;
}

/** Returns the problems of a manifest; an empty list means it is valid. */
export function manifestProblems(manifest: ServiceManifest): string[] {
  const problems: string[] = [];
  if (!manifest.id.trim()) problems.push('id is empty');
  if (!manifest.name.trim()) problems.push('name is empty');
  if (manifest.allowedDomains.length === 0) problems.push('allowedDomains is empty');
  if (!/^#[0-9a-f]{6}$/i.test(manifest.brandColor)) problems.push('brandColor is not #rrggbb');
  if (!/^[a-z0-9-]+\.svg$/.test(manifest.symbol)) problems.push('symbol must be an svg file name');
  const start = URL.parse(manifest.startUrl);
  if (start?.protocol !== 'https:') problems.push('startUrl must use https');
  if (start && !hostAllowed(start.hostname, manifest.allowedDomains)) {
    problems.push('startUrl is not on an allowed domain');
  }
  return problems;
}

export function hostAllowed(host: string, allowedDomains: readonly string[]): boolean {
  return allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}
