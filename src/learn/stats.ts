import type { Session } from '../data/types'

/** Lokales Datum als YYYY-MM-DD (kein UTC-Versatz um Mitternacht) */
export function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Montag 00:00 der laufenden Woche als ISO-String */
export function weekStartIso(): string {
  const d = new Date()
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export interface WeekStats {
  xp: number
  durationSec: number
  cardsSeen: number
  cardsCorrect: number
  sessions: number
}

export function weekStatsByUser(sessions: Session[]): Map<string, WeekStats> {
  const start = weekStartIso()
  const map = new Map<string, WeekStats>()
  for (const s of sessions) {
    if (s.started_at < start) continue
    const w = map.get(s.user_id) ?? { xp: 0, durationSec: 0, cardsSeen: 0, cardsCorrect: 0, sessions: 0 }
    w.xp += s.xp_earned
    w.durationSec += s.duration_sec
    w.cardsSeen += s.cards_seen
    w.cardsCorrect += s.cards_correct
    w.sessions += 1
    map.set(s.user_id, w)
  }
  return map
}
