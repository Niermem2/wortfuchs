/* Text-to-Speech für englische Wörter und Beispielsätze (Web Speech API).
   Auf iOS ab Werk verfügbar, funktioniert auch offline mit Systemstimmen. */

let voice: SpeechSynthesisVoice | undefined

function pickVoice() {
  const voices = speechSynthesis.getVoices()
  voice =
    voices.find((v) => v.lang === 'en-GB' && v.localService) ??
    voices.find((v) => v.lang === 'en-GB') ??
    voices.find((v) => v.lang.startsWith('en') && v.localService) ??
    voices.find((v) => v.lang.startsWith('en'))
}

if ('speechSynthesis' in window) {
  pickVoice()
  speechSynthesis.addEventListener('voiceschanged', pickVoice)
}

export function canSpeak(): boolean {
  return 'speechSynthesis' in window
}

export function speak(text: string) {
  if (!canSpeak() || !text) return
  speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = voice?.lang ?? 'en-GB'
  if (voice) utter.voice = voice
  utter.rate = 0.95
  speechSynthesis.speak(utter)
}
