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

const XLSX_PATH = process.argv[2] ?? 'Vokabeln_GreenLine_BW2016_gesamt.xlsx'

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

/* Offizielle Abschnittstitel je Band. Band 2+3: Green Line BW (Ausgabe 2016),
   Band 1/4/5: Green Line Bundesausgabe 2014 (für BW nicht separat erschienen).
   Quelle: Klett-Stoffverteilungspläne (assets.klett.de) + Produktseiten. */
const BAND_TITLES: Record<number, Record<string, string>> = {
  1: {
    PUA: "Pick-up A: I'm from Greenwich",
    PUB: 'Pick-up B: This is fun!',
    U1: "It's fun at home",
    U2: "I'm new at TTS",
    U3: 'I like my busy days',
    U4: "Let's do something fun",
    U5: "Let's go shopping",
    U6: "It's my party",
    AC1: 'Across cultures 1',
    AC2: 'Across cultures 2',
    AC3: 'Across cultures 3',
  },
  2: {
    U1: 'My friends and I',
    U2: 'London is amazing!',
    U3: 'Sport is good for you!',
    U4: 'Stay in touch',
    U5: 'Goodbye Greenwich',
    AC1: "Across cultures 1: Let's discover TTS!",
    AC2: 'Across cultures 2: London: A special city',
    AC3: 'Across cultures 3: English around the world',
    AC4: 'Across cultures 4: British stories and legends',
  },
  3: {
    U1: 'Find your place',
    U2: "Let's go to Scotland",
    U3: 'What was it like?',
    U4: 'On the move',
    TS1: 'Text smart 1: Poems and songs',
    TS2: 'Text smart 2: Factual texts',
    TS3: 'Text smart 3: Fictional texts',
    TS4: 'Text smart 4: Drama',
    AC1: 'Across cultures 1: Reacting to a new situation',
    AC2: 'Across cultures 2: Making small talk',
    AC3: "Across cultures 3: Dos and don'ts",
  },
  4: {
    U1: 'Kids in America',
    U2: 'City of dreams: New York',
    U3: 'A nation invents itself',
    U4: 'The Pacific Northwest',
    TS1: 'Text smart 1: Advertisements',
    TS2: 'Text smart 2: Internet texts',
    TS3: 'Text smart 3: Travel texts',
    AC1: 'Across cultures 1: The USA: Country of contrasts',
    AC2: 'Across cultures 2: School life – dos and don’ts',
    AC3: 'Across cultures 3: What you say and how you say it',
    AC4: 'Across cultures 4: At home with an American family',
  },
  5: {
    U1: "G'day Australia!",
    U2: 'The good life?',
    U3: 'California dreaming',
    TS1: 'Text smart 1: A short film',
    TS2: 'Text smart 2: Informative texts',
    TS3: 'Text smart 3: Argumentative texts',
    AC1: 'Across cultures 1: The world speaks English',
    AC2: 'Across cultures 2: The language of tolerance and respect',
    AC3: 'Across cultures 3: Having a voice',
  },
}

/* Teilabschnitte innerhalb einer Lektion (zweite Spalte der Klett-Vokabellisten) */
const PART_NAMES: Record<string, string> = {
  CI: 'Check-in',
  S1: 'Station 1',
  S2: 'Station 2',
  S3: 'Station 3',
  ST: 'Story',
  ST1: 'Story 1',
  ST2: 'Story 2',
  STA: 'Story A',
  STB: 'Story B',
  SK: 'Skills',
  SK1: 'Skills 1',
  SK2: 'Skills 2',
  SK3: 'Skills 3',
  UT: 'Unit task',
  UT1: 'Unit task 1',
  UT2: 'Unit task 2',
  CO: 'Check-out',
  IN: 'Introduction',
  FP: 'Focus',
  FP1: 'Focus 1',
  FP2: 'Focus 2',
  F1: 'Part 1',
  F2: 'Part 2',
  SC1: 'Scene 1',
  SC2: 'Scene 2',
  SC3: 'Scene 3',
  SC4: 'Scene 4',
  OP: 'Extras',
}

/** Anzeigename einer Lektion: Langname aus dem Blatt „Lektionen" (falls
    vorhanden, als manueller Override), sonst Band-Titel + Teilabschnitt,
    sonst der Code selbst. Codes: "U1 S2", "AC1", "TS4 SC2", "PUA" … */
function lessonName(bookId: number, code: string, sheetNames: Map<string, string>): string {
  const fromSheet = sheetNames.get(code)
  if (fromSheet) return fromSheet
  const [base, part] = code.split(/\s+/) as [string, string?]
  const title = (BAND_TITLES[bookId] ?? {})[base]
  if (!title) return code
  const display = /^U\d$/.test(base) ? `Unit ${base.slice(1)}: ${title}` : title
  return part ? `${display} · ${PART_NAMES[part] ?? part}` : display
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
