import type { ReactElement } from 'react'
import type { MascotId } from '../theme/presets'

/* Illustrationen: Maskottchen behalten ihre natürlichen Farben,
   nur der Fuchs teilt sich sein Orange mit dem Streak-Token (--fox). */

function Fox() {
  return (
    <>
      <polygon points="11,28 15,6 30,17" fill="var(--fox)" />
      <polygon points="53,28 49,6 34,17" fill="var(--fox)" />
      <polygon points="15.5,24 17.5,11 26,19" fill="#7a3a10" />
      <polygon points="48.5,24 46.5,11 38,19" fill="#7a3a10" />
      <ellipse cx="32" cy="37" rx="22" ry="20" fill="var(--fox)" />
      <ellipse cx="32" cy="47" rx="13" ry="9.5" fill="#fff6ee" />
      <circle cx="23.5" cy="33.5" r="3" fill="#2b1608" />
      <circle cx="40.5" cy="33.5" r="3" fill="#2b1608" />
      <circle cx="32" cy="44" r="3.2" fill="#2b1608" />
      <path d="M27 50 Q32 53.5 37 50" stroke="#2b1608" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  )
}

function Owl() {
  return (
    <>
      <polygon points="16,16 20,4 27,13" fill="#8a6dc9" />
      <polygon points="48,16 44,4 37,13" fill="#8a6dc9" />
      <ellipse cx="32" cy="36" rx="21" ry="22" fill="#9a7bd1" />
      <ellipse cx="32" cy="46" rx="12.5" ry="9.5" fill="#eee6fa" />
      <circle cx="23.5" cy="30" r="8" fill="#ffffff" />
      <circle cx="40.5" cy="30" r="8" fill="#ffffff" />
      <circle cx="24.5" cy="31" r="3.6" fill="#241536" />
      <circle cx="39.5" cy="31" r="3.6" fill="#241536" />
      <polygon points="32,44 27.5,37.5 36.5,37.5" fill="var(--gold)" />
    </>
  )
}

function Panda() {
  return (
    <>
      <circle cx="14" cy="17" r="8" fill="#2a2530" />
      <circle cx="50" cy="17" r="8" fill="#2a2530" />
      <ellipse cx="32" cy="37" rx="21.5" ry="20" fill="#ffffff" />
      <ellipse cx="23" cy="33.5" rx="6" ry="7.5" fill="#2a2530" transform="rotate(-14 23 33.5)" />
      <ellipse cx="41" cy="33.5" rx="6" ry="7.5" fill="#2a2530" transform="rotate(14 41 33.5)" />
      <circle cx="24.3" cy="32.3" r="2" fill="#ffffff" />
      <circle cx="39.7" cy="32.3" r="2" fill="#ffffff" />
      <circle cx="32" cy="44" r="3.2" fill="#2a2530" />
      <path d="M27 50 Q32 53 37 50" stroke="#2a2530" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  )
}

function Dragon() {
  return (
    <>
      <polygon points="19,15 15,3 27,10" fill="#f6e7c8" />
      <polygon points="45,15 49,3 37,10" fill="#f6e7c8" />
      <ellipse cx="32" cy="37" rx="21" ry="19.5" fill="#2fa86b" />
      <ellipse cx="32" cy="47" rx="13" ry="9" fill="#a9e6c5" />
      <circle cx="23.5" cy="32.5" r="3" fill="#12351f" />
      <circle cx="40.5" cy="32.5" r="3" fill="#12351f" />
      <circle cx="27.5" cy="46" r="1.8" fill="#12351f" />
      <circle cx="36.5" cy="46" r="1.8" fill="#12351f" />
      <path d="M26 52.5 Q32 55.5 38 52.5" stroke="#12351f" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  )
}

const FACES: Record<MascotId, () => ReactElement> = {
  fox: Fox,
  owl: Owl,
  panda: Panda,
  dragon: Dragon,
}

export function Mascot({ id, size = 48 }: { id: MascotId; size?: number }) {
  const Face = FACES[id]
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <Face />
    </svg>
  )
}
