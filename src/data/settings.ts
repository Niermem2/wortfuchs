import { db } from './db'
import { DEFAULT_SETTINGS, type SettingsData } from './types'

export async function getSettings(userId: string): Promise<SettingsData> {
  const row = await db.settings.get(userId)
  return { ...DEFAULT_SETTINGS, ...row?.data }
}

export async function updateSettings(userId: string, patch: Partial<SettingsData>) {
  const current = await getSettings(userId)
  await db.settings.put({
    user_id: userId,
    data: { ...current, ...patch },
    updated_at: new Date().toISOString(),
    dirty: 1,
  })
}
