/**
 * Importiert den Lateinwortschatz (Cursus A, C.C. Buchner) nach Supabase
 * (idempotent, Re-Import möglich).
 *
 * Eingabe: TSV mit drei Spalten je Zeile:  Lektion <TAB> Latein <TAB> Deutsch
 * Die Datei ist Quellmaterial und bleibt gitignored (seed/).
 *
 * Voraussetzungen (.env im Projektordner):
 *   SUPABASE_URL=https://<projekt>.supabase.co
 *   SUPABASE_SERVICE_KEY=<service_role key>   (Settings → API, niemals committen)
 * und die Migration 0004_book_language.sql ist eingespielt.
 *
 * Aufruf: npm run import:latin [-- pfad/zur/datei.tsv]
 */
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const TSV_PATH = process.argv[2] ?? 'seed/cursus-a.tsv'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
if (!url || !key) {
  console.error('SUPABASE_URL und SUPABASE_SERVICE_KEY in .env setzen.')
  process.exit(1)
}
const supabase = createClient(url, key)

/* Buch-ID weit weg von den Englisch-Bänden (1–5 und Camden Town). */
const BOOK = { id: 100, name: 'Cursus A (C.C. Buchner)', language: 'la', sort_order: 100 }

/* Lektionstitel laut Inhaltsverzeichnis. */
const TITLES: Record<number, string> = {
  23: 'Aeneas – von Troia nach Rom',
  24: 'Die Gründung Roms',
  25: 'Vom Königtum zur Republik',
  26: 'Rom in Gefahr',
  27: 'Hannibal',
  28: 'Cicero gegen Catilina',
  29: 'Caesar',
  30: 'Augustus',
  31: 'Nero',
  32: 'Konstantin',
  33: 'Olympia',
  34: 'Archimedes',
  35: 'Sokrates',
  36: 'Antike Medizin',
  37: 'Redekunst',
  38: 'Philosophie',
  39: 'Römisches Recht',
  40: 'Pompeji',
}

interface Row {
  lesson: number
  latin: string
  german: string
}

function readRows(): Row[] {
  const rows: Row[] = []
  readFileSync(TSV_PATH, 'utf8')
    .split(/\r?\n/)
    .forEach((line, i) => {
      if (!line.trim()) return
      const [lesson, latin, german] = line.split('\t').map((s) => s.trim())
      const n = Number(lesson)
      if (!Number.isInteger(n) || !latin || !german) {
        console.warn(`Zeile ${i + 1} übersprungen (unvollständig): ${line}`)
        return
      }
      rows.push({ lesson: n, latin, german })
    })
  return rows
}

async function main() {
  const rows = readRows()
  console.log(`${rows.length} Vokabeln aus ${TSV_PATH} gelesen.`)

  const { error: bookErr } = await supabase.from('books').upsert(BOOK)
  if (bookErr) throw bookErr

  const lessonNos = [...new Set(rows.map((r) => r.lesson))].sort((a, b) => a - b)
  const { error: lessonErr } = await supabase.from('lessons').upsert(
    lessonNos.map((n) => ({
      book_id: BOOK.id,
      code: `L${n}`,
      name: TITLES[n] ? `Lektion ${n}: ${TITLES[n]}` : `Lektion ${n}`,
      sort_order: n,
    })),
    { onConflict: 'book_id,code' },
  )
  if (lessonErr) throw lessonErr

  const { data: lessons, error: fetchErr } = await supabase
    .from('lessons')
    .select('id, code')
    .eq('book_id', BOOK.id)
  if (fetchErr) throw fetchErr
  const lessonId = new Map(lessons.map((l) => [l.code as string, l.id as number]))

  const byKey = new Map<string, object>()
  for (const r of rows) {
    const lesson = lessonId.get(`L${r.lesson}`)!
    byKey.set(`${lesson}|${r.latin}|${r.german}`, {
      lesson_id: lesson,
      english: r.latin, // Spalte heißt historisch „english“ = Fremdsprache
      german: r.german,
      is_custom: false,
    })
  }
  const cards = [...byKey.values()]
  for (let i = 0; i < cards.length; i += 500) {
    const { error } = await supabase
      .from('cards')
      .upsert(cards.slice(i, i + 500), { onConflict: 'lesson_id,english,german', ignoreDuplicates: false })
    if (error) throw error
    console.log(`  ${Math.min(i + 500, cards.length)}/${cards.length} Karten übertragen`)
  }
  console.log(`Fertig: ${lessonNos.length} Lektionen, ${cards.length} Karten.`)
  console.log(`Tipp: In der App unter „Karten" Lektion ${lessonNos[0]} aktivieren.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
