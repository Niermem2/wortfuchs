import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarClock, Flame, Star, Trophy } from 'lucide-react'
import type { Card, CardProgress, Lesson, Session } from '../data/types'
import { db } from '../data/db'
import { MAX_PHASE } from '../learn/srs'
import {
  aggregate,
  bestWeekXp,
  cardsPerDay,
  localDay,
  longestStreak,
  sessionsInRange,
  weekRange,
} from '../learn/stats'
import { VERBS } from '../learn/verbs'
import { ProgressBar } from '../components/ui'
import { Heatmap } from '../components/Heatmap'
import './screens.css'

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const PHASE_LABELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'Gold']
const MODE_LABELS: Record<Session['mode'], string> = {
  learn: 'Gelernt',
  test: 'Geübt',
  verbs: 'Verben',
}
const VIEWS = [
  { id: 'week', label: 'Woche' },
  { id: 'state', label: 'Lernstand' },
  { id: 'words', label: 'Wörter' },
  { id: 'history', label: 'Verlauf' },
] as const
type View = (typeof VIEWS)[number]['id']

function Trend({ now, before }: { now: number; before: number }) {
  if (before === 0) return null
  const diff = now - before
  if (diff === 0) return <span className="report__trend">±0</span>
  return (
    <span className={`report__trend ${diff > 0 ? 'report__trend--up' : 'report__trend--down'}`}>
      {diff > 0 ? '▲' : '▼'} {Math.abs(diff)}
    </span>
  )
}

function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

function relativeDay(iso: string): string {
  const days = Math.round(
    (new Date(localDay(new Date())).getTime() - new Date(localDay(new Date(iso))).getTime()) /
      86400000,
  )
  if (days <= 0) return 'heute'
  if (days === 1) return 'gestern'
  return `vor ${days} Tagen`
}

export function FamilyScreen() {
  const [childId, setChildId] = useState<string | null>(null)
  const [view, setView] = useState<View>('week')

  const children = useLiveQuery(
    async () =>
      (await db.profiles.filter((p) => p.role === 'child').toArray()).sort((a, b) =>
        a.display_name.localeCompare(b.display_name),
      ),
    [],
  )
  const child = children?.find((c) => c.id === childId) ?? children?.[0]

  const sessions = useLiveQuery(
    () => (child ? db.sessions.where('user_id').equals(child.id).toArray() : []),
    [child?.id],
  )
  const progress = useLiveQuery(
    () => (child ? db.progress.where('user_id').equals(child.id).toArray() : []),
    [child?.id],
  )
  const verbProgress = useLiveQuery(
    () => (child ? db.verbProgress.where('user_id').equals(child.id).toArray() : []),
    [child?.id],
  )
  const catalog = useLiveQuery(async () => {
    const [cards, lessons, books] = await Promise.all([
      db.cards.toArray(),
      db.lessons.toArray(),
      db.books.orderBy('sort_order').toArray(),
    ])
    return {
      cards: new Map(cards.map((c) => [c.id, c])),
      lessons: new Map(lessons.map((l) => [l.id, l])),
      books,
    }
  }, [])

  if (children && children.length === 0) {
    return (
      <div className="screen">
        <h1>Fortschritt</h1>
        <div className="card">
          <p>Noch keine Kinder-Accounts angelegt.</p>
        </div>
      </div>
    )
  }
  if (!child || !sessions || !progress || !catalog) {
    return (
      <div className="screen">
        <h1>Fortschritt</h1>
      </div>
    )
  }

  return (
    <div className="screen">
      <h1>Fortschritt</h1>

      {children!.length > 1 && (
        <div className="cards__books">
          {children!.map((c) => (
            <button
              key={c.id}
              className={`cards__book ${c.id === child.id ? 'cards__book--active' : ''}`}
              onClick={() => setChildId(c.id)}
            >
              {c.display_name}
            </button>
          ))}
        </div>
      )}

      <div className="cards__books family__views">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            className={`cards__book ${view === v.id ? 'cards__book--active' : ''}`}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'week' && <WeekView child={child} sessions={sessions} progress={progress} />}
      {view === 'state' && (
        <StateView progress={progress} catalog={catalog} verbProgress={verbProgress ?? []} />
      )}
      {view === 'words' && <WordsView progress={progress} catalog={catalog} />}
      {view === 'history' && <HistoryView sessions={sessions} progress={progress} />}
    </div>
  )
}

type Catalog = {
  cards: Map<string, Card>
  lessons: Map<number, Lesson>
  books: { id: number; name: string; sort_order: number }[]
}
type ProgressRow = CardProgress

/* ---- Woche: Was lief diese Woche, was steht an ---- */

function WeekView({
  child,
  sessions,
  progress,
}: {
  child: { streak_days: number }
  sessions: Session[]
  progress: ProgressRow[]
}) {
  const thisRange = weekRange(0)
  const week = aggregate(sessionsInRange(sessions, thisRange.start, thisRange.end))
  const prevRange = weekRange(-1)
  const prev = aggregate(sessionsInRange(sessions, prevRange.start, prevRange.end))
  const perDay = cardsPerDay(sessions, thisRange.start)
  const maxPerDay = Math.max(1, ...perDay)
  const today = localDay(new Date())

  const quote = week.cardsSeen > 0 ? Math.round((week.cardsCorrect / week.cardsSeen) * 100) : null
  const prevQuote = prev.cardsSeen > 0 ? Math.round((prev.cardsCorrect / prev.cardsSeen) * 100) : 0

  const lastSession = [...sessions].sort((a, b) => b.started_at.localeCompare(a.started_at))[0]

  const day = (offset: number) => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    return localDay(d)
  }
  let dueToday = 0
  let dueTomorrow = 0
  let dueWeek = 0
  for (const p of progress) {
    if (p.phase >= MAX_PHASE || !p.due_date) continue
    if (p.due_date <= today) dueToday++
    else if (p.due_date === day(1)) dueTomorrow++
    if (p.due_date > today && p.due_date <= day(7)) dueWeek++
  }

  return (
    <>
      <div className="card family__child">
        <div className="family__head">
          <h3>Diese Woche</h3>
          <span className="ranking__stat">
            <Flame size={16} /> {child.streak_days}
          </span>
        </div>
        <div className="family__week">
          <div className="family__stat">
            <span className="family__num">{Math.round(week.durationSec / 60)}</span>
            <span className="caption">Minuten</span>
            <Trend now={Math.round(week.durationSec / 60)} before={Math.round(prev.durationSec / 60)} />
          </div>
          <div className="family__stat">
            <span className="family__num">{week.cardsSeen}</span>
            <span className="caption">Karten</span>
            <Trend now={week.cardsSeen} before={prev.cardsSeen} />
          </div>
          <div className="family__stat">
            <span className="family__num">{quote === null ? '–' : `${quote}%`}</span>
            <span className="caption">Richtig</span>
            {quote !== null && <Trend now={quote} before={prevQuote} />}
          </div>
          <div className="family__stat">
            <span className="family__num">{week.sessions}</span>
            <span className="caption">Runden</span>
            <Trend now={week.sessions} before={prev.sessions} />
          </div>
        </div>

        <span className="caption">Karten pro Tag</span>
        <div className="home__phases report__days">
          {perDay.map((n, i) => {
            const d = new Date(thisRange.start)
            d.setDate(d.getDate() + i)
            const isToday = localDay(d) === today
            return (
              <div key={i} className="home__phase">
                <div className="home__phase-bar">
                  <div
                    className={`home__phase-fill ${isToday ? 'report__day--today' : ''}`}
                    style={{ height: `${Math.max(n > 0 ? 8 : 0, (n / maxPerDay) * 100)}%` }}
                  />
                </div>
                <span className="home__phase-num">{n}</span>
                <span className={`home__phase-label ${isToday ? 'report__label--today' : ''}`}>
                  {DAY_LABELS[i]}
                </span>
              </div>
            )
          })}
        </div>

        <p className="home__sub">
          {lastSession
            ? `Zuletzt gelernt ${relativeDay(lastSession.started_at)}.`
            : 'Noch keine Lernrunde gestartet.'}
        </p>
      </div>

      <div className="card family__child">
        <div className="family__head">
          <h3>Anstehende Wiederholungen</h3>
          <CalendarClock size={18} className="family__icon" />
        </div>
        <div className="family__week family__week--three">
          <div className="family__stat">
            <span className="family__num">{dueToday}</span>
            <span className="caption">Heute fällig</span>
          </div>
          <div className="family__stat">
            <span className="family__num">{dueTomorrow}</span>
            <span className="caption">Morgen</span>
          </div>
          <div className="family__stat">
            <span className="family__num">{dueWeek}</span>
            <span className="caption">Nächste 7 Tage</span>
          </div>
        </div>
        {dueToday > 20 && (
          <p className="home__sub">
            Es hat sich einiges angesammelt — heute wäre ein guter Lerntag.
          </p>
        )}
      </div>
    </>
  )
}

/* ---- Lernstand: Wo steht das Kind im Stoff ---- */

function StateView({
  progress,
  catalog,
  verbProgress,
}: {
  progress: ProgressRow[]
  catalog: Catalog
  verbProgress: { verb: string; streak: number; wrong_count: number }[]
}) {
  const phaseCounts = Array.from({ length: MAX_PHASE }, () => 0)
  for (const p of progress) phaseCounts[Math.min(p.phase, MAX_PHASE) - 1]++
  const started = progress.length
  const gold = phaseCounts[MAX_PHASE - 1]
  const maxPhase = Math.max(1, ...phaseCounts)

  // Je Buch: begonnen / gesamt / Gold
  const lessonToBook = new Map<number, number>()
  for (const l of catalog.lessons.values()) lessonToBook.set(l.id, l.book_id)
  const perBook = new Map<number, { total: number; started: number; gold: number }>()
  for (const b of catalog.books) perBook.set(b.id, { total: 0, started: 0, gold: 0 })
  for (const c of catalog.cards.values()) {
    const stats = perBook.get(lessonToBook.get(c.lesson_id) ?? -1)
    if (stats) stats.total++
  }
  for (const p of progress) {
    const card = catalog.cards.get(p.card_id)
    const stats = card && perBook.get(lessonToBook.get(card.lesson_id) ?? -1)
    if (!stats) continue
    stats.started++
    if (p.phase >= MAX_PHASE) stats.gold++
  }

  // Zuletzt bearbeitete Lektionen (nach jüngstem Fortschritt)
  const perLesson = new Map<number, { started: number; gold: number; last: string }>()
  for (const p of progress) {
    const card = catalog.cards.get(p.card_id)
    if (!card) continue
    const entry = perLesson.get(card.lesson_id) ?? { started: 0, gold: 0, last: '' }
    entry.started++
    if (p.phase >= MAX_PHASE) entry.gold++
    if (p.updated_at > entry.last) entry.last = p.updated_at
    perLesson.set(card.lesson_id, entry)
  }
  const lessonTotals = new Map<number, number>()
  for (const c of catalog.cards.values()) {
    lessonTotals.set(c.lesson_id, (lessonTotals.get(c.lesson_id) ?? 0) + 1)
  }
  const recentLessons = [...perLesson.entries()]
    .sort((a, b) => b[1].last.localeCompare(a[1].last))
    .slice(0, 5)
    .map(([id, stats]) => ({ lesson: catalog.lessons.get(id), stats, total: lessonTotals.get(id) ?? 0 }))
    .filter((r) => r.lesson)

  const verbsMastered = verbProgress.filter((v) => v.streak >= 3).length
  const verbsWeak = verbProgress
    .filter((v) => v.wrong_count > 0 && v.streak < 3)
    .sort((a, b) => a.streak - b.streak || b.wrong_count - a.wrong_count)
    .slice(0, 3)

  return (
    <>
      <div className="card family__child">
        <h3>Phasensystem</h3>
        <p className="home__sub">
          {started} Vokabeln begonnen · {gold} sicher im Langzeitgedächtnis
        </p>
        {started > 0 && (
          <div className="home__phases">
            {phaseCounts.map((n, i) => (
              <div key={i} className="home__phase">
                <div className="home__phase-bar">
                  <div
                    className={`home__phase-fill ${i === MAX_PHASE - 1 ? 'home__phase-fill--done' : ''}`}
                    style={{ height: `${Math.max(n > 0 ? 8 : 0, (n / maxPhase) * 100)}%` }}
                  />
                </div>
                <span className="home__phase-num">{n}</span>
                <span className="home__phase-label">{PHASE_LABELS[i]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card family__child">
        <h3>Bücher</h3>
        {catalog.books.map((b) => {
          const stats = perBook.get(b.id)!
          if (stats.total === 0) return null
          return (
            <div key={b.id} className="family__book">
              <div className="family__book-head">
                <span className="family__book-name">{b.name}</span>
                <span className="home__sub">
                  {stats.started}/{stats.total}
                  {stats.gold > 0 && ` · ${stats.gold} Gold`}
                </span>
              </div>
              <ProgressBar value={stats.started} max={stats.total} />
            </div>
          )
        })}
      </div>

      {recentLessons.length > 0 && (
        <div className="card family__child">
          <h3>Zuletzt bearbeitete Lektionen</h3>
          {recentLessons.map(({ lesson, stats, total }) => (
            <div key={lesson!.id} className="family__book">
              <div className="family__book-head">
                <span className="family__book-name">{lesson!.name}</span>
                <span className="cards__code">{lesson!.code}</span>
              </div>
              <div className="family__book-head">
                <ProgressBar value={stats.started} max={total} />
                <span className="home__sub family__book-count">
                  {stats.started}/{total}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card family__child">
        <h3>Unregelmäßige Verben</h3>
        <p className="home__sub">
          {verbsMastered} von {VERBS.length} gemeistert
          {verbsWeak.length > 0 && ` · wackelig: ${verbsWeak.map((v) => v.verb).join(', ')}`}
        </p>
        <ProgressBar value={verbsMastered} max={VERBS.length} />
      </div>
    </>
  )
}

/* ---- Wörter: Was hakt, was sitzt frisch ---- */

function WordsView({ progress, catalog }: { progress: ProgressRow[]; catalog: Catalog }) {
  const hard = progress
    .filter((p) => p.wrong_count >= 2 && p.phase < MAX_PHASE)
    .sort((a, b) => b.wrong_count - a.wrong_count || a.phase - b.phase)
    .slice(0, 20)
    .map((p) => ({ p, card: catalog.cards.get(p.card_id) }))
    .filter((x) => x.card)

  const freshGold = progress
    .filter((p) => p.phase >= MAX_PHASE)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5)
    .map((p) => catalog.cards.get(p.card_id))
    .filter((c): c is Card => !!c)

  return (
    <>
      <div className="card family__child">
        <h3>Schwierige Wörter</h3>
        {hard.length === 0 ? (
          <p className="home__sub">Gerade keine Problemwörter — läuft.</p>
        ) : (
          <>
            <p className="home__sub">
              Mehrfach falsch beantwortet — ideal zum gemeinsamen Abfragen.
            </p>
            <div className="family__hard">
              {hard.map(({ p, card }) => (
                <div key={card!.id} className="family__hard-row family__hard-row--wide">
                  <span className="family__hard-word">
                    <b>{card!.english}</b> — {card!.german}
                  </span>
                  <span className="home__sub family__hard-meta">
                    {catalog.lessons.get(card!.lesson_id)?.code} · Phase {p.phase} · {p.wrong_count}×
                    falsch
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {freshGold.length > 0 && (
        <div className="card family__child">
          <h3>Frisch in Gold</h3>
          <p className="home__sub">Zuletzt ins Langzeitgedächtnis gewandert.</p>
          <div className="family__hard">
            {freshGold.map((card) => (
              <div key={card.id} className="family__hard-row">
                <span>
                  <b>{card.english}</b> — {card.german}
                </span>
                <Star size={16} className="family__gold-star" />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

/* ---- Verlauf: Aktivität über die Zeit ---- */

function HistoryView({ sessions, progress }: { sessions: Session[]; progress: ProgressRow[] }) {
  const byDay = new Map<string, number>()
  for (const s of sessions) {
    const key = localDay(new Date(s.started_at))
    byDay.set(key, (byDay.get(key) ?? 0) + s.cards_seen)
  }
  const recent = [...sessions].sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, 15)
  const gold = progress.filter((p) => p.phase >= MAX_PHASE).length

  return (
    <>
      {byDay.size > 0 && (
        <div className="card">
          <h3>Aktivität</h3>
          <p className="home__sub">Karten pro Tag, letzte 12 Wochen</p>
          <div className="home__heatmap">
            <Heatmap byDay={byDay} />
          </div>
        </div>
      )}

      <div className="card family__child">
        <h3>Letzte Lernrunden</h3>
        {recent.length === 0 ? (
          <p className="home__sub">Noch keine Lernrunden.</p>
        ) : (
          <div className="family__log">
            {recent.map((s) => {
              const quote = s.cards_seen > 0 ? Math.round((s.cards_correct / s.cards_seen) * 100) : 0
              return (
                <div key={s.id} className="family__log-row">
                  <span className="family__log-date">{fmtDay(s.started_at)}</span>
                  <span className="family__log-mode">{MODE_LABELS[s.mode]}</span>
                  <span className="home__sub">
                    {Math.max(1, Math.round(s.duration_sec / 60))} min · {s.cards_seen} Karten ·{' '}
                    {quote}%
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card family__child">
        <h3>Rekorde</h3>
        <div className="report__records">
          <div className="report__record">
            <Flame size={18} />
            <span>Längste Lern-Serie</span>
            <b>
              {longestStreak(sessions)} {longestStreak(sessions) === 1 ? 'Tag' : 'Tage'}
            </b>
          </div>
          <div className="report__record">
            <Star size={18} />
            <span>Beste Woche</span>
            <b>{bestWeekXp(sessions)} XP</b>
          </div>
          <div className="report__record">
            <Trophy size={18} />
            <span>Im Langzeitgedächtnis</span>
            <b>{gold} Vokabeln</b>
          </div>
        </div>
      </div>
    </>
  )
}
