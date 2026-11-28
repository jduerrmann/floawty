export interface ReleaseFiles {
  tag: string;
  packageJson: string;
  packageLock: string;
  cargoToml: string;
  cargoLock: string;
  tauriConf: string;
  changelog: string;
}

/** Why the tag cannot be released: version mismatches, a missing CHANGELOG section or an empty updater key. */
export function releaseProblems(files: ReleaseFiles): string[];
