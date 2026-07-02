import { useState } from 'react'
import type { Profile } from '../data/types'
import { signIn } from '../data/auth'
import { Mascot } from '../components/Mascot'
import { Button } from '../components/ui'
import './screens.css'

export function LoginScreen({ onLogin }: { onLogin: (p: Profile) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      onLogin(await signIn(email, password))
    } catch {
      setError('Anmeldung fehlgeschlagen. Prüfe E-Mail und Passwort.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen login">
      <div className="login__brand">
        <Mascot id="fox" size={96} />
        <span className="login__title">Wortfuchs</span>
        <p className="home__sub">Dein Vokabeltrainer</p>
      </div>
      <form className="card profile__section" onSubmit={submit}>
        <label className="profile__row">
          <span className="caption">E-Mail</span>
          <input
            className="profile__input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="profile__row">
          <span className="caption">Passwort</span>
          <input
            className="profile__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="login__error">{error}</p>}
        <Button type="submit" block disabled={busy}>
          {busy ? 'Moment …' : 'Anmelden'}
        </Button>
      </form>
    </div>
  )
}
