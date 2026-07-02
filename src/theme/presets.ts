export type ThemeId = 'grape' | 'ocean' | 'teal' | 'pink'
export type Mode = 'auto' | 'light' | 'dark'
export type MascotId = 'fox' | 'owl' | 'panda' | 'dragon'

export const THEMES: { id: ThemeId; label: string; color: string }[] = [
  { id: 'grape', label: 'Violett', color: '#6b47e8' },
  { id: 'ocean', label: 'Ozean', color: '#2e7cf6' },
  { id: 'teal', label: 'Lagune', color: '#0ca6a6' },
  { id: 'pink', label: 'Pink', color: '#cf3fb4' },
]

export const MASCOTS: { id: MascotId; label: string }[] = [
  { id: 'fox', label: 'Fuchs' },
  { id: 'owl', label: 'Eule' },
  { id: 'panda', label: 'Panda' },
  { id: 'dragon', label: 'Drache' },
]

export const DEFAULT_APP_NAME = 'Wortfuchs'

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
let currentMode: Mode = 'auto'

function applyMode() {
  const dark = currentMode === 'dark' || (currentMode === 'auto' && darkQuery.matches)
  document.documentElement.dataset.mode = dark ? 'dark' : 'light'
}

darkQuery.addEventListener('change', applyMode)

function setLink(rel: string, href: string) {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    document.head.appendChild(link)
  }
  link.href = href
}

function setMeta(name: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = name
    document.head.appendChild(meta)
  }
  meta.content = content
}

/** Wendet Theme + Branding an. iOS liest Icon/Name beim Installieren aus dem
    aktuellen DOM — so bekommt jedes Kind Homescreen-Icon und -Namen passend
    zu seinen Einstellungen. */
export function applyBranding(theme: ThemeId, mode: Mode, mascot: MascotId, appName: string) {
  currentMode = mode
  if (theme === 'grape') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
  applyMode()

  document.title = appName
  setMeta('theme-color', THEMES.find((t) => t.id === theme)!.color)
  setMeta('apple-mobile-web-app-title', appName)
  setLink('apple-touch-icon', `/icons/${mascot}-180.png`)
  setLink('icon', `/icons/${mascot}-192.png`)
  setLink('manifest', `/manifests/${mascot}.webmanifest`)
}
