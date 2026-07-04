import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Card, Profile, SettingsData } from '../data/types'
import { db } from '../data/db'
import { collectDueCards, levelProgress, MAX_PHASE } from '../learn/srs'
import { localDay } from '../learn/stats'
import { Button, LevelRing, StreakPill, XPBadge, ProgressBar } from '../components/ui'
import './screens.css'

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

  // App-Badge (installierte PWA): Anzahl fälliger Karten am Homescreen-Icon
  useEffect(() => {
    if (due === undefined || !('setAppBadge' in navigator)) return
    ;(due.length > 0 ? navigator.setAppBadge(due.length) : navigator.clearAppBadge()).catch(
      () => {},
    )
  }, [due])

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

    </div>
  )
}
