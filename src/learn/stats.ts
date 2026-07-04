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

/** Montag 00:00 bis Montag 00:00 der Woche mit Versatz (0 = aktuelle, -1 = Vorwoche) */
export function weekRange(offset = 0): { start: Date; end: Date } {
  const start = new Date()
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + offset * 7)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}

export function sessionsInRange(sessions: Session[], start: Date, end: Date): Session[] {
  const s = start.toISOString()
  const e = end.toISOString()
  return sessions.filter((x) => x.started_at >= s && x.started_at < e)
}

export function aggregate(sessions: Session[]): WeekStats {
  const w: WeekStats = { xp: 0, durationSec: 0, cardsSeen: 0, cardsCorrect: 0, sessions: 0 }
  for (const s of sessions) {
    w.xp += s.xp_earned
    w.durationSec += s.duration_sec
    w.cardsSeen += s.cards_seen
    w.cardsCorrect += s.cards_correct
    w.sessions += 1
  }
  return w
}

/** Karten pro Wochentag (Index 0 = Montag) für die Woche ab weekStart */
export function cardsPerDay(sessions: Session[], weekStart: Date): number[] {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return localDay(d)
  })
  const out = Array.from({ length: 7 }, () => 0)
  for (const s of sessions) {
    const idx = days.indexOf(localDay(new Date(s.started_at)))
    if (idx >= 0) out[idx] += s.cards_seen
  }
  return out
}

/** Längste Serie aufeinanderfolgender Tage mit mindestens einer Session */
export function longestStreak(sessions: Session[]): number {
  const days = [...new Set(sessions.map((s) => localDay(new Date(s.started_at))))].sort()
  let best = 0
  let run = 0
  let prev: Date | null = null
  for (const day of days) {
    const d = new Date(day)
    run = prev !== null && d.getTime() - prev.getTime() === 86400000 ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

/** Höchste Wochen-XP, die je erreicht wurde */
export function bestWeekXp(sessions: Session[]): number {
  const byWeek = new Map<string, number>()
  for (const s of sessions) {
    const d = new Date(s.started_at)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const key = localDay(d)
    byWeek.set(key, (byWeek.get(key) ?? 0) + s.xp_earned)
  }
  return Math.max(0, ...byWeek.values())
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
