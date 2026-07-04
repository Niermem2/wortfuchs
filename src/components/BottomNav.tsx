import { GraduationCap, Layers, TrendingUp, Users, CircleUser } from 'lucide-react'
import './ui.css'

export type Tab = 'learn' | 'cards' | 'report' | 'profile'

export function BottomNav({
  tab,
  onChange,
  parent = false,
}: {
  tab: Tab
  onChange: (t: Tab) => void
  parent?: boolean
}) {
  const items: { id: Tab; label: string; icon: typeof GraduationCap }[] = [
    { id: 'learn', label: 'Lernen', icon: GraduationCap },
    { id: 'cards', label: 'Karten', icon: Layers },
    parent
      ? { id: 'report', label: 'Familie', icon: Users }
      : { id: 'report', label: 'Fortschritt', icon: TrendingUp },
    { id: 'profile', label: 'Profil', icon: CircleUser },
  ]
  return (
    <nav className="bottom-nav">
      {items.map(({ id, label, icon: Icon }) => (
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
