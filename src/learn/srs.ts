import { db } from '../data/db'
import type { Card, CardProgress, SettingsData, Subject } from '../data/types'
import { activeLessonIds } from '../data/subjects'

/* 6-Phasen-System (phase6-Methodik): richtig → nächste Phase mit größerem
   Abstand, falsch → zurück in Phase 1. Phase 0 = neu, Phase 6 = Langzeit. */

export const MAX_PHASE = 6

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Fällige + neue Karten aus den aktiven Lektionen, neue zuletzt. */
export async function collectDueCards(
  userId: string,
  settings: SettingsData,
  limit: number,
  subject: Subject = settings.subject,
): Promise<Card[]> {
  const lessonIds = await activeLessonIds(settings, subject)
  if (lessonIds.length === 0) return []
  const cards = await db.cards
    .where('lesson_id')
    .anyOf(lessonIds)
    .filter((c) => c.active)
    .toArray()

  const progress = new Map<string, CardProgress>()
  for (const p of await db.progress.where('user_id').equals(userId).toArray()) {
    progress.set(p.card_id, p)
  }

  const t = today()
  const due: Card[] = []
  const fresh: Card[] = []
  for (const card of cards) {
    const p = progress.get(card.id)
    if (!p) fresh.push(card)
    else if (p.phase < MAX_PHASE && p.due_date !== null && p.due_date <= t) due.push(card)
  }
  // Fällige zuerst (älteste Fälligkeit vorn), dann Neue in Lektionsreihenfolge
  due.sort((a, b) => progress.get(a.id)!.due_date!.localeCompare(progress.get(b.id)!.due_date!))
  return [...due, ...fresh].slice(0, limit)
}

export async function countDue(userId: string, settings: SettingsData): Promise<number> {
  const cards = await collectDueCards(userId, settings, Number.MAX_SAFE_INTEGER)
  return cards.length
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Extra-Übungsrunde, wenn nichts fällig ist: schwächste Karten zuerst
    (niedrige Phase, viele Fehler), Gold-Karten nur als Auffüller.
    Läuft im Test-Modus und lässt das Phasensystem unberührt. */
export async function collectPracticeCards(
  userId: string,
  settings: SettingsData,
  limit: number,
): Promise<Card[]> {
  const lessonIds = await activeLessonIds(settings)
  if (lessonIds.length === 0) return []
  const cards = await db.cards
    .where('lesson_id')
    .anyOf(lessonIds)
    .filter((c) => c.active)
    .toArray()

  const progress = new Map<string, CardProgress>()
  for (const p of await db.progress.where('user_id').equals(userId).toArray()) {
    progress.set(p.card_id, p)
  }
  const rank = (card: Card) => {
    const p = progress.get(card.id)
    return (p?.phase ?? 0) * 100 - Math.min(p?.wrong_count ?? 0, 99)
  }
  // Erst mischen, dann stabil sortieren → zufällige Reihenfolge bei gleichem Rang
  const weakestFirst = shuffle(cards).sort((a, b) => rank(a) - rank(b))
  return shuffle(weakestFirst.slice(0, limit))
}

/** Wendet eine Antwort an und liefert die neue Phase zurück. */
export async function applyAnswer(
  userId: string,
  cardId: string,
  correct: boolean,
  intervals: number[],
): Promise<number> {
  const existing = await db.progress.get([userId, cardId])
  const oldPhase = existing?.phase ?? 0
  const phase = correct ? Math.min(oldPhase + 1, MAX_PHASE) : 1
  const next: CardProgress = {
    user_id: userId,
    card_id: cardId,
    phase,
    due_date: phase >= MAX_PHASE ? null : addDays(intervals[phase - 1] ?? 1),
    correct_count: (existing?.correct_count ?? 0) + (correct ? 1 : 0),
    wrong_count: (existing?.wrong_count ?? 0) + (correct ? 0 : 1),
    updated_at: new Date().toISOString(),
    dirty: 1,
  }
  await db.progress.put(next)
  return phase
}

export const XP_PER_CORRECT = 10

/** Schreibt XP/Level/Streak aufs Profil (dirty, wird beim Sync hochgeladen). */
export async function awardXp(userId: string, xp: number) {
  const profile = await db.profiles.get(userId)
  if (!profile) return
  const t = today()
  let streak = profile.streak_days
  if (profile.last_learned_at !== t) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    streak = profile.last_learned_at === yesterday.toISOString().slice(0, 10) ? streak + 1 : 1
  }
  const total = profile.xp + xp
  await db.profiles.put({
    ...profile,
    xp: total,
    level: Math.floor(total / 500) + 1,
    streak_days: streak,
    last_learned_at: t,
    updated_at: new Date().toISOString(),
    dirty: 1,
  })
}

export function levelProgress(xp: number): number {
  return (xp % 500) / 500
}
