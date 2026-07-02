import type { Book, Lesson, Card } from './types'

/* Generische Beispielkarten für den lokalen Modus ohne Supabase.
   Bewusst KEINE Green-Line-Inhalte (Urheberrecht, siehe CLAUDE.md). */

export const DEMO_BOOK: Book = { id: 999, name: 'Demo', sort_order: 99 }

export const DEMO_LESSONS: Lesson[] = [
  { id: 9991, book_id: 999, code: 'Demo 1', name: 'Demo 1', sort_order: 0 },
  { id: 9992, book_id: 999, code: 'Demo 2', name: 'Demo 2', sort_order: 1 },
]

const ROWS: [number, string, string, string, string, string][] = [
  [9991, 'the house', 'das Haus', '[haʊs]', 'The house is big.', 'Das Haus ist groß.'],
  [9991, 'the dog', 'der Hund', '[dɒɡ]', 'The dog is fast.', 'Der Hund ist schnell.'],
  [9991, 'to run', 'laufen; rennen', '[rʌn]', 'I run to school.', 'Ich laufe zur Schule.'],
  [9991, 'the water', 'das Wasser', '[ˈwɔːtə]', 'The water is cold.', 'Das Wasser ist kalt.'],
  [9991, 'green', 'grün', '[ɡriːn]', 'The tree is green.', 'Der Baum ist grün.'],
  [9991, 'to read', 'lesen', '[riːd]', 'She reads a book.', 'Sie liest ein Buch.'],
  [9992, 'the window', 'das Fenster', '[ˈwɪndəʊ]', 'Open the window, please.', 'Öffne bitte das Fenster.'],
  [9992, 'the bread', 'das Brot', '[bred]', 'I eat bread with cheese.', 'Ich esse Brot mit Käse.'],
  [9992, 'to sing', 'singen', '[sɪŋ]', 'We sing a song.', 'Wir singen ein Lied.'],
  [9992, 'slow', 'langsam', '[sləʊ]', 'The bus is slow today.', 'Der Bus ist heute langsam.'],
  [9992, 'the friend', 'der Freund; die Freundin', '[frend]', 'My friend helps me.', 'Mein Freund hilft mir.'],
  [9992, 'to write', 'schreiben', '[raɪt]', 'He writes a letter.', 'Er schreibt einen Brief.'],
]

export const DEMO_CARDS: Card[] = ROWS.map(([lesson_id, english, german, phonetic, example_en, example_de], i) => ({
  id: `demo-${i + 1}`,
  lesson_id,
  english,
  german,
  phonetic,
  example_en,
  example_de,
  note: null,
  is_custom: false,
  active: true,
  updated_at: '2026-01-01T00:00:00Z',
}))
