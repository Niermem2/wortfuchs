import { useEffect, useMemo, useRef, useState } from 'react'
import { Volume2, X } from 'lucide-react'
import type { Card, Profile, SettingsData } from '../data/types'
import { db } from '../data/db'
import { applyAnswer, awardXp, XP_PER_CORRECT } from '../learn/srs'
import { checkAnswer } from '../learn/answer-check'
import { canSpeak, speak } from '../learn/speech'
import { Button, HeroCard, AnswerOption, ProgressBar, type AnswerState } from '../components/ui'
import { Confetti } from '../components/Confetti'
import { Mascot } from '../components/Mascot'
import './session.css'

type Phase = 'ask' | 'feedback' | 'done'

interface QueueItem {
  card: Card
  direction: 'de-en' | 'en-de'
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQueue(cards: Card[], settings: SettingsData): QueueItem[] {
  return cards.map((card) => ({
    card,
    direction:
      settings.direction === 'mixed'
        ? Math.random() < 0.5
          ? 'de-en'
          : 'en-de'
        : settings.direction,
  }))
}

export function SessionScreen({
  profile,
  settings,
  cards,
  pool,
  mode = 'learn',
  onClose,
}: {
  profile: Profile
  settings: SettingsData
  cards: Card[]
  pool: Card[]
  mode?: 'learn' | 'test'
  onClose: () => void
}) {
  const total = cards.length
  const [queue, setQueue] = useState<QueueItem[]>(() => buildQueue(cards, settings))
  const [phase, setPhase] = useState<Phase>('ask')
  const [lastCorrect, setLastCorrect] = useState(false)
  const [typed, setTyped] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [mastered, setMastered] = useState(0)
  const [correctFirstTry, setCorrectFirstTry] = useState(0)
  const [round, setRound] = useState(0)
  const [wrongIds] = useState(() => new Set<string>())
  const [startedAt] = useState(() => new Date())
  const [levelUp, setLevelUp] = useState<number | null>(null)

  const item = queue[0]
  const prompt = item ? (item.direction === 'de-en' ? item.card.german : item.card.english) : ''
  const solution = item ? (item.direction === 'de-en' ? item.card.english : item.card.german) : ''

  const choices = useMemo(() => {
    if (!item || settings.inputMode !== 'choice') return []
    const field = item.direction === 'de-en' ? 'english' : 'german'
    const distractors = shuffle(pool.filter((c) => c.id !== item.card.id))
      .map((c) => c[field])
      .filter((v, i, a) => v !== solution && a.indexOf(v) === i)
      .slice(0, 3)
    return shuffle([solution, ...distractors])
  }, [item?.card.id, round]) // eslint-disable-line react-hooks/exhaustive-deps

  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (phase === 'ask' && settings.inputMode === 'type') inputRef.current?.focus()
  }, [phase, settings.inputMode])

  // Automatisch vorlesen: englische Seite, sobald sie sichtbar wird
  useEffect(() => {
    if (!settings.autoAudio || !item) return
    if (phase === 'ask' && item.direction === 'en-de') speak(item.card.english)
    if (phase === 'feedback' && item.direction === 'de-en') speak(item.card.english)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, item?.card.id, settings.autoAudio])

  const finished = useRef(false)
  useEffect(() => {
    if (!item && phase !== 'done' && !finished.current) {
      finished.current = true
      finishSession()
    }
  }) // eslint-disable-line react-hooks/exhaustive-deps

  async function finishSession() {
    const xp = correctFirstTry * XP_PER_CORRECT
    await db.sessions.put({
      id: crypto.randomUUID(),
      user_id: profile.id,
      started_at: startedAt.toISOString(),
      duration_sec: Math.round((Date.now() - startedAt.getTime()) / 1000),
      cards_seen: total,
      cards_correct: correctFirstTry,
      xp_earned: xp,
      mode,
      dirty: 1,
    })
    if (xp > 0) {
      const before = (await db.profiles.get(profile.id))?.level ?? profile.level
      await awardXp(profile.id, xp)
      const after = (await db.profiles.get(profile.id))?.level ?? before
      if (after > before) setLevelUp(after)
    }
    setPhase('done')
  }

  const graded = useRef(false)

  async function answer(correct: boolean): Promise<boolean> {
    // Schutz gegen Doppel-Tap: pro Karte zählt nur die erste Bewertung
    if (graded.current) return false
    graded.current = true
    setLastCorrect(correct)
    setPhase('feedback')
    // Fürs Phasensystem zählt nur die erste Bewertung einer Karte pro Session —
    // requeute Karten üben nur, steigen aber nicht zusätzlich auf.
    // Testvorbereitung lässt das Phasensystem komplett unberührt.
    const firstTry = !wrongIds.has(item.card.id)
    if (firstTry && mode === 'learn') {
      await applyAnswer(profile.id, item.card.id, correct, settings.intervals)
    }
    if (correct) {
      if (firstTry) setCorrectFirstTry((n) => n + 1)
      setMastered((n) => n + 1)
    } else {
      wrongIds.add(item.card.id)
    }
    return true
  }

  function next(correct: boolean) {
    setQueue((q) => {
      const [head, ...rest] = q
      // Falsch beantwortete Karten kommen ans Ende, bis sie sitzen
      return correct ? rest : [...rest, head]
    })
    setTyped('')
    setPicked(null)
    setRound(round + 1)
    graded.current = false
    setPhase('ask')
  }

  if (phase === 'done') {
    const quote = total > 0 ? Math.round((correctFirstTry / total) * 100) : 0
    return (
      <div className="screen session">
        {levelUp !== null && <Confetti />}
        <div className="hero-card session__summary">
          {levelUp !== null && (
            <div className="session__levelup">
              <span className="session__mascot">
                <Mascot id={settings.mascot} size={72} />
              </span>
              <span className="hero-word session__levelup-text">Level {levelUp}!</span>
            </div>
          )}
          <span className="hero-card__chip">{mode === 'test' ? 'Übungsrunde fertig' : 'Fertig'}</span>
          <span className="hero-word">
            {correctFirstTry}/{total}
          </span>
          <p>
            {quote >= 80 ? 'Stark gemacht.' : quote >= 50 ? 'Gut dabei — weiter so.' : 'Dranbleiben, das wird.'}
          </p>
          <p className="session__xp">+{correctFirstTry * XP_PER_CORRECT} XP</p>
        </div>
        <Button block onClick={onClose}>
          Weiter
        </Button>
      </div>
    )
  }

  if (!item) return null

  const answerState = (value: string): AnswerState => {
    if (phase === 'ask') return picked === value ? 'selected' : 'default'
    if (value === solution) return 'correct'
    if (picked === value) return 'wrong'
    return 'default'
  }

  return (
    <div className="screen session">
      <div className="session__top">
        <button className="btn btn--ghost" onClick={onClose} aria-label="Beenden">
          <X size={24} />
        </button>
        <ProgressBar value={mastered} max={total} />
      </div>

      <HeroCard
        chip={item.direction === 'de-en' ? 'Deutsch → Englisch' : 'Englisch → Deutsch'}
        word={prompt}
        phonetic={item.direction === 'en-de' ? (item.card.phonetic ?? undefined) : undefined}
      >
        {item.direction === 'en-de' && canSpeak() && (
          <button className="btn btn--ghost" onClick={() => speak(item.card.english)} aria-label="Anhören">
            <Volume2 size={22} />
          </button>
        )}
      </HeroCard>

      {settings.inputMode === 'choice' && (
        <div className="session__answers">
          {choices.map((c) => (
            <AnswerOption
              key={c}
              state={answerState(c)}
              disabled={phase === 'feedback'}
              onClick={() => {
                setPicked(c)
                answer(c === solution)
              }}
            >
              {c}
            </AnswerOption>
          ))}
        </div>
      )}

      {settings.inputMode === 'type' && (
        <form
          className="session__answers"
          onSubmit={(e) => {
            e.preventDefault()
            if (phase === 'ask' && typed.trim()) {
              answer(checkAnswer(solution, typed, settings.typoTolerance))
            }
          }}
        >
          <input
            ref={inputRef}
            className={`session__input ${
              phase === 'feedback' ? (lastCorrect ? 'session__input--correct' : 'session__input--wrong') : ''
            }`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Deine Antwort …"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            disabled={phase === 'feedback'}
            enterKeyHint="done"
          />
          {phase === 'ask' && (
            <Button type="submit" block disabled={!typed.trim()}>
              Prüfen
            </Button>
          )}
        </form>
      )}

      {settings.inputMode === 'reveal' && phase === 'ask' && (
        <Button block onClick={() => setPhase('feedback')} variant="secondary">
          Antwort zeigen
        </Button>
      )}

      {phase === 'feedback' && settings.inputMode === 'reveal' && (
        <>
          <div className="session__solution card">
            {solution}
            {item.direction === 'de-en' && canSpeak() && (
              <button className="btn btn--ghost" onClick={() => speak(item.card.english)} aria-label="Anhören">
                <Volume2 size={20} />
              </button>
            )}
          </div>
          <div className="session__grade">
            <Button variant="secondary" onClick={() => answer(false).then((ok) => ok && next(false))}>
              Nicht gewusst
            </Button>
            <Button onClick={() => answer(true).then((ok) => ok && next(true))}>Gewusst</Button>
          </div>
        </>
      )}

      {phase === 'feedback' && settings.inputMode !== 'reveal' && (
        <div className={`session__feedback ${lastCorrect ? 'session__feedback--correct' : 'session__feedback--wrong'}`}>
          <p className="session__feedback-title">
            {lastCorrect ? 'Richtig' : `Richtig wäre: ${solution}`}
            {canSpeak() && (
              <button
                className="btn btn--ghost session__speak"
                onClick={() => speak(item.card.example_en ? `${item.card.english}. ${item.card.example_en}` : item.card.english)}
                aria-label="Anhören"
              >
                <Volume2 size={20} />
              </button>
            )}
          </p>
          {item.card.example_en && (
            <p className="session__example">
              {item.card.example_en}
              <br />
              <span>{item.card.example_de}</span>
            </p>
          )}
          <Button block onClick={() => next(lastCorrect)}>
            Weiter
          </Button>
        </div>
      )}
    </div>
  )
}
