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
import { TestPrepScreen } from './screens/TestPrepScreen'
import { FamilyScreen } from './screens/FamilyScreen'
import { VerbsScreen } from './screens/VerbsScreen'

export default function App() {
  const [userId, setUserId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<Tab>('learn')
  const [session, setSession] = useState<{ cards: Card[]; pool: Card[]; mode: 'learn' | 'test' } | null>(null)
  const [testPrepOpen, setTestPrepOpen] = useState(false)
  const [verbsOpen, setVerbsOpen] = useState(false)

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
        mode={session.mode}
        onClose={() => setSession(null)}
      />
    )
  }

  if (verbsOpen) {
    return <VerbsScreen profile={profile} settings={settings} onClose={() => setVerbsOpen(false)} />
  }

  if (testPrepOpen) {
    return (
      <TestPrepScreen
        profile={profile}
        settings={settings}
        onBack={() => setTestPrepOpen(false)}
        onStart={(cards, pool) => {
          setTestPrepOpen(false)
          setSession({ cards, pool, mode: 'test' })
        }}
      />
    )
  }

  return (
    <>
      {tab === 'learn' && (
        <HomeScreen
          profile={profile}
          settings={settings}
          onStart={(cards, pool) => setSession({ cards, pool, mode: 'learn' })}
          onTestPrep={() => setTestPrepOpen(true)}
          onVerbs={() => setVerbsOpen(true)}
        />
      )}
      {tab === 'cards' && <CardsScreen profile={profile} settings={settings} />}
      {tab === 'ranking' &&
        (profile.role === 'parent' ? <FamilyScreen /> : <RankingScreen profile={profile} />)}
      {tab === 'profile' && (
        <ProfileScreen profile={profile} settings={settings} onLogout={() => setUserId(null)} />
      )}
      <BottomNav tab={tab} onChange={setTab} parent={profile.role === 'parent'} />
    </>
  )
}
