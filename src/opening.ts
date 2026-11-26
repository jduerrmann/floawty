// Which tile shows that its service opens: the click marks it at once, then the shell decides.

export interface Opening {
  /** The tile clicked here that the shell has not reported yet. */
  clicked: string | null;
  /** The service the shell reports as opening. */
  reported: string | null;
}

export const NOT_OPENING: Opening = { clicked: null, reported: null };

export function shownTile(opening: Opening): string | null {
  return opening.reported ?? opening.clicked;
}

/** The next state for a click, or `null` when a tile is opening and the click counts for nothing. */
export function afterClick(opening: Opening, id: string): Opening | null {
  return shownTile(opening) === null ? { clicked: id, reported: null } : null;
}

// A state without an opening may predate the click, so only a reported opening ends the click's mark.
export function afterState(opening: Opening, reported: string | null): Opening {
  if (reported !== null) return { clicked: null, reported };
  return { clicked: opening.reported === null ? opening.clicked : null, reported: null };
}

export function afterFailure(opening: Opening): Opening {
  return { ...opening, clicked: null };
}
