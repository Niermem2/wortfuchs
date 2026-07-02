import { useLiveQuery } from 'dexie-react-hooks'
import { Flame, Star } from 'lucide-react'
import type { Profile } from '../data/types'
import { db } from '../data/db'
import './screens.css'

export function RankingScreen({ profile }: { profile: Profile }) {
  const children = useLiveQuery(
    async () => (await db.profiles.filter((p) => p.role === 'child').toArray()).sort((a, b) => b.xp - a.xp),
    [],
  )

  return (
    <div className="screen">
      <h1>Rangliste</h1>
      {children && children.length <= 1 ? (
        <div className="card">
          <h3>Deine Bestwerte</h3>
          <div className="ranking__self">
            <span className="ranking__stat">
              <Star size={18} /> {profile.xp} XP gesamt
            </span>
            <span className="ranking__stat">
              <Flame size={18} /> {profile.streak_days} {profile.streak_days === 1 ? 'Tag' : 'Tage'} Streak
            </span>
          </div>
        </div>
      ) : (
        <div className="ranking__list">
          {children?.map((p, i) => (
            <div
              key={p.id}
              className={`card ranking__row ${p.id === profile.id ? 'ranking__row--me' : ''}`}
            >
              <span className={`ranking__pos ${i === 0 ? 'ranking__pos--gold' : ''}`}>{i + 1}</span>
              <span className="ranking__name">{p.display_name}</span>
              <span className="ranking__stat">
                <Flame size={16} /> {p.streak_days}
              </span>
              <span className="ranking__stat ranking__stat--xp">
                <Star size={16} /> {p.xp}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
