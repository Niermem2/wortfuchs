import { db } from './db'
import type { SettingsData, Subject } from './types'

export const SUBJECTS: { id: Subject; label: string }[] = [
  { id: 'en', label: 'Englisch' },
  { id: 'la', label: 'Latein' },
  { id: 'es', label: 'Spanisch' },
]

export const SUBJECT_LABEL: Record<Subject, string> = {
  en: 'Englisch',
  la: 'Latein',
  es: 'Spanisch',
}

/** Für Latein gibt es keine Sprachausgabe. */
export function hasAudio(subject: Subject): boolean {
  return subject !== 'la'
}

/** Aktive Lektionen des gewählten Fachs. `activeLessons` bleibt eine
    gemeinsame Liste (Lektions-IDs sind eindeutig); gefiltert wird über
    die Sprache des zugehörigen Buchs. */
export async function activeLessonIds(
  settings: Pick<SettingsData, 'activeLessons' | 'subject'>,
  subject: Subject = settings.subject,
): Promise<number[]> {
  if (settings.activeLessons.length === 0) return []
  const [books, lessons] = await Promise.all([
    db.books.toArray(),
    db.lessons.bulkGet(settings.activeLessons),
  ])
  const lang = new Map(books.map((b) => [b.id, b.language ?? 'en']))
  return lessons
    .filter((l): l is NonNullable<typeof l> => !!l && lang.get(l.book_id) === subject)
    .map((l) => l.id)
}

/** Fächer, für die mindestens ein Buch vorhanden ist (Reihenfolge wie SUBJECTS). */
export async function availableSubjects(): Promise<Subject[]> {
  const books = await db.books.toArray()
  const present = new Set(books.map((b) => b.language ?? 'en'))
  return SUBJECTS.map((s) => s.id).filter((id) => present.has(id))
}
