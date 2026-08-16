import aiChatDb from "./aiChatDb";

const SCHEMA_VERSION = 2;
const SCHEMA_VERSION_KEY = "yaki-ai-storage-version";
const ANON_SCOPE = "anon";

export const scopeOf = (pubkey) => pubkey || ANON_SCOPE;

export const scopedKey = (base, pubkey) => `${base}:${scopeOf(pubkey)}`;

export const scopedSessionId = (base, pubkey) => `${base}:${scopeOf(pubkey)}`;

// Rows written before keys carried a pubkey cannot be attributed to an account,
// so they would surface under whichever account happens to log in next. Drop them
// once, the first time this version of the schema runs.
export async function purgeLegacyAiStorage() {
  if (typeof window === "undefined") return;
  try {
    const stored = Number(localStorage.getItem(SCHEMA_VERSION_KEY) || 0);
    if (stored >= SCHEMA_VERSION) return;

    const sessions = await aiChatDb.sessions.toArray();
    const legacySessions = sessions
      .filter((row) => !String(row.sessionId || "").includes(":"))
      .map((row) => row.sessionId);
    if (legacySessions.length > 0)
      await aiChatDb.sessions.bulkDelete(legacySessions);

    const reactions = await aiChatDb.secondReaderReactions.toArray();
    const legacyReactions = reactions
      .filter((row) => !String(row.personaId || "").includes(":"))
      .map((row) => row.personaId);
    if (legacyReactions.length > 0)
      await aiChatDb.secondReaderReactions.bulkDelete(legacyReactions);

    localStorage.removeItem("sr-last-persona");
    localStorage.setItem(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION));
  } catch {}
}
