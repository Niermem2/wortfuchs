import { useLiveQuery } from 'dexie-react-hooks'
import type { Card, Profile, SettingsData } from '../data/types'
import { db } from '../data/db'
import { collectDueCards, levelProgress, MAX_PHASE } from '../learn/srs'
import { Button, LevelRing, StreakPill, XPBadge, ProgressBar } from '../components/ui'
import './screens.css'

const PHASE_LABELS = ['Neu', 'P1', 'P2', 'P3', 'P4', 'P5', 'Gelernt']

export function HomeScreen({
  profile,
  settings,
  onStart,
}: {
  profile: Profile
  settings: SettingsData
  onStart: (cards: Card[], pool: Card[]) => void
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
    </div>
  )
}
