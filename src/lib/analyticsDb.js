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

analyticsDb.version(5).stores({
  contentStats:
    'eventId, authorPubkey, kind, publishedAt, zapsSats, reactionsCount',
  profileStats: 'pubkey',
  syncCursors: 'key',
  processedEvents: 'eventId, processedAt',
  statEvents: 'eventId, contentEventId, [contentEventId+createdAt], createdAt, statType',
}).upgrade((tx) => Promise.all([
  tx.table('contentStats').clear(),
  tx.table('profileStats').clear(),
  tx.table('syncCursors').clear(),
  tx.table('processedEvents').clear(),
]))

// v6 also fixes a backfill bug where a relay returning fewer than BATCH_SIZE events on a single
// page was wrongly treated as "history exhausted," permanently truncating notes/articles/followers
// for accounts with lots of content. Clearing syncCursors forces every existing account through a
// fresh, correctly-paginated backfill on next load.
analyticsDb.version(6).stores({
  contentStats:
    'eventId, authorPubkey, kind, publishedAt, zapsSats, reactionsCount',
  profileStats: 'pubkey',
  syncCursors: 'key',
  processedEvents: 'eventId, processedAt',
  statEvents: 'eventId, contentEventId, [contentEventId+createdAt], createdAt, statType',
  followerEvents: '[pubkey+followerPubkey], pubkey, followerPubkey, createdAt, [pubkey+createdAt], dateKey',
}).upgrade((tx) => Promise.all([
  tx.table('contentStats').clear(),
  tx.table('profileStats').clear(),
  tx.table('syncCursors').clear(),
  tx.table('processedEvents').clear(),
  tx.table('statEvents').clear(),
]))

// v7 scopes the previously account-agnostic tables to an owner pubkey. `statEvents` and
// `processedEvents` had no pubkey column, so a second account signing in on the same browser
// read the first account's rows: the zaps/engagement charts rendered the previous account's
// history, and its already-seen event ids made processEvent() skip the new account's events so
// profileStats never accumulated. Both tables gain an `ownerPubkey` and every query filters on it.
analyticsDb.version(7).stores({
  contentStats:
    'eventId, authorPubkey, kind, publishedAt, zapsSats, reactionsCount',
  profileStats: 'pubkey',
  syncCursors: 'key, pubkey',
  processedEvents: '[ownerPubkey+eventId], ownerPubkey, processedAt',
  statEvents:
    '[ownerPubkey+eventId], ownerPubkey, contentEventId, [ownerPubkey+contentEventId+createdAt], [ownerPubkey+createdAt], createdAt, statType',
  followerEvents: '[pubkey+followerPubkey], pubkey, followerPubkey, createdAt, [pubkey+createdAt], dateKey',
}).upgrade((tx) => Promise.all([
  tx.table('contentStats').clear(),
  tx.table('profileStats').clear(),
  tx.table('syncCursors').clear(),
  tx.table('processedEvents').clear(),
  tx.table('statEvents').clear(),
  tx.table('followerEvents').clear(),
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
