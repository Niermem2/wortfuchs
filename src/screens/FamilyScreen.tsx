import { useLiveQuery } from 'dexie-react-hooks'
import { Flame } from 'lucide-react'
import { db } from '../data/db'
import { MAX_PHASE } from '../learn/srs'
import { weekStatsByUser } from '../learn/stats'
import './screens.css'

const PHASE_LABELS = ['Neu', 'P1', 'P2', 'P3', 'P4', 'P5', 'Gold']

export function FamilyScreen() {
  const children = useLiveQuery(
    () => db.profiles.filter((p) => p.role === 'child').toArray(),
    [],
  )
  const weekly = useLiveQuery(
    async () => weekStatsByUser(await db.sessions.toArray()),
    [],
  )
  const perChild = useLiveQuery(async () => {
    const cards = new Map((await db.cards.toArray()).map((c) => [c.id, c]))
    const result = new Map<
      string,
      { phases: number[]; hard: { en: string; de: string; wrong: number }[] }
    >()
    const progress = await db.progress.toArray()
    for (const p of progress) {
      let r = result.get(p.user_id)
      if (!r) {
        r = { phases: Array.from({ length: MAX_PHASE + 1 }, () => 0), hard: [] }
        result.set(p.user_id, r)
      }
      r.phases[p.phase]++
      const card = cards.get(p.card_id)
      if (card && p.wrong_count >= 2) {
        r.hard.push({ en: card.english, de: card.german, wrong: p.wrong_count })
      }
    }
    for (const r of result.values()) {
      r.hard.sort((a, b) => b.wrong - a.wrong)
      r.hard = r.hard.slice(0, 5)
    }
    return result
  }, [])

  return (
    <div className="screen">
      <h1>Familie</h1>
      <p className="home__sub">Was diese Woche gelernt wurde.</p>

      {children?.length === 0 && (
        <div className="card">
          <p>Noch keine Kinder-Accounts angelegt.</p>
        </div>
      )}

      {children?.map((child) => {
        const week = weekly?.get(child.id)
        const stats = perChild?.get(child.id)
        const started = stats ? stats.phases.reduce((a, b) => a + b, 0) : 0
        const quote =
          week && week.cardsSeen > 0 ? Math.round((week.cardsCorrect / week.cardsSeen) * 100) : null
        return (
          <div key={child.id} className="card family__child">
            <div className="family__head">
              <h2>{child.display_name}</h2>
              <span className="ranking__stat">
                <Flame size={16} /> {child.streak_days}
              </span>
            </div>

            <div className="family__week">
              <div className="family__stat">
                <span className="family__num">{week ? Math.round(week.durationSec / 60) : 0}</span>
                <span className="caption">Minuten</span>
              </div>
              <div className="family__stat">
                <span className="family__num">{week?.cardsSeen ?? 0}</span>
                <span className="caption">Karten</span>
              </div>
              <div className="family__stat">
                <span className="family__num">{quote === null ? '–' : `${quote}%`}</span>
                <span className="caption">Richtig</span>
              </div>
              <div className="family__stat">
                <span className="family__num">{week?.xp ?? 0}</span>
                <span className="caption">XP</span>
              </div>
            </div>

            {stats && started > 0 && (
              <>
                <span className="caption">Phasen ({started} Vokabeln begonnen)</span>
                <div className="family__phases">
                  {stats.phases.map((n, i) => (
                    <span key={i} className="family__phase">
                      <b>{n}</b> {PHASE_LABELS[i]}
                    </span>
                  ))}
                </div>
              </>
            )}

            {stats && stats.hard.length > 0 && (
              <>
                <span className="caption">Schwierige Vokabeln</span>
                <div className="family__hard">
                  {stats.hard.map((h) => (
                    <div key={h.en + h.de} className="family__hard-row">
                      <span>
                        <b>{h.en}</b> — {h.de}
                      </span>
                      <span className="home__sub">{h.wrong}× falsch</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
