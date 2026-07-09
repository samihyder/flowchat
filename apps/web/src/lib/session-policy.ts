/** Session expires after this much idle time (no authenticated API activity). */
export const SESSION_IDLE_MS = 24 * 60 * 60 * 1000;

export const SESSION_IDLE_SECONDS = SESSION_IDLE_MS / 1000;

/** Idle window for sessions created with "Remember me" checked. */
export const SESSION_REMEMBER_ME_MS = 30 * 24 * 60 * 60 * 1000;
