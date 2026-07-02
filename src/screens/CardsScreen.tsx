import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight } from 'lucide-react'
import type { Lesson, Profile, SettingsData } from '../data/types'
import { db } from '../data/db'
import { updateSettings } from '../data/settings'
import { LessonScreen } from './LessonScreen'
import './screens.css'

export function CardsScreen({
  profile,
  settings,
}: {
  profile: Profile
  settings: SettingsData
}) {
  const books = useLiveQuery(() => db.books.orderBy('sort_order').toArray(), [])
  const [bookId, setBookId] = useState<number | null>(null)
  const [openLesson, setOpenLesson] = useState<Lesson | null>(null)
  const activeBook = bookId ?? books?.[0]?.id ?? null

  const lessons = useLiveQuery(
    () => (activeBook === null ? [] : db.lessons.where('book_id').equals(activeBook).sortBy('sort_order')),
    [activeBook],
  )

  const counts = useLiveQuery(async () => {
    const map = new Map<number, number>()
    await db.cards.toCollection().each((c) => map.set(c.lesson_id, (map.get(c.lesson_id) ?? 0) + 1))
    return map
  }, [])

  async function toggle(lessonId: number) {
    const active = settings.activeLessons.includes(lessonId)
    await updateSettings(profile.id, {
      activeLessons: active
        ? settings.activeLessons.filter((id) => id !== lessonId)
        : [...settings.activeLessons, lessonId],
    })
  }

  if (openLesson) {
    return <LessonScreen lesson={openLesson} profile={profile} onBack={() => setOpenLesson(null)} />
  }

  if (books && books.length === 0) {
    return (
      <div className="screen">
        <h1>Karten</h1>
        <div className="card">
          <p>Noch keine Vokabeln da. Sobald die Datenbank verbunden und befüllt ist, erscheinen hier deine Bücher.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <h1>Karten</h1>
      <p className="home__sub">Aktivierte Lektionen kommen in die Abfrage.</p>

      <div className="cards__books">
        {books?.map((b) => (
          <button
            key={b.id}
            className={`cards__book ${b.id === activeBook ? 'cards__book--active' : ''}`}
            onClick={() => setBookId(b.id)}
          >
            {b.name}
          </button>
        ))}
      </div>

      <div className="cards__lessons">
        {lessons?.map((l) => {
          const active = settings.activeLessons.includes(l.id)
          return (
            <div key={l.id} className="cards__lesson card">
              <button className="cards__lesson-open" onClick={() => setOpenLesson(l)}>
                <span>
                  <h3>{l.name}</h3>
                  <span className="home__sub">{counts?.get(l.id) ?? 0} Karten</span>
                </span>
                <ChevronRight size={20} className="cards__chev" />
              </button>
              <button
                role="switch"
                aria-checked={active}
                aria-label={`Lektion ${l.name} ${active ? 'deaktivieren' : 'aktivieren'}`}
                className={`switch ${active ? 'switch--on' : ''}`}
                onClick={() => toggle(l.id)}
              >
                <span className="switch__knob" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
