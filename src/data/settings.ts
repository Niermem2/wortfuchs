import { db } from './db'
import { DEFAULT_SETTINGS, type SettingsData } from './types'

export async function getSettings(userId: string): Promise<SettingsData> {
  const row = await db.settings.get(userId)
  const data: SettingsData = { ...DEFAULT_SETTINGS, ...row?.data }
  // Migration: alter An/Aus-Schalter `typoTolerance` → Prozentwert
  const legacy = row?.data as { typoTolerance?: boolean; typoTolerancePercent?: number } | undefined
  if (legacy && legacy.typoTolerancePercent === undefined && legacy.typoTolerance === false) {
    data.typoTolerancePercent = 0
  }
  delete (data as { typoTolerance?: boolean }).typoTolerance
  return data
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
