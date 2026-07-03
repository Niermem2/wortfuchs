import type { ThemeId, Mode, MascotId } from '../theme/presets'

export interface Book {
  id: number
  name: string
  sort_order: number
}

export interface Lesson {
  id: number
  book_id: number
  code: string
  name: string
  sort_order: number
}

export interface Card {
  id: string
  lesson_id: number
  english: string
  phonetic: string | null
  german: string
  example_en: string | null
  example_de: string | null
  note: string | null
  is_custom: boolean
  active: boolean
  updated_at: string
  /** nur lokal: 1 = wartet auf Upload */
  dirty?: 0 | 1
}

export interface CardProgress {
  user_id: string
  card_id: string
  phase: number
  due_date: string | null
  correct_count: number
  wrong_count: number
  updated_at: string
  dirty: 0 | 1
}

export interface Session {
  id: string
  user_id: string
  started_at: string
  duration_sec: number
  cards_seen: number
  cards_correct: number
  xp_earned: number
  mode: 'learn' | 'test' | 'verbs'
  dirty: 0 | 1
}

export interface VerbProgress {
  user_id: string
  verb: string
  streak: number
  correct_count: number
  wrong_count: number
  updated_at: string
  dirty: 0 | 1
}

export interface Profile {
  id: string
  role: 'child' | 'parent'
  display_name: string
  xp: number
  level: number
  streak_days: number
  last_learned_at: string | null
  updated_at: string
  dirty: 0 | 1
}

export type Direction = 'de-en' | 'en-de' | 'mixed'
export type InputMode = 'type' | 'choice' | 'reveal'

export interface SettingsData {
  appName: string
  theme: ThemeId
  mode: Mode
  mascot: MascotId
  direction: Direction
  inputMode: InputMode
  typoTolerance: boolean
  autoAudio: boolean
  dailyGoal: number
  /** Wiederholungsabstände in Tagen je Phase (Index 0 = Phase 1) */
  intervals: number[]
  activeLessons: number[]
  /** Aktive Testvorbereitung (Lektionen + optionales Zieldatum) */
  testPrep: { lessons: number[]; date: string | null } | null
}

export interface Settings {
  user_id: string
  data: SettingsData
  updated_at: string
  dirty: 0 | 1
}

export const DEFAULT_SETTINGS: SettingsData = {
  appName: 'Wortfuchs',
  theme: 'grape',
  mode: 'auto',
  mascot: 'fox',
  direction: 'de-en',
  inputMode: 'choice',
  typoTolerance: true,
  autoAudio: false,
  dailyGoal: 20,
  intervals: [0, 1, 3, 9, 30, 90],
  activeLessons: [],
  testPrep: null,
}
