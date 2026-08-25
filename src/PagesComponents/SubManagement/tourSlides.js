/**
 * Copy for the Sub-management tour.
 *
 * Rules that produced this text:
 *  - Name things exactly as the UI names them. The user is about to look at a
 *    screen that says "Allow delegation" and "Delegated" — the tour must use
 *    those words, or it teaches nothing transferable.
 *  - Every slide answers "what do I do / what happens", not "what is it".
 *  - Say the consequence. Vague reassurance ("it just works") is worthless;
 *    "readers get access the second they pay" is checkable.
 *
 * Accurate to the implementation:
 *  - premium posts publish only to relays advertising NIP-63 support; if none
 *    resolve, publishing is refused rather than leaking to the public pool
 *  - non-YakiHonne premium relays are invite-only (kind 28934 claim)
 *  - our relay is auto-joined for genuinely paid accounts (trial excluded)
 *  - "Allow delegation" hands us the relay's access code so we keep the
 *    creator's SUBSCRIBER list current for them; we never touch the
 *    creator's own relay list
 *  - Delegated = paid via the gateway; Direct = added by hand, no payment
 */

export const SLIDES = [
  {
    id: "premium",
    title: "Premium posts need a premium relay",
    body: "Only relays with the crown can hold them.",
  },
  {
    id: "join",
    title: "Most need an invite",
    body: "Tap Join relay and paste the operator's code.",
  },
  {
    id: "auto",
    title: "You're already in ours",
    body: "Your plan joins you automatically. Nothing to do.",
  },
  {
    id: "delegation",
    title: "Allow delegation once",
    body: "After that, subscribers are added and removed for you.",
  },
  {
    id: "subscribers",
    title: "Three views of your subscribers",
    body: "Who paid, who you comped, and what you earned.",
  },
  {
    id: "publish",
    title: "Publishing premium content",
    body: "Flip Premium content on in either editor before you post.",
  },
];
