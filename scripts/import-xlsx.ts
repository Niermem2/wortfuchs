/**
 * Importiert die Green-Line-Excel nach Supabase (idempotent, Re-Import möglich).
 *
 * Voraussetzungen (.env im Projektordner):
 *   SUPABASE_URL=https://<projekt>.supabase.co
 *   SUPABASE_SERVICE_KEY=<service_role key>   (Settings → API, niemals committen)
 *
 * Aufruf: npm run import [-- pfad/zur/datei.xlsx]
 */
import 'dotenv/config'
import ExcelJS from 'exceljs'
import { createClient } from '@supabase/supabase-js'

const XLSX_PATH = process.argv[2] ?? 'Vokabeln_GreenLine_2021_gesamt.xlsx'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY
if (!url || !key) {
  console.error('SUPABASE_URL und SUPABASE_SERVICE_KEY in .env setzen.')
  process.exit(1)
}
const supabase = createClient(url, key)

interface Row {
  band: string
  lesson: string
  english: string
  phonetic: string
  german: string
  exampleEn: string
  exampleDe: string
}

/* Offizielle Abschnittstitel je Band (Quelle: Klett-Produktseiten „Buchaufbau",
   ISBN 978-3-12-864010-5 / -864020-4 / -864030-3 / -864040-2) */
const BAND_TITLES: Record<number, Record<string, string>> = {
  1: {
    U1: 'A new school',
    U2: 'At home',
    U3: 'Our Greenwich',
    U4: 'Happy Birthday',
    AC1: 'Across cultures 1: Greenwich: A special corner of London',
    AC2: 'Across cultures 2: How does it taste?',
    MS1: 'Media smart: Writing texts on computers',
  },
  2: {
    U1: 'The new boy',
    U2: 'London: Wow!',
    U3: 'Star of the internet',
    U4: "What's your sport?",
    U5: 'Scotland, here we come!',
    AC1: 'Across cultures 1: London: A world city',
    AC2: 'Across cultures 2: Special days in the British Isles',
    MS1: 'Media smart: Searching for information online',
  },
  3: {
    U1: 'The weekend workshop',
    U2: 'Welcome to Wales – Croeso i Gymru',
    U3: 'The Emerald Isle',
    U4: 'Faces of Britain',
    AC1: 'Across cultures 1: The British Isles',
    AC2: 'Across cultures 2: Staying with a host family',
    MS: 'Media smart: The power of pictures',
    TS1: 'Text smart 1: Lyrical texts',
    TS2: 'Text smart 2: Factual texts',
    TR: 'Trailer: A trip to Dublin',
  },
  4: {
    U1: 'New York City: The Big Apple',
    U2: 'A new life in New England',
    U3: 'The Desert Southwest',
    U4: "California — Pacific 'paradise'?",
    AC1: 'Across cultures 1: A first look at the USA',
    AC2: 'Across cultures 2: Schools in the US',
    AC3: 'Across cultures 3: Indigenous Americans',
    MS: 'Media smart: The framing effect',
    TS1: 'Text smart 1: Visual texts',
    TS2: 'Text smart 2: Fictional texts',
  },
}

/** Anzeigename einer Lektion: offizieller Band-Titel, sonst Langname aus dem
    Blatt „Lektionen", sonst der Code selbst. */
function lessonName(bookId: number, code: string, sheetNames: Map<string, string>): string {
  const titles = BAND_TITLES[bookId] ?? {}
  const unit = code.match(/^(U\d)(?:\s+(.+))?$/)
  if (!unit && titles[code]) return titles[code]
  if (unit && titles[unit[1]]) {
    const sheetName = sheetNames.get(code)
    // Teil-Bezeichnung („Station 1", „Check-in" …) aus dem Blatt-Langnamen
    const part = sheetName?.match(/^Unit \d: (.+)$/)?.[1]
    const base = `Unit ${unit[1].slice(1)}: ${titles[unit[1]]}`
    return part ? `${base} · ${part}` : base
  }
  return sheetNames.get(code) ?? code
}

async function readRows(): Promise<{ rows: Row[]; lessonNames: Map<string, string> }> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(XLSX_PATH)

  // Blatt „Lektionen": Code → Langname (+ Beschreibung, aktuell ungenutzt)
  const lessonNames = new Map<string, string>()
  const namesSheet = wb.getWorksheet('Lektionen') ?? wb.getWorksheet('Tabelle1')
  namesSheet?.eachRow((row, n) => {
    if (n === 1) return
    const code = (row.getCell(1).text ?? '').trim()
    const name = (row.getCell(2).text ?? '').trim()
    if (code && name) lessonNames.set(code, name)
  })

  const ws = wb.getWorksheet('Vokabeln') ?? wb.worksheets[0]
  const rows: Row[] = []
  ws.eachRow((row, n) => {
    if (n === 1) return
    const cell = (i: number) => (row.getCell(i).text ?? '').trim()
    const r: Row = {
      band: cell(1),
      lesson: cell(2),
      english: cell(3),
      phonetic: cell(4),
      german: cell(5),
      exampleEn: cell(6),
      exampleDe: cell(7),
    }
    if (r.band && r.lesson && r.english && r.german) rows.push(r)
    else if (r.english || r.german) console.warn(`Zeile ${n} übersprungen (unvollständig):`, r)
  })
  return { rows, lessonNames }
}

async function main() {
  const { rows, lessonNames } = await readRows()
  console.log(`${rows.length} Vokabeln aus ${XLSX_PATH} gelesen, ${lessonNames.size} Lektionsnamen.`)

  const bandNames = [...new Set(rows.map((r) => r.band))].sort()
  const books = bandNames.map((name, i) => ({
    id: Number(name.replace(/\D/g, '')) || i + 1,
    name,
    sort_order: i,
  }))
  const bookId = new Map(books.map((b) => [b.name, b.id]))
  const { error: bookErr } = await supabase.from('books').upsert(books)
  if (bookErr) throw bookErr

  // Lektionen in Reihenfolge des ersten Auftretens je Band
  const lessonList: { book_id: number; code: string; sort_order: number }[] = []
  const seen = new Set<string>()
  for (const r of rows) {
    const k = `${r.band}|${r.lesson}`
    if (!seen.has(k)) {
      seen.add(k)
      const book = bookId.get(r.band)!
      lessonList.push({
        book_id: book,
        code: r.lesson,
        sort_order: lessonList.filter((l) => l.book_id === book).length,
      })
    }
  }
  const { error: lessonErr } = await supabase
    .from('lessons')
    .upsert(
      lessonList.map((l) => ({ ...l, name: lessonName(l.book_id, l.code, lessonNames) })),
      { onConflict: 'book_id,code' },
    )
  if (lessonErr) throw lessonErr

  const { data: lessons, error: fetchErr } = await supabase
    .from('lessons')
    .select('id, book_id, code')
  if (fetchErr) throw fetchErr
  const lessonId = new Map(lessons.map((l) => [`${l.book_id}|${l.code}`, l.id as number]))

  // Duplikate in der Excel (gleiche Lektion+EN+DE) zusammenführen — Postgres
  // erlaubt keine doppelten Konfliktwerte innerhalb eines Upsert-Batches
  const byKey = new Map<string, object>()
  for (const r of rows) {
    const lesson = lessonId.get(`${bookId.get(r.band)}|${r.lesson}`)!
    byKey.set(`${lesson}|${r.english}|${r.german}`, {
      lesson_id: lesson,
      english: r.english,
      phonetic: r.phonetic || null,
      german: r.german,
      example_en: r.exampleEn || null,
      example_de: r.exampleDe || null,
      is_custom: false,
    })
  }
  const cards = [...byKey.values()]
  if (cards.length < rows.length) {
    console.log(`${rows.length - cards.length} Duplikat(e) zusammengeführt, ${cards.length} eindeutige Karten.`)
  }

  for (let i = 0; i < cards.length; i += 500) {
    const batch = cards.slice(i, i + 500)
    const { error } = await supabase
      .from('cards')
      .upsert(batch, { onConflict: 'lesson_id,english,german', ignoreDuplicates: false })
    if (error) throw error
    console.log(`  ${Math.min(i + 500, cards.length)}/${cards.length} Karten übertragen`)
  }

  const { count } = await supabase.from('cards').select('*', { count: 'exact', head: true })
  console.log(`Fertig. Karten in der Datenbank: ${count}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
