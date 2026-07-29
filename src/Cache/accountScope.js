// Central account-scope registry.
//
// Nothing here remounts the React tree: logging in writes the new keys and then
// client-side navigates (`router.replace("/dashboard")`), so `_app` — and every
// module singleton it imported — survives the account change. Anything cached
// outside Redux therefore keeps answering for the PREVIOUS pubkey until a hard
// reload. That is what made the dashboard, and later the subscription page,
// render the old account's numbers under the new account.
//
// Every module-level cache registers a reset function here, and `resetAccountScopedCaches`
// is called from the one place that knows the account changed (`AccountInit`). Adding a
// new cache is a one-line `registerAccountScopedReset(...)` next to it rather than another
// import that someone has to remember to wire into the login path.

const resetters = new Set();

/**
 * Register a function to run whenever the signed-in account changes.
 * Returns an unregister function (used by hooks that register per-instance state).
 */
export const registerAccountScopedReset = (reset) => {
  if (typeof reset !== "function") return () => {};
  resetters.add(reset);
  return () => resetters.delete(reset);
};

/**
 * The pubkey the in-memory caches currently hold data for. Kept here (rather than read
 * from Redux) so non-React modules can answer "is this cache still mine?" cheaply.
 */
let currentScopePubkey = null;

export const getAccountScope = () => currentScopePubkey;

/**
 * Drop every registered in-memory cache and mark the new owner.
 *
 * Safe to call repeatedly with the same pubkey — session restore and the post-login
 * redirect both run through `initAppAccount`, and wiping a freshly-populated cache
 * would just cause a redundant refetch. Pass `force` to reset regardless (logout).
 */
export const resetAccountScopedCaches = (pubkey = null, { force = false } = {}) => {
  if (!force && pubkey && currentScopePubkey === pubkey) return false;

  currentScopePubkey = pubkey;

  for (const reset of resetters) {
    try {
      reset(pubkey);
    } catch (err) {
      // One broken cache must not stop the rest from clearing — a half-reset app
      // is exactly the cross-account leak this module exists to prevent.
      console.error("[accountScope] reset handler failed:", err);
    }
  }

  return true;
};
