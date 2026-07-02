import { useEffect, useState } from 'react'
import type { Profile, SettingsData, Direction, InputMode } from '../data/types'
import { THEMES, MASCOTS, type Mode } from '../theme/presets'
import { updateSettings } from '../data/settings'
import { isLocalMode, signOut } from '../data/auth'
import { fullSync, getSyncState, onSyncState, type SyncState } from '../data/sync'
import { levelProgress } from '../learn/srs'
import { Mascot } from '../components/Mascot'
import { Button, LevelRing } from '../components/ui'
import './screens.css'

const SYNC_LABEL: Record<SyncState, string> = {
  local: 'Lokaler Modus (kein Backend verbunden)',
  idle: 'Synchronisiert',
  syncing: 'Synchronisiert …',
  offline: 'Offline — wird nachgeholt',
  error: 'Sync-Fehler — versucht es später erneut',
}

export function ProfileScreen({
  profile,
  settings,
  onLogout,
}: {
  profile: Profile
  settings: SettingsData
  onLogout: () => void
}) {
  const [sync, setSync] = useState<SyncState>(getSyncState())
  useEffect(() => onSyncState(setSync), [])

  const set = (patch: Partial<SettingsData>) => updateSettings(profile.id, patch)

  return (
    <div className="screen">
      <h1>Profil</h1>

      <div className="card home__hello">
        <LevelRing mascot={settings.mascot} level={profile.level} progress={levelProgress(profile.xp)} size={80} />
        <div>
          <h2>{profile.display_name}</h2>
          <p className="home__sub">
            Level {profile.level} · {profile.xp} XP
            {profile.role === 'parent' && ' · Eltern-Konto'}
          </p>
        </div>
      </div>

      <div className="card profile__section">
        <h3>Deine App</h3>
        <label className="profile__row">
          <span className="caption">App-Name</span>
          <input
            className="profile__input"
            value={settings.appName}
            maxLength={20}
            onChange={(e) => set({ appName: e.target.value || 'Wortfuchs' })}
          />
        </label>

        <span className="caption">Maskottchen</span>
        <div className="profile__mascots">
          {MASCOTS.map((m) => (
            <button
              key={m.id}
              className={`profile__mascot ${settings.mascot === m.id ? 'profile__mascot--active' : ''}`}
              onClick={() => set({ mascot: m.id })}
              aria-label={m.label}
              aria-pressed={settings.mascot === m.id}
            >
              <Mascot id={m.id} size={44} />
            </button>
          ))}
        </div>

        <span className="caption">Farbe</span>
        <div className="profile__themes">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`profile__theme ${settings.theme === t.id ? 'profile__theme--active' : ''}`}
              style={{ background: t.color }}
              onClick={() => set({ theme: t.id })}
              aria-label={t.label}
              aria-pressed={settings.theme === t.id}
            />
          ))}
        </div>

        <label className="profile__row">
          <span className="caption">Darstellung</span>
          <select
            className="profile__input"
            value={settings.mode}
            onChange={(e) => set({ mode: e.target.value as Mode })}
          >
            <option value="auto">Automatisch</option>
            <option value="light">Hell</option>
            <option value="dark">Dunkel</option>
          </select>
        </label>
      </div>

      <div className="card profile__section">
        <h3>Lernen</h3>
        <label className="profile__row">
          <span className="caption">Abfragerichtung</span>
          <select
            className="profile__input"
            value={settings.direction}
            onChange={(e) => set({ direction: e.target.value as Direction })}
          >
            <option value="de-en">Deutsch → Englisch</option>
            <option value="en-de">Englisch → Deutsch</option>
            <option value="mixed">Gemischt</option>
          </select>
        </label>
        <label className="profile__row">
          <span className="caption">Abfrageart</span>
          <select
            className="profile__input"
            value={settings.inputMode}
            onChange={(e) => set({ inputMode: e.target.value as InputMode })}
          >
            <option value="choice">Auswahl (Multiple Choice)</option>
            <option value="type">Tippen</option>
            <option value="reveal">Selbst bewerten</option>
          </select>
        </label>
        <label className="profile__row">
          <span className="caption">Karten pro Session</span>
          <select
            className="profile__input"
            value={settings.dailyGoal}
            onChange={(e) => set({ dailyGoal: Number(e.target.value) })}
          >
            {[10, 20, 30, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="profile__row profile__row--inline">
          <span>Tippfehler verzeihen</span>
          <button
            role="switch"
            aria-checked={settings.typoTolerance}
            className={`switch ${settings.typoTolerance ? 'switch--on' : ''}`}
            onClick={() => set({ typoTolerance: !settings.typoTolerance })}
          >
            <span className="switch__knob" />
          </button>
        </div>
      </div>

      <div className="card profile__section">
        <h3>Daten</h3>
        <p className="home__sub">{SYNC_LABEL[sync]}</p>
        {!isLocalMode() && (
          <>
            <Button variant="secondary" block onClick={() => fullSync(profile.id)}>
              Jetzt synchronisieren
            </Button>
            <Button
              variant="ghost"
              block
              onClick={async () => {
                await signOut()
                onLogout()
              }}
            >
              Abmelden
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
