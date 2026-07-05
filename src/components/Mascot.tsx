import type { MascotId } from '../theme/presets'
import dog from '../assets/mascots/dog.svg'
import cat from '../assets/mascots/cat.svg'
import fox from '../assets/mascots/fox.svg'
import panda from '../assets/mascots/panda.svg'
import koala from '../assets/mascots/koala.svg'
import rabbit from '../assets/mascots/rabbit.svg'
import bear from '../assets/mascots/bear.svg'
import tiger from '../assets/mascots/tiger.svg'
import monkey from '../assets/mascots/monkey.svg'
import pig from '../assets/mascots/pig.svg'
import unicorn from '../assets/mascots/unicorn.svg'
import owl from '../assets/mascots/owl.svg'
import dragon from '../assets/mascots/dragon.svg'

/* Maskottchen im Memoji-Stil: eigene SVG-Zeichnungen (src/assets/mascots/),
   dieselben Dateien rastert scripts/gen-icons.mjs zu den PWA-Icons. */

const SRC: Record<MascotId, string> = {
  dog,
  cat,
  fox,
  panda,
  koala,
  rabbit,
  bear,
  tiger,
  monkey,
  pig,
  unicorn,
  owl,
  dragon,
}

export function Mascot({ id, size = 48 }: { id: MascotId; size?: number }) {
  return (
    <img
      src={SRC[id]}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{ display: 'block' }}
    />
  )
}
