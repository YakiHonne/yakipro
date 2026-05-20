import Dexie from 'dexie'

export const analyticsDb = new Dexie('yakipro_analytics')

analyticsDb.version(1).stores({
  contentStats:
    'eventId, authorPubkey, kind, publishedAt, zapsSats, reactionsCount',
  profileStats: 'pubkey',
  syncCursors: 'key',
  processedEvents: 'eventId, processedAt',
})

analyticsDb.version(2).stores({
  contentStats:
    'eventId, authorPubkey, kind, publishedAt, zapsSats, reactionsCount',
  profileStats: 'pubkey',
  syncCursors: 'key',
  processedEvents: 'eventId, processedAt',
}).upgrade((tx) => Promise.all([
  tx.table('contentStats').clear(),
  tx.table('profileStats').clear(),
  tx.table('syncCursors').clear(),
  tx.table('processedEvents').clear(),
]))

analyticsDb.version(3).stores({
  contentStats:
    'eventId, authorPubkey, kind, publishedAt, zapsSats, reactionsCount',
  profileStats: 'pubkey',
  syncCursors: 'key',
  processedEvents: 'eventId, processedAt',
}).upgrade((tx) => Promise.all([
  tx.table('contentStats').clear(),
  tx.table('profileStats').clear(),
  tx.table('syncCursors').clear(),
  tx.table('processedEvents').clear(),
]))

analyticsDb.version(4).stores({
  contentStats:
    'eventId, authorPubkey, kind, publishedAt, zapsSats, reactionsCount',
  profileStats: 'pubkey',
  syncCursors: 'key',
  processedEvents: 'eventId, processedAt',
}).upgrade((tx) => Promise.all([
  tx.table('contentStats').clear(),
  tx.table('profileStats').clear(),
  tx.table('syncCursors').clear(),
  tx.table('processedEvents').clear(),
]))

// Version 5 — add stat_events table to map reactions/zaps back to content by date
// This lets the drill overlay show "which content got reactions/zaps in this window"
analyticsDb.version(5).stores({
  contentStats:
    'eventId, authorPubkey, kind, publishedAt, zapsSats, reactionsCount',
  profileStats: 'pubkey',
  syncCursors: 'key',
  processedEvents: 'eventId, processedAt',
  // statType: 'reaction' | 'zap'
  // Compound index [contentEventId+createdAt] for range queries per content
  // Index on createdAt alone for range queries across all content in a window
  statEvents: 'eventId, contentEventId, [contentEventId+createdAt], createdAt, statType',
}).upgrade((tx) => Promise.all([
  tx.table('contentStats').clear(),
  tx.table('profileStats').clear(),
  tx.table('syncCursors').clear(),
  tx.table('processedEvents').clear(),
  // statEvents starts empty — populated on next full sync
]))

export function appendToTimeSeries(arr, dateKey, field, increment, maxEntries = 1200) {
  const existing = arr.find((e) => e.date === dateKey)
  if (existing) {
    existing[field] = (existing[field] || 0) + increment
  } else {
    const idx = arr.findIndex((e) => e.date > dateKey)
    if (idx === -1) {
      arr.push({ date: dateKey, [field]: increment })
    } else {
      arr.splice(idx, 0, { date: dateKey, [field]: increment })
    }
  }
  if (arr.length > maxEntries) arr.shift()
  return arr
}

export default analyticsDb
