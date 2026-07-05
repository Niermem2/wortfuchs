// Erzeugt PWA-Icons + Manifeste für alle Maskottchen aus src/assets/mascots/*.svg
// (dieselben Grafiken wie in der App). Aufruf: node scripts/gen-icons.mjs
import { readdir, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const GRAPE = '#6b47e8'
const ICONS = 'public/icons'
const MANIFESTS = 'public/manifests'

async function makeIcon(name, size, path, maskable) {
  const pad = maskable ? 0.14 : 0.08
  const inner = Math.round(size * (1 - 2 * pad))
  const svg = await readFile(`src/assets/mascots/${name}.svg`)
  const face = await sharp(svg, { density: Math.ceil((inner / 64) * 72) })
    .resize(inner, inner)
    .png()
    .toBuffer()
  const radius = maskable ? 0 : Math.round(size * 0.22)
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${GRAPE}"/></svg>`,
  )
  await sharp(bg).composite([{ input: face, gravity: 'centre' }]).png().toFile(path)
}

function manifest(name) {
  return JSON.stringify(
    {
      name: 'Wortfuchs',
      short_name: 'Wortfuchs',
      description: 'Dein Vokabeltrainer',
      lang: 'de',
      start_url: '../',
      scope: '../',
      display: 'standalone',
      orientation: 'portrait',
      theme_color: '#6B47E8',
      background_color: '#F4F1FA',
      icons: [
        { src: `../icons/${name}-192.png`, sizes: '192x192', type: 'image/png' },
        { src: `../icons/${name}-512.png`, sizes: '512x512', type: 'image/png' },
        { src: `../icons/${name}-512-maskable.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  )
}

const mascots = (await readdir('src/assets/mascots'))
  .filter((f) => f.endsWith('.svg'))
  .map((f) => f.replace('.svg', ''))

for (const name of mascots) {
  await makeIcon(name, 180, `${ICONS}/${name}-180.png`, true)
  await makeIcon(name, 192, `${ICONS}/${name}-192.png`, false)
  await makeIcon(name, 512, `${ICONS}/${name}-512.png`, false)
  await makeIcon(name, 512, `${ICONS}/${name}-512-maskable.png`, true)
  await writeFile(`${MANIFESTS}/${name}.webmanifest`, manifest(name) + '\n')
}
console.log(`Icons + Manifeste für ${mascots.length} Maskottchen erzeugt: ${mascots.join(', ')}`)
