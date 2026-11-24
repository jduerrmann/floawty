export type Mode = 'hidden' | 'real' | 'visible' | 'measure';

export type Plan =
  | {
      /** True: floawty runs on a hidden desktop; false: on the real one. */
      hiddenDesktop: boolean;
      timeoutS: number;
      banner: string;
      /** The arguments after `playwright`. */
      playwrightArgs: string[];
    }
  | { refused: string[] };

/** The plan of a mode with the arguments the caller added, or the arguments it refuses. */
export function planRun(mode: string, extra: string[]): Plan;
