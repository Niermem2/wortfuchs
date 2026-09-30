/* Text-to-Speech über die Stimmen des Geräts (Web Speech API).
   Englisch bevorzugt Britisch (Green Line); Deutsch nimmt die beste de-DE-Stimme.
   Stimme und Tempo sind pro Profil einstellbar (setSpeechPrefs). */

let voices: SpeechSynthesisVoice[] = []
let prefs: { voiceURI: string | null; rate: number } = { voiceURI: null, rate: 0.95 }
const listeners = new Set<() => void>()

function refreshVoices() {
  voices = speechSynthesis.getVoices()
  listeners.forEach((fn) => fn())
}

if ('speechSynthesis' in window) {
  refreshVoices()
  speechSynthesis.addEventListener('voiceschanged', refreshVoices)
}

export function canSpeak(): boolean {
  return 'speechSynthesis' in window
}

export function setSpeechPrefs(p: { voiceURI: string | null; rate: number }) {
  prefs = p
}

/** Benachrichtigt, wenn das Gerät seine Stimmenliste (asynchron) lädt */
export function onVoicesChanged(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function norm(lang: string) {
  return lang.replace('_', '-').toLowerCase()
}

export function listEnglishVoices(): SpeechSynthesisVoice[] {
  return voices
    .filter((v) => norm(v.lang).startsWith('en'))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export type SpeechLang = 'en' | 'de' | 'es' | 'la'

function bestVoice(lang: 'en' | 'de' | 'es'): SpeechSynthesisVoice | undefined {
  const c = voices.filter((v) => norm(v.lang).startsWith(lang))
  if (lang === 'en') {
    const preferred = prefs.voiceURI ? c.find((v) => v.voiceURI === prefs.voiceURI) : undefined
    if (preferred) return preferred
    return (
      c.find((v) => norm(v.lang) === 'en-gb' && v.localService) ??
      c.find((v) => norm(v.lang) === 'en-gb') ??
      c.find((v) => v.localService) ??
      c[0]
    )
  }
  if (lang === 'es') {
    return (
      c.find((v) => norm(v.lang) === 'es-es' && v.localService) ??
      c.find((v) => norm(v.lang) === 'es-es') ??
      c.find((v) => v.localService) ??
      c[0]
    )
  }
  return (
    c.find((v) => norm(v.lang) === 'de-de' && v.localService) ??
    c.find((v) => norm(v.lang) === 'de-de') ??
    c[0]
  )
}

export function speak(text: string, lang: SpeechLang = 'en') {
  if (lang === 'la') return // keine lateinische Stimme
  if (!canSpeak() || !text) return
  speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  const voice = bestVoice(lang)
  if (voice) utter.voice = voice
  utter.lang = voice?.lang ?? (lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-GB')
  utter.rate = prefs.rate
  speechSynthesis.speak(utter)
}
