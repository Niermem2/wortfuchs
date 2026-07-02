import { db } from './db'
import { supabase } from './supabase'
import { DEFAULT_SETTINGS, type Profile } from './types'
import { DEMO_BOOK, DEMO_LESSONS, DEMO_CARDS } from './demo-cards'

export const LOCAL_USER_ID = 'local'

export function isLocalMode() {
  return supabase === null
}

async function ensureSettings(userId: string) {
  const existing = await db.settings.get(userId)
  if (!existing) {
    await db.settings.put({
      user_id: userId,
      data: { ...DEFAULT_SETTINGS },
      updated_at: new Date().toISOString(),
      dirty: 0,
    })
  }
}

async function ensureLocalProfile(): Promise<Profile> {
  let profile = await db.profiles.get(LOCAL_USER_ID)
  if (!profile) {
    profile = {
      id: LOCAL_USER_ID,
      role: 'child',
      display_name: 'Demo',
      xp: 0,
      level: 1,
      streak_days: 0,
      last_learned_at: null,
      updated_at: new Date().toISOString(),
      dirty: 0,
    }
    await db.profiles.put(profile)
    await db.books.put(DEMO_BOOK)
    await db.lessons.bulkPut(DEMO_LESSONS)
    await db.cards.bulkPut(DEMO_CARDS)
  }
  await ensureSettings(LOCAL_USER_ID)
  return profile
}

/** Stellt die Sitzung wieder her. null = Login nötig (nur mit Supabase möglich). */
export async function initAuth(): Promise<Profile | null> {
  if (!supabase) return ensureLocalProfile()

  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) return null

  let profile = await db.profiles.get(user.id)
  if (!profile) {
    const { data: row } = await supabase.from('profiles').select().eq('id', user.id).single()
    if (!row) return null
    profile = { ...(row as Omit<Profile, 'dirty'>), dirty: 0 }
    await db.profiles.put(profile)
  }
  await ensureSettings(user.id)
  return profile
}

export async function signIn(email: string, password: string): Promise<Profile> {
  if (!supabase) throw new Error('Kein Backend konfiguriert')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  const { data: row, error: pErr } = await supabase
    .from('profiles')
    .select()
    .eq('id', data.user.id)
    .single()
  if (pErr) throw pErr
  const profile: Profile = { ...row, dirty: 0 }
  await db.profiles.put(profile)
  await ensureSettings(profile.id)
  return profile
}

export async function signOut() {
  await supabase?.auth.signOut()
}
