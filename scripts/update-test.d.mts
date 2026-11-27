export const UPDATE_TEST: {
  /** Relative to the repository root. */
  dir: string;
  port: number;
  /** The version the served update announces and its signature is bound to. */
  version: string;
  portable: string;
  installed: string;
  /** The signed "setup"; `other.exe.sig` next to it signs other bytes. */
  payload: string;
};

/** A copy of the exe with Tauri's bundle-type marker set to NSIS; throws unless it holds it once. */
export function patchBundleType(exe: Buffer): Buffer;
