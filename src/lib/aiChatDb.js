import Dexie from 'dexie'

const aiChatDb = new Dexie('yakipro_ai_chat')

aiChatDb.version(1).stores({
  // sessionId is caller-defined (e.g. 'article-editor')
  // messages is a JSON blob — no need to index individual messages
  sessions: 'sessionId, updatedAt',
})

// Version 2 — add second reader reactions storage
// key: personaId, stores reactions array + content hash for invalidation
aiChatDb.version(2).stores({
  sessions: 'sessionId, updatedAt',
  secondReaderReactions: 'personaId, updatedAt',
})

export default aiChatDb
