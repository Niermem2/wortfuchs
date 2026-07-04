import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Plus, Star, Trash2, Volume2 } from 'lucide-react'
import type { Card, Lesson, Profile } from '../data/types'
import { db } from '../data/db'
import { createCard, updateCard, deleteCard, type CardFields } from '../data/cards'
import { MAX_PHASE } from '../learn/srs'
import { canSpeak, speak } from '../learn/speech'
import { Button, ProgressBar } from '../components/ui'
import './screens.css'

function CardModal({
  card,
  lessonId,
  onClose,
}: {
  card: Card | null
  lessonId: number
  onClose: () => void
}) {
  const [fields, setFields] = useState<CardFields>({
    english: card?.english ?? '',
    german: card?.german ?? '',
    phonetic: card?.phonetic ?? null,
    example_en: card?.example_en ?? null,
    example_de: card?.example_de ?? null,
    note: card?.note ?? null,
  })
  const [active, setActive] = useState(card?.active ?? true)

  const set = (key: keyof CardFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value || null }))

  async function save() {
    if (!fields.english.trim() || !fields.german.trim()) return
    if (card) await updateCard(card.id, { ...fields, active })
    else await createCard(lessonId, fields)
    onClose()
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2>{card ? 'Karte bearbeiten' : 'Neue Karte'}</h2>
          {card && canSpeak() && (
            <button className="btn btn--ghost" onClick={() => speak(fields.english)} aria-label="Anhören">
              <Volume2 size={22} />
            </button>
          )}
        </div>

        <label className="profile__row">
          <span className="caption">Englisch</span>
          <input className="profile__input" value={fields.english} onChange={(e) => setFields((f) => ({ ...f, english: e.target.value }))} />
        </label>
        <label className="profile__row">
          <span className="caption">Deutsch</span>
          <input className="profile__input" value={fields.german} onChange={(e) => setFields((f) => ({ ...f, german: e.target.value }))} />
        </label>
        <label className="profile__row">
          <span className="caption">Aussprache</span>
          <input className="profile__input" value={fields.phonetic ?? ''} onChange={set('phonetic')} />
        </label>
        <label className="profile__row">
          <span className="caption">Beispielsatz (EN)</span>
          <input className="profile__input" value={fields.example_en ?? ''} onChange={set('example_en')} />
        </label>
        <label className="profile__row">
          <span className="caption">Beispielsatz (DE)</span>
          <input className="profile__input" value={fields.example_de ?? ''} onChange={set('example_de')} />
        </label>
        <label className="profile__row">
          <span className="caption">Eigene Notiz</span>
          <input className="profile__input" value={fields.note ?? ''} onChange={set('note')} />
        </label>

        {card && (
          <div className="profile__row profile__row--inline">
            <span>In der Abfrage</span>
            <button
              role="switch"
              aria-checked={active}
              className={`switch ${active ? 'switch--on' : ''}`}
              onClick={() => setActive(!active)}
            >
              <span className="switch__knob" />
            </button>
          </div>
        )}

        <div className="modal__actions">
          {card?.is_custom && (
            <button
              className="btn btn--ghost modal__delete"
              onClick={async () => {
                await deleteCard(card)
                onClose()
              }}
            >
              <Trash2 size={18} /> Löschen
            </button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button onClick={save} disabled={!fields.english.trim() || !fields.german.trim()}>
            Speichern
          </Button>
        </div>
      </div>
    </div>
  )
}

export function LessonScreen({
  lesson,
  profile,
  onBack,
}: {
  lesson: Lesson
  profile: Profile
  onBack: () => void
}) {
  const [modal, setModal] = useState<{ card: Card | null } | null>(null)

  const cards = useLiveQuery(
    () => db.cards.where('lesson_id').equals(lesson.id).sortBy('english'),
    [lesson.id],
  )
  const phases = useLiveQuery(async () => {
    const map = new Map<string, number>()
    for (const p of await db.progress.where('user_id').equals(profile.id).toArray()) {
      map.set(p.card_id, p.phase)
    }
    return map
  }, [profile.id])

  const collected = cards?.filter((c) => (phases?.get(c.id) ?? 0) > 0).length ?? 0
  const gold = cards?.filter((c) => (phases?.get(c.id) ?? 0) >= MAX_PHASE).length ?? 0

  return (
    <div className="screen">
      <div className="lesson__head">
        <button className="btn btn--ghost" onClick={onBack} aria-label="Zurück">
          <ArrowLeft size={24} />
        </button>
        <div className="lesson__title">
          <h1>{lesson.name}</h1>
          <span className="home__sub">
            {lesson.code} · {collected}/{cards?.length ?? 0} gesammelt{gold > 0 && ` · ${gold} in Gold`}
          </span>
        </div>
        <button className="btn btn--ghost" onClick={() => setModal({ card: null })} aria-label="Neue Karte">
          <Plus size={24} />
        </button>
      </div>
      <ProgressBar value={collected} max={cards?.length ?? 0} />

      <div className="collect">
        {cards?.map((c) => {
          const phase = phases?.get(c.id) ?? 0
          const state =
            phase >= MAX_PHASE ? 'collect__card--gold' : phase > 0 ? 'collect__card--known' : ''
          return (
            <button
              key={c.id}
              className={`collect__card ${state} ${c.active ? '' : 'collect__card--off'}`}
              onClick={() => setModal({ card: c })}
            >
              {phase >= MAX_PHASE && <Star size={14} className="collect__star" />}
              <span className="collect__en">{c.english}</span>
              <span className="collect__de">{c.german}</span>
              {!c.active && <span className="collect__chip">Aus</span>}
              {c.is_custom && <span className="collect__chip collect__chip--custom">Eigene</span>}
            </button>
          )
        })}
      </div>

      {modal && <CardModal card={modal.card} lessonId={lesson.id} onClose={() => setModal(null)} />}
    </div>
  )
}
