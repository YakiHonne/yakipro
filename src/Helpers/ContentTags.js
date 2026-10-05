// Paid notes (flash news) are labelled ["l", "FLASH NEWS"] by YakiHonne, which a
// relay can index, so that filter runs server-side via "#l".
export const PAID_NOTE_LABEL = "FLASH NEWS";

export const isPaidNote = (event) =>
  (event?.tags || []).some((t) => t[0] === "l" && t[1] === PAID_NOTE_LABEL);

// Premium (NIP-63) content carries a bare ["nip63"] tag. Multi-letter tag names
// aren't indexed by relays, so this one can only be checked client-side.
export const isPremiumEvent = (event) =>
  (event?.tags || []).some((t) => t[0] === "nip63");
