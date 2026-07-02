import { GraduationCap, Layers, Trophy, CircleUser } from 'lucide-react'
import './ui.css'

export type Tab = 'learn' | 'cards' | 'ranking' | 'profile'

const ITEMS: { id: Tab; label: string; icon: typeof GraduationCap }[] = [
  { id: 'learn', label: 'Lernen', icon: GraduationCap },
  { id: 'cards', label: 'Karten', icon: Layers },
  { id: 'ranking', label: 'Rangliste', icon: Trophy },
  { id: 'profile', label: 'Profil', icon: CircleUser },
]

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="bottom-nav">
      {ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`bottom-nav__item ${tab === id ? 'bottom-nav__item--active' : ''}`}
          onClick={() => onChange(id)}
          aria-current={tab === id ? 'page' : undefined}
        >
          <Icon size={24} strokeWidth={2} />
          {label}
        </button>
      ))}
    </nav>
  )
}
