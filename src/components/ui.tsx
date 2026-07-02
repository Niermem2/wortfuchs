import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { Check, X, Flame, Star } from 'lucide-react'
import type { MascotId } from '../theme/presets'
import { Mascot } from './Mascot'
import './ui.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  block?: boolean
}

export function Button({ variant = 'primary', block, className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`btn btn--${variant} ${block ? 'btn--block' : ''} ${className}`}
      {...rest}
    />
  )
}

export function HeroCard({
  chip,
  phonetic,
  word,
  children,
}: {
  chip?: string
  phonetic?: string
  word: string
  children?: ReactNode
}) {
  return (
    <div className="hero-card">
      {chip && <span className="hero-card__chip">{chip}</span>}
      <span className="hero-word">{word}</span>
      {phonetic && <span className="hero-card__phonetic">{phonetic}</span>}
      {children}
    </div>
  )
}

export type AnswerState = 'default' | 'selected' | 'correct' | 'wrong'

export function AnswerOption({
  state = 'default',
  children,
  onClick,
  disabled,
}: {
  state?: AnswerState
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      className={`answer ${state !== 'default' ? `answer--${state}` : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="answer__icon">
        {state === 'correct' ? <Check size={20} /> : <X size={20} />}
      </span>
      {children}
    </button>
  )
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className="progress__fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function StreakPill({ days }: { days: number }) {
  return (
    <span className="streak-pill">
      <Flame size={18} />
      {days}
    </span>
  )
}

export function XPBadge({ xp }: { xp: number }) {
  return (
    <span className="xp-badge">
      <Star size={16} />
      {xp} XP
    </span>
  )
}

export function LevelRing({
  mascot,
  level,
  progress,
  size = 72,
}: {
  mascot: MascotId
  level: number
  progress: number
  size?: number
}) {
  const stroke = 5
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  return (
    <span className="level-ring" style={{ width: size, height: size }}>
      <Mascot id={mascot} size={size - 20} />
      <svg className="level-ring__track" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--grape-soft)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--grape)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - Math.min(1, progress))}
        />
      </svg>
      <span className="level-ring__badge">{level}</span>
    </span>
  )
}
