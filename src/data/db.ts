import Dexie, { type EntityTable } from 'dexie'
import type { Book, Lesson, Card, CardProgress, Session, Profile, Settings } from './types'

/* Einzige Datenquelle fürs UI. Supabase wird nur vom Sync-Layer angefasst. */

export const db = new Dexie('wortfuchs') as Dexie & {
  books: EntityTable<Book, 'id'>
  lessons: EntityTable<Lesson, 'id'>
  cards: EntityTable<Card, 'id'>
  progress: Dexie.Table<CardProgress, [string, string]>
  sessions: EntityTable<Session, 'id'>
  profiles: EntityTable<Profile, 'id'>
  settings: EntityTable<Settings, 'user_id'>
  meta: Dexie.Table<{ key: string; value: string }, string>
}

db.version(1).stores({
  books: 'id, sort_order',
  lessons: 'id, book_id',
  cards: 'id, lesson_id, updated_at',
  progress: '[user_id+card_id], user_id, due_date, dirty',
  sessions: 'id, user_id, started_at, dirty',
  profiles: 'id',
  settings: 'user_id',
  meta: 'key',
})
