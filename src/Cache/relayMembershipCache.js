import { registerAccountScopedReset } from "./accountScope";

// Membership is per-account: a relay the current user has joined says nothing
// about the next account, so this clears on every account change rather than
// persisting like relay metadata does.
const membershipCache = new Map();

export const getRelayMembership = (relayUrl) =>
  membershipCache.has(relayUrl) ? membershipCache.get(relayUrl) : null;

export const setRelayMembership = (relayUrl, isMember) => {
  membershipCache.set(relayUrl, !!isMember);
};

export const clearRelayMembership = (relayUrl) => {
  if (relayUrl) membershipCache.delete(relayUrl);
  else membershipCache.clear();
};

registerAccountScopedReset(() => membershipCache.clear());
