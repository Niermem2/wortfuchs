import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './data/db'
import type { Card, Profile } from './data/types'
import { DEFAULT_SETTINGS } from './data/types'
import { initAuth } from './data/auth'
import { startAutoSync } from './data/sync'
import { applyBranding } from './theme/presets'
import { BottomNav, type Tab } from './components/BottomNav'
import { HomeScreen } from './screens/HomeScreen'
import { SessionScreen } from './screens/SessionScreen'
import { CardsScreen } from './screens/CardsScreen'
import { RankingScreen } from './screens/RankingScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { LoginScreen } from './screens/LoginScreen'

export default function App() {
  const [userId, setUserId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<Tab>('learn')
  const [session, setSession] = useState<{ cards: Card[]; pool: Card[] } | null>(null)

  useEffect(() => {
    initAuth().then((p) => {
      if (p) {
        setUserId(p.id)
        startAutoSync(p.id)
      }
      setReady(true)
    })
  }, [])

  const profile = useLiveQuery(
    () => (userId ? db.profiles.get(userId) : undefined),
    [userId],
  )

  const settings = useLiveQuery(
    async () => (userId ? { ...DEFAULT_SETTINGS, ...(await db.settings.get(userId))?.data } : undefined),
    [userId],
  )

  useEffect(() => {
    if (settings) applyBranding(settings.theme, settings.mode, settings.mascot, settings.appName)
  }, [settings])

  function handleLogin(p: Profile) {
    setUserId(p.id)
    startAutoSync(p.id)
  }

  if (!ready) return null

  if (!userId) return <LoginScreen onLogin={handleLogin} />

  if (!profile || !settings) return null

  if (session) {
    return (
      <SessionScreen
        profile={profile}
        settings={settings}
        cards={session.cards}
        pool={session.pool}
        onClose={() => setSession(null)}
      />
    )
  }

  return (
    <>
      {tab === 'learn' && (
        <HomeScreen profile={profile} settings={settings} onStart={(cards, pool) => setSession({ cards, pool })} />
      )}
      {tab === 'cards' && <CardsScreen profile={profile} settings={settings} />}
      {tab === 'ranking' && <RankingScreen profile={profile} />}
      {tab === 'profile' && (
        <ProfileScreen profile={profile} settings={settings} onLogout={() => setUserId(null)} />
      )}
      <BottomNav tab={tab} onChange={setTab} />
    </>
  )
}
