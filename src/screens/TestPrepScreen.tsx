import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Check } from 'lucide-react'
import type { Card, Profile, SettingsData } from '../data/types'
import { db } from '../data/db'
import { updateSettings } from '../data/settings'
import { Button } from '../components/ui'
import './screens.css'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function TestPrepScreen({
  profile,
  settings,
  onBack,
  onStart,
}: {
  profile: Profile
  settings: SettingsData
  onBack: () => void
  onStart: (cards: Card[], pool: Card[]) => void
}) {
  const [selected, setSelected] = useState<number[]>(settings.testPrep?.lessons ?? [])
  const [date, setDate] = useState(settings.testPrep?.date ?? '')

  const books = useLiveQuery(() => db.books.orderBy('sort_order').toArray(), [])
  const lessons = useLiveQuery(() => db.lessons.toArray(), [])
  const history = useLiveQuery(
    () =>
      db.sessions
        .where('user_id')
        .equals(profile.id)
        .filter((s) => s.mode === 'test')
        .reverse()
        .sortBy('started_at')
        .then((s) => s.reverse().slice(0, 8)),
    [profile.id],
  )

  function toggle(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  async function start() {
    if (selected.length === 0) return
    await updateSettings(profile.id, { testPrep: { lessons: selected, date: date || null } })
    const pool = await db.cards
      .where('lesson_id')
      .anyOf(selected)
      .filter((c) => c.active)
      .toArray()
    onStart(shuffle(pool).slice(0, settings.dailyGoal), pool)
  }

  async function finish() {
    await updateSettings(profile.id, { testPrep: null })
    setSelected([])
    setDate('')
  }

  return (
    <div className="screen">
      <div className="lesson__head">
        <button className="btn btn--ghost" onClick={onBack} aria-label="Zurück">
          <ArrowLeft size={24} />
        </button>
        <div className="lesson__title">
          <h1>Testvorbereitung</h1>
          <span className="home__sub">Intensiv üben — ohne dein Phasensystem zu verändern.</span>
        </div>
      </div>

      <div className="card profile__section">
        <h3>Lektionen für den Test</h3>
        {books?.map((b) => (
          <div key={b.id}>
            <span className="caption">{b.name}</span>
            <div className="testprep__lessons">
              {lessons
                ?.filter((l) => l.book_id === b.id)
                .sort((a, z) => a.sort_order - z.sort_order)
                .map((l) => (
                  <button
                    key={l.id}
                    className={`testprep__lesson ${selected.includes(l.id) ? 'testprep__lesson--on' : ''}`}
                    onClick={() => toggle(l.id)}
                  >
                    {selected.includes(l.id) && <Check size={14} />}
                    {l.name}
                  </button>
                ))}
            </div>
          </div>
        ))}
        <label className="profile__row">
          <span className="caption">Test-Datum (optional)</span>
          <input
            type="date"
            className="profile__input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <Button block disabled={selected.length === 0} onClick={start}>
          Übungsrunde starten ({selected.length} {selected.length === 1 ? 'Lektion' : 'Lektionen'})
        </Button>
        {settings.testPrep && (
          <Button block variant="ghost" onClick={finish}>
            Testvorbereitung beenden
          </Button>
        )}
      </div>

      {history && history.length > 0 && (
        <div className="card">
          <h3>Bisherige Übungsrunden</h3>
          <div className="testprep__history">
            {history.map((s) => (
              <div key={s.id} className="testprep__row">
                <span>{new Date(s.started_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                <span className="home__sub">{s.cards_correct}/{s.cards_seen} richtig</span>
                <span className="home__sub">{Math.round(s.duration_sec / 60)} min</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
