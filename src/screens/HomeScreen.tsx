import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Card, Profile, SettingsData } from '../data/types'
import { db } from '../data/db'
import { collectDueCards, levelProgress, MAX_PHASE } from '../learn/srs'
import { localDay } from '../learn/stats'
import { Button, LevelRing, StreakPill, XPBadge, ProgressBar } from '../components/ui'
import { Heatmap } from '../components/Heatmap'
import './screens.css'

const PHASE_LABELS = ['Neu', 'P1', 'P2', 'P3', 'P4', 'P5', 'Gelernt']

function daysUntil(date: string | null): number | null {
  if (!date) return null
  const target = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000))
}

export function HomeScreen({
  profile,
  settings,
  onStart,
  onTestPrep,
  onVerbs,
}: {
  profile: Profile
  settings: SettingsData
  onStart: (cards: Card[], pool: Card[]) => void
  onTestPrep: () => void
  onVerbs: () => void
}) {
  const due = useLiveQuery(
    () => collectDueCards(profile.id, settings, Number.MAX_SAFE_INTEGER),
    [profile.id, settings],
  )

  const phaseStats = useLiveQuery(async () => {
    if (settings.activeLessons.length === 0) return null
    const cards = await db.cards.where('lesson_id').anyOf(settings.activeLessons).toArray()
    const progress = await db.progress.where('user_id').equals(profile.id).toArray()
    const byCard = new Map(progress.map((p) => [p.card_id, p.phase]))
    const counts = Array.from({ length: MAX_PHASE + 1 }, () => 0)
    for (const c of cards) counts[byCard.get(c.id) ?? 0]++
    return { counts, total: cards.length }
  }, [profile.id, settings])

  // App-Badge (installierte PWA): Anzahl fälliger Karten am Homescreen-Icon
  useEffect(() => {
    if (due === undefined || !('setAppBadge' in navigator)) return
    ;(due.length > 0 ? navigator.setAppBadge(due.length) : navigator.clearAppBadge()).catch(
      () => {},
    )
  }, [due])

  const activityByDay = useLiveQuery(async () => {
    const map = new Map<string, number>()
    const sessions = await db.sessions.where('user_id').equals(profile.id).toArray()
    for (const s of sessions) {
      const key = localDay(new Date(s.started_at))
      map.set(key, (map.get(key) ?? 0) + s.cards_seen)
    }
    return map
  }, [profile.id])

  const upcoming = useLiveQuery(async () => {
    if (settings.activeLessons.length === 0) return null
    const cardIds = new Set(
      (await db.cards.where('lesson_id').anyOf(settings.activeLessons).toArray())
        .filter((c) => c.active)
        .map((c) => c.id),
    )
    const progress = await db.progress.where('user_id').equals(profile.id).toArray()
    const today = new Date()
    const day = (offset: number) => {
      const d = new Date(today)
      d.setDate(d.getDate() + offset)
      return localDay(d)
    }
    let tomorrow = 0
    let week = 0
    for (const p of progress) {
      if (!p.due_date || p.phase >= MAX_PHASE || !cardIds.has(p.card_id)) continue
      if (p.due_date === day(1)) tomorrow++
      if (p.due_date > day(0) && p.due_date <= day(7)) week++
    }
    return { tomorrow, week }
  }, [profile.id, settings])

  const learnedToday = useLiveQuery(async () => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const sessions = await db.sessions
      .where('user_id')
      .equals(profile.id)
      .filter((s) => s.started_at >= start.toISOString())
      .toArray()
    return sessions.reduce((sum, s) => sum + s.cards_seen, 0)
  }, [profile.id])

  async function start() {
    if (!due?.length) return
    const pool = await db.cards.where('lesson_id').anyOf(settings.activeLessons).toArray()
    onStart(due.slice(0, settings.dailyGoal), pool)
  }

  return (
    <div className="screen">
      <header className="home__header">
        <span className="home__brand">{settings.appName}</span>
        <div className="home__badges">
          <StreakPill days={profile.streak_days} />
          <XPBadge xp={profile.xp} />
        </div>
      </header>

      <div className="card home__hello">
        <LevelRing mascot={settings.mascot} level={profile.level} progress={levelProgress(profile.xp)} />
        <div>
          <h2>Hallo{profile.display_name ? `, ${profile.display_name}` : ''}.</h2>
          <p className="home__sub">
            {due === undefined
              ? '…'
              : due.length === 0
                ? settings.activeLessons.length === 0
                  ? 'Aktiviere unter „Karten" deine erste Lektion.'
                  : 'Alles gelernt für heute.'
                : `${due.length} ${due.length === 1 ? 'Karte wartet' : 'Karten warten'} auf dich.`}
          </p>
        </div>
      </div>

      <Button block onClick={start} disabled={!due?.length}>
        {due?.length ? `Jetzt lernen (${Math.min(due.length, settings.dailyGoal)})` : 'Nichts fällig'}
      </Button>

      {settings.testPrep ? (
        <>
          <button className="card home__testprep" onClick={onTestPrep}>
            <div>
              <h3>Testvorbereitung läuft</h3>
              <p className="home__sub">
                {settings.testPrep.lessons.length}{' '}
                {settings.testPrep.lessons.length === 1 ? 'Lektion' : 'Lektionen'}
                {daysUntil(settings.testPrep.date) !== null &&
                  ` · noch ${daysUntil(settings.testPrep.date)} ${daysUntil(settings.testPrep.date) === 1 ? 'Tag' : 'Tage'}`}
              </p>
            </div>
            <span className="home__testprep-cta">Üben</span>
          </button>
          <Button block variant="secondary" onClick={onVerbs}>
            Unregelmäßige Verben
          </Button>
        </>
      ) : (
        <div className="home__extras">
          <Button variant="secondary" onClick={onTestPrep}>
            Test üben
          </Button>
          <Button variant="secondary" onClick={onVerbs}>
            Verben
          </Button>
        </div>
      )}

      {phaseStats && phaseStats.total > 0 && (
        <div className="card">
          <h3>Dein Fortschritt</h3>
          <p className="home__sub">
            {phaseStats.counts[MAX_PHASE]} von {phaseStats.total} Vokabeln im Langzeitgedächtnis
          </p>
          <div className="home__phases">
            {phaseStats.counts.map((n, i) => (
              <div key={i} className="home__phase">
                <div className="home__phase-bar">
                  <div
                    className={`home__phase-fill ${i === MAX_PHASE ? 'home__phase-fill--done' : ''}`}
                    style={{ height: `${phaseStats.total ? Math.max(n > 0 ? 8 : 0, (n / phaseStats.total) * 100) : 0}%` }}
                  />
                </div>
                <span className="home__phase-num">{n}</span>
                <span className="home__phase-label">{PHASE_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3>Tagesziel</h3>
        <p className="home__sub">
          {Math.min(learnedToday ?? 0, settings.dailyGoal)} von {settings.dailyGoal} Karten heute
        </p>
        <ProgressBar value={learnedToday ?? 0} max={settings.dailyGoal} />
      </div>

      {upcoming && (
        <div className="card">
          <h3>Demnächst fällig</h3>
          <div className="home__upcoming">
            <span>
              <b>{due?.length ?? 0}</b> heute
            </span>
            <span>
              <b>{upcoming.tomorrow}</b> morgen
            </span>
            <span>
              <b>{upcoming.week}</b> nächste 7 Tage
            </span>
          </div>
        </div>
      )}

      {activityByDay && activityByDay.size > 0 && (
        <div className="card">
          <h3>Deine Aktivität</h3>
          <p className="home__sub">Karten pro Tag, letzte 12 Wochen</p>
          <div className="home__heatmap">
            <Heatmap byDay={activityByDay} />
          </div>
        </div>
      )}
    </div>
  )
}
