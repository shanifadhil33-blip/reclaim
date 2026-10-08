const WORKLIST_KEY = "reclaim_eob_worklist";
const TRASH_KEY = "reclaim_eob_trash";
const OWNER_KEY = "reclaim_eob_owner";

export function clearLocalClaimData() {
  try {
    localStorage.removeItem(WORKLIST_KEY);
    localStorage.removeItem(TRASH_KEY);
    localStorage.removeItem(OWNER_KEY);
  } catch {
    // Private mode or a full disk. Nothing else to clear.
  }
}

/**
 * Keep denial rows with the account that created them.
 * A different signed-in user on this browser drops the previous rows.
 * A missing owner stamp is the pre-existing browser, so those rows stay.
 */
export function adoptLocalClaimData(userId: string) {
  try {
    const owner = localStorage.getItem(OWNER_KEY);
    if (owner && owner !== userId) {
      localStorage.removeItem(WORKLIST_KEY);
      localStorage.removeItem(TRASH_KEY);
    }
    localStorage.setItem(OWNER_KEY, userId);
  } catch {
    // Ignore storage failures. The server copy of saved letters is unchanged.
  }
}
