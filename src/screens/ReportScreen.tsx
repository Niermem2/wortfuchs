import { activeLessonIds } from '../data/subjects'
import { useLiveQuery } from 'dexie-react-hooks'
import { Flame, Star, Trophy } from 'lucide-react'
import type { Card, Profile, SettingsData } from '../data/types'
import { db } from '../data/db'
import { MAX_PHASE } from '../learn/srs'
import {
  aggregate,
  bestWeekXp,
  cardsPerDay,
  longestStreak,
  sessionsInRange,
  weekRange,
} from '../learn/stats'
import { VERBS } from '../learn/verbs'
import { ProgressBar } from '../components/ui'
import { Heatmap } from '../components/Heatmap'
import { localDay } from '../learn/stats'
import './screens.css'

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const PHASE_LABELS = ['Neu', 'P1', 'P2', 'P3', 'P4', 'P5', 'Gelernt']

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

export function ReportScreen({
  profile,
  settings,
  onPractice,
}: {
  profile: Profile
  settings: SettingsData
  onPractice: (cards: Card[]) => void
}) {
  const sessions = useLiveQuery(
    () => db.sessions.where('user_id').equals(profile.id).toArray(),
    [profile.id],
  )

  const hardCards = useLiveQuery(async () => {
    const progress = await db.progress.where('user_id').equals(profile.id).toArray()
    const candidates = progress.filter((p) => p.wrong_count >= 2).sort((a, b) => b.wrong_count - a.wrong_count)
    const out: { card: Card; wrong: number }[] = []
    for (const p of candidates) {
      const card = await db.cards.get(p.card_id)
      if (card?.active) out.push({ card, wrong: p.wrong_count })
      if (out.length === 5) break
    }
    return out
  }, [profile.id])

  const phaseStats = useLiveQuery(async () => {
    const ids = await activeLessonIds(settings)
    if (ids.length === 0) return null
    const cards = await db.cards.where('lesson_id').anyOf(ids).toArray()
    const progress = await db.progress.where('user_id').equals(profile.id).toArray()
    const byCard = new Map(progress.map((p) => [p.card_id, p.phase]))
    const counts = Array.from({ length: MAX_PHASE + 1 }, () => 0)
    for (const c of cards) counts[byCard.get(c.id) ?? 0]++
    return { counts, total: cards.length }
  }, [profile.id, settings])

  const verbStats = useLiveQuery(async () => {
    const progress = await db.verbProgress.where('user_id').equals(profile.id).toArray()
    const mastered = progress.filter((v) => v.streak >= 3).length
    const weakest = progress
      .filter((v) => v.wrong_count > 0)
      .sort((a, b) => a.streak - b.streak || b.wrong_count - a.wrong_count)[0]
    return { mastered, weakest }
  }, [profile.id])

  if (!sessions) return null

  const thisRange = weekRange(0)
  const week = aggregate(sessionsInRange(sessions, thisRange.start, thisRange.end))
  const prevRange = weekRange(-1)
  const prev = aggregate(sessionsInRange(sessions, prevRange.start, prevRange.end))
  const perDay = cardsPerDay(sessions, thisRange.start)
  const maxPerDay = Math.max(1, ...perDay)
  const today = localDay(new Date())

  const quote = week.cardsSeen > 0 ? Math.round((week.cardsCorrect / week.cardsSeen) * 100) : null
  const prevQuote = prev.cardsSeen > 0 ? Math.round((prev.cardsCorrect / prev.cardsSeen) * 100) : 0

  const activityByDay = new Map<string, number>()
  for (const s of sessions) {
    const key = localDay(new Date(s.started_at))
    activityByDay.set(key, (activityByDay.get(key) ?? 0) + s.cards_seen)
  }

  const records = {
    streak: longestStreak(sessions),
    bestWeek: bestWeekXp(sessions),
    longTerm: phaseStats?.counts[MAX_PHASE] ?? 0,
  }

  return (
    <div className="screen">
      <h1>Fortschritt</h1>

      <div className="card family__child">
        <h3>Diese Woche</h3>
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
            <span className="family__num">{week.xp}</span>
            <span className="caption">XP</span>
            <Trend now={week.xp} before={prev.xp} />
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
      </div>

      <div className="card family__child">
        <h3>Deine kniffligen Wörter</h3>
        {hardCards && hardCards.length > 0 ? (
          <>
            <div className="family__hard">
              {hardCards.map(({ card, wrong }) => (
                <div key={card.id} className="family__hard-row">
                  <span>
                    <b>{card.english}</b> — {card.german}
                  </span>
                  <span className="home__sub">{wrong}× falsch</span>
                </div>
              ))}
            </div>
            <button className="btn btn--secondary" onClick={() => onPractice(hardCards.map((h) => h.card))}>
              Diese Wörter üben
            </button>
          </>
        ) : (
          <p className="home__sub">Nichts hakt gerade — stark!</p>
        )}
      </div>

      {phaseStats && phaseStats.total > 0 && (
        <div className="card">
          <h3>Dein Phasensystem</h3>
          <p className="home__sub">
            {phaseStats.counts[MAX_PHASE]} von {phaseStats.total} Vokabeln im Langzeitgedächtnis
          </p>
          <div className="home__phases">
            {phaseStats.counts.map((n, i) => (
              <div key={i} className="home__phase">
                <div className="home__phase-bar">
                  <div
                    className={`home__phase-fill ${i === MAX_PHASE ? 'home__phase-fill--done' : ''}`}
                    style={{ height: `${Math.max(n > 0 ? 8 : 0, (n / phaseStats.total) * 100)}%` }}
                  />
                </div>
                <span className="home__phase-num">{n}</span>
                <span className="home__phase-label">{PHASE_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activityByDay.size > 0 && (
        <div className="card">
          <h3>Deine Aktivität</h3>
          <p className="home__sub">Karten pro Tag, letzte 12 Wochen</p>
          <div className="home__heatmap">
            <Heatmap byDay={activityByDay} />
          </div>
        </div>
      )}

      <div className="card family__child">
        <h3>Unregelmäßige Verben</h3>
        <p className="home__sub">
          {verbStats?.mastered ?? 0} von {VERBS.length} gemeistert
          {verbStats?.weakest && ` · Übe mal wieder: ${verbStats.weakest.verb}`}
        </p>
        <ProgressBar value={verbStats?.mastered ?? 0} max={VERBS.length} />
      </div>

      <div className="card family__child">
        <h3>Rekorde</h3>
        <div className="report__records">
          <div className="report__record">
            <Flame size={18} />
            <span>Längste Lern-Serie</span>
            <b>
              {records.streak} {records.streak === 1 ? 'Tag' : 'Tage'}
            </b>
          </div>
          <div className="report__record">
            <Star size={18} />
            <span>Beste Woche</span>
            <b>{records.bestWeek} XP</b>
          </div>
          <div className="report__record">
            <Trophy size={18} />
            <span>Im Langzeitgedächtnis</span>
            <b>{records.longTerm} Vokabeln</b>
          </div>
        </div>
      </div>
    </div>
  )
}
