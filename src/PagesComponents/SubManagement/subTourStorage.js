/**
 * Persistence for the Sub-management tour.
 *
 * The tour opens by itself the first time a user ever lands on Manage subs.
 * Once they skip it or reach the end, it must never open by itself again --
 * so the flag lives in localStorage, not sessionStorage: a new tab or a
 * restarted browser must not bring it back.
 *
 * It stays reachable on demand from the info button beside the tabs, which
 * calls the tour directly and does not consult this flag.
 *
 * Scoped per pubkey because two accounts sharing a browser are two different
 * people; the second one has not seen it. A logged-out view falls back to a
 * shared key rather than throwing.
 */

const KEY_PREFIX = "yakipro:sub-tour-seen";

const keyFor = (pubkey) => (pubkey ? `${KEY_PREFIX}:${pubkey}` : KEY_PREFIX);

/** True once the tour has been skipped or completed by this account. */
export const hasSeenSubTour = (pubkey) => {
  if (typeof window === "undefined") return true; // never auto-open during SSR
  try {
    return window.localStorage.getItem(keyFor(pubkey)) === "1";
  } catch {
    // Private mode / storage disabled: treat as seen so the tour cannot
    // reopen on every visit with no way for the user to stop it.
    return true;
  }
};

/** Record that the user skipped or finished the tour. */
export const markSubTourSeen = (pubkey) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(pubkey), "1");
  } catch {
    // Nothing to do: without storage the tour simply will not auto-open again
    // this session, which is the same outcome the user asked for.
  }
};
