import { useEffect, useRef, useState } from 'react'
import { Volume2, X } from 'lucide-react'
import type { Profile, SettingsData } from '../data/types'
import { db } from '../data/db'
import { VERBS, type Verb } from '../learn/verbs'
import { awardXp, XP_PER_CORRECT } from '../learn/srs'
import { checkAnswer } from '../learn/answer-check'
import { canSpeak, speak } from '../learn/speech'
import { Button, HeroCard, ProgressBar } from '../components/ui'
import { Confetti } from '../components/Confetti'
import { Mascot } from '../components/Mascot'
import './session.css'

const ROUND_SIZE = 10

async function applyVerbAnswer(userId: string, verb: string, correct: boolean) {
  const existing = await db.verbProgress.get([userId, verb])
  await db.verbProgress.put({
    user_id: userId,
    verb,
    streak: correct ? (existing?.streak ?? 0) + 1 : 0,
    correct_count: (existing?.correct_count ?? 0) + (correct ? 1 : 0),
    wrong_count: (existing?.wrong_count ?? 0) + (correct ? 0 : 1),
    updated_at: new Date().toISOString(),
    dirty: 1,
  })
}

export function VerbsScreen({
  profile,
  settings,
  onClose,
}: {
  profile: Profile
  settings: SettingsData
  onClose: () => void
}) {
  const [queue, setQueue] = useState<Verb[] | null>(null)
  const [total, setTotal] = useState(0)
  const [phase, setPhase] = useState<'ask' | 'feedback' | 'done'>('ask')
  const [past, setPast] = useState('')
  const [participle, setParticiple] = useState('')
  const [lastCorrect, setLastCorrect] = useState(false)
  const [mastered, setMastered] = useState(0)
  const [correctFirstTry, setCorrectFirstTry] = useState(0)
  const [wrongVerbs] = useState(() => new Set<string>())
  const [startedAt] = useState(() => new Date())
  const [levelUp, setLevelUp] = useState<number | null>(null)

  // Runde: Verben mit dem niedrigsten Streak zuerst, Gleichstand zufällig
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const progress = await db.verbProgress.where('user_id').equals(profile.id).toArray()
      const streak = new Map(progress.map((p) => [p.verb, p.streak]))
      const round = [...VERBS]
        .map((v) => ({ v, key: (streak.get(v.infinitive) ?? 0) + Math.random() * 0.9 }))
        .sort((a, b) => a.key - b.key)
        .slice(0, ROUND_SIZE)
        .map((x) => x.v)
      if (!cancelled) {
        setQueue(round)
        setTotal(round.length)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profile.id])

  const verb = queue?.[0]

  const pastRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    // hängt auch am Verb: beim ersten Rendern ist die Runde noch nicht geladen
    if (phase === 'ask' && verb) pastRef.current?.focus()
  }, [phase, verb])

  const finished = useRef(false)
  useEffect(() => {
    if (queue !== null && queue.length === 0 && phase !== 'done' && !finished.current) {
      finished.current = true
      finishRound()
    }
  }) // eslint-disable-line react-hooks/exhaustive-deps

  async function finishRound() {
    const xp = correctFirstTry * XP_PER_CORRECT
    await db.sessions.put({
      id: crypto.randomUUID(),
      user_id: profile.id,
      started_at: startedAt.toISOString(),
      duration_sec: Math.round((Date.now() - startedAt.getTime()) / 1000),
      cards_seen: total,
      cards_correct: correctFirstTry,
      xp_earned: xp,
      mode: 'verbs',
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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!verb || phase !== 'ask' || graded.current || !past.trim() || !participle.trim()) return
    graded.current = true
    const correct =
      checkAnswer(verb.past, past, settings.typoTolerancePercent) &&
      checkAnswer(verb.participle, participle, settings.typoTolerancePercent)
    setLastCorrect(correct)
    setPhase('feedback')
    const firstTry = !wrongVerbs.has(verb.infinitive)
    if (firstTry) await applyVerbAnswer(profile.id, verb.infinitive, correct)
    if (correct) {
      if (firstTry) setCorrectFirstTry((n) => n + 1)
      setMastered((n) => n + 1)
    } else {
      wrongVerbs.add(verb.infinitive)
    }
  }

  function next() {
    setQueue((q) => {
      if (!q) return q
      const [head, ...rest] = q
      return lastCorrect ? rest : [...rest, head]
    })
    setPast('')
    setParticiple('')
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
          <span className="hero-card__chip">Verben-Runde fertig</span>
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

  if (!verb) return null

  return (
    <div className="screen session">
      <div className="session__top">
        <button className="btn btn--ghost" onClick={onClose} aria-label="Beenden">
          <X size={24} />
        </button>
        <ProgressBar value={mastered} max={total} />
      </div>

      <HeroCard chip="Unregelmäßige Verben" word={verb.infinitive}>
        <span className="home__sub">{verb.german}</span>
        {canSpeak() && (
          <button
            className="btn btn--ghost"
            onClick={() => speak(`${verb.infinitive}, ${verb.past.split('/')[0]}, ${verb.participle.split('/')[0]}`)}
            aria-label="Anhören"
          >
            <Volume2 size={22} />
          </button>
        )}
      </HeroCard>

      <form className="session__answers" onSubmit={submit}>
        <label className="verbs__field">
          <span className="caption">Simple Past</span>
          <input
            ref={pastRef}
            className={`session__input ${phase === 'feedback' ? (lastCorrect ? 'session__input--correct' : 'session__input--wrong') : ''}`}
            value={past}
            onChange={(e) => setPast(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            disabled={phase === 'feedback'}
            enterKeyHint="next"
          />
        </label>
        <label className="verbs__field">
          <span className="caption">Past Participle</span>
          <input
            className={`session__input ${phase === 'feedback' ? (lastCorrect ? 'session__input--correct' : 'session__input--wrong') : ''}`}
            value={participle}
            onChange={(e) => setParticiple(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            disabled={phase === 'feedback'}
            enterKeyHint="done"
          />
        </label>
        {phase === 'ask' && (
          <Button type="submit" block disabled={!past.trim() || !participle.trim()}>
            Prüfen
          </Button>
        )}
      </form>

      {phase === 'feedback' && (
        <div className={`session__feedback ${lastCorrect ? 'session__feedback--correct' : 'session__feedback--wrong'}`}>
          <p className="session__feedback-title">
            {lastCorrect ? 'Richtig' : `${verb.infinitive} – ${verb.past} – ${verb.participle}`}
          </p>
          <Button block onClick={next}>
            Weiter
          </Button>
        </div>
      )}
    </div>
  )
}
