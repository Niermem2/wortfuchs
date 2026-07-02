import { db } from './db'
import { supabase } from './supabase'

export type SyncState = 'local' | 'idle' | 'syncing' | 'offline' | 'error'

let state: SyncState = supabase ? 'idle' : 'local'
const listeners = new Set<(s: SyncState) => void>()

function setState(s: SyncState) {
  state = s
  listeners.forEach((fn) => fn(s))
}

export function getSyncState() {
  return state
}

export function onSyncState(fn: (s: SyncState) => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

async function syncUp(userId: string) {
  if (!supabase) return

  const progress = await db.progress.where('dirty').equals(1).toArray()
  if (progress.length) {
    const rows = progress.map(({ dirty: _d, ...r }) => r)
    const { error } = await supabase.from('card_progress').upsert(rows)
    if (error) throw error
    await db.progress.bulkPut(progress.map((p) => ({ ...p, dirty: 0 as const })))
  }

  const sessions = await db.sessions.where('dirty').equals(1).toArray()
  if (sessions.length) {
    const rows = sessions.map(({ dirty: _d, ...r }) => r)
    const { error } = await supabase.from('sessions').upsert(rows)
    if (error) throw error
    await db.sessions.bulkPut(sessions.map((s) => ({ ...s, dirty: 0 as const })))
  }

  const profile = await db.profiles.get(userId)
  if (profile?.dirty) {
    const { dirty: _d, ...row } = profile
    const { error } = await supabase.from('profiles').update(row).eq('id', userId)
    if (error) throw error
    await db.profiles.put({ ...profile, dirty: 0 })
  }

  const settings = await db.settings.get(userId)
  if (settings?.dirty) {
    const { dirty: _d, ...row } = settings
    const { error } = await supabase.from('settings').upsert(row)
    if (error) throw error
    await db.settings.put({ ...settings, dirty: 0 })
  }
}

async function syncDown(userId: string) {
  if (!supabase) return

  const [books, lessons, cards, profiles] = await Promise.all([
    supabase.from('books').select(),
    supabase.from('lessons').select(),
    supabase.from('cards').select(),
    supabase.from('profiles').select(),
  ])
  for (const r of [books, lessons, cards, profiles]) {
    if (r.error) throw r.error
  }
  await db.transaction('rw', [db.books, db.lessons, db.cards, db.profiles], async () => {
    await db.books.bulkPut(books.data!)
    await db.lessons.bulkPut(lessons.data!)
    await db.cards.bulkPut(cards.data!)
    // eigenes Profil nicht überschreiben, wenn lokal noch ungesynct
    const own = await db.profiles.get(userId)
    const rows = profiles
      .data!.filter((p) => !(p.id === userId && own?.dirty))
      .map((p) => ({ ...p, dirty: 0 as const }))
    await db.profiles.bulkPut(rows)
  })

  // Fortschritt vom Server (z. B. zweites Gerät); lokal Ungesynctes gewinnt
  const { data: progress, error } = await supabase
    .from('card_progress')
    .select()
    .eq('user_id', userId)
  if (error) throw error
  await db.transaction('rw', db.progress, async () => {
    for (const row of progress!) {
      const local = await db.progress.get([row.user_id, row.card_id])
      if (!local || (!local.dirty && local.updated_at < row.updated_at)) {
        await db.progress.put({ ...row, dirty: 0 })
      }
    }
  })

  const { data: settings } = await supabase.from('settings').select().eq('user_id', userId)
  const localSettings = await db.settings.get(userId)
  const remote = settings?.[0]
  if (remote && (!localSettings || (!localSettings.dirty && localSettings.updated_at < remote.updated_at))) {
    await db.settings.put({ ...remote, dirty: 0 })
  }
}

let syncing = false

export async function fullSync(userId: string) {
  if (!supabase || syncing) return
  if (!navigator.onLine) {
    setState('offline')
    return
  }
  syncing = true
  setState('syncing')
  try {
    await syncUp(userId)
    await syncDown(userId)
    await db.meta.put({ key: 'lastSync', value: new Date().toISOString() })
    setState('idle')
  } catch (e) {
    console.error('Sync fehlgeschlagen', e)
    setState(navigator.onLine ? 'error' : 'offline')
  } finally {
    syncing = false
  }
}

export function startAutoSync(userId: string) {
  if (!supabase) return
  fullSync(userId)
  window.addEventListener('online', () => fullSync(userId))
  window.addEventListener('offline', () => setState('offline'))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') fullSync(userId)
  })
  setInterval(() => fullSync(userId), 2 * 60 * 1000)
}
