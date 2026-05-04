/**
 * Shared in-memory caches (module-level singletons — never GC'd within the session)
 * eventCache  : addr/id → parsed event object
 * authorCache : pubkey  → { name, display_name, picture }
 * urlCache    : url     → link-preview metadata | "NOT_FOUND"
 */

export const eventCache = new Map();
export const authorCache = new Map();
export const urlCache = new Map();
