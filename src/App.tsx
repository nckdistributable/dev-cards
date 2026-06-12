import { useState } from 'react'
import HomeScreen from './screens/HomeScreen'
import SessionScreen from './screens/SessionScreen'
import SessionSummaryScreen from './screens/SessionSummaryScreen'
import SyncScreen from './screens/SyncScreen'
import { isSyncConfigured, syncNow } from './lib/sync'
import { Card } from './types'
import './styles/App.css'

export type Screen =
  | { name: 'home' }
  | { name: 'session'; cards: Card[]; practice?: boolean }
  | { name: 'summary'; stats: SessionStats }
  | { name: 'sync' }

export interface SessionStats {
  total: number
  correct: number
  graded: number
  durationMs: number
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })

  return (
    <div className="app">
      {screen.name === 'home' && (
        <HomeScreen
          onStartSession={(cards, practice) =>
            setScreen({ name: 'session', cards, practice })
          }
          onOpenSync={() => setScreen({ name: 'sync' })}
        />
      )}
      {screen.name === 'session' && (
        <SessionScreen
          cards={screen.cards}
          practice={screen.practice ?? false}
          onFinish={(stats) => {
            setScreen({ name: 'summary', stats })
            // push fresh progress to the gist in the background
            if (isSyncConfigured()) void syncNow().catch(() => {})
          }}
          onBack={() => setScreen({ name: 'home' })}
        />
      )}
      {screen.name === 'summary' && (
        <SessionSummaryScreen
          stats={screen.stats}
          onHome={() => setScreen({ name: 'home' })}
        />
      )}
      {screen.name === 'sync' && (
        <SyncScreen onBack={() => setScreen({ name: 'home' })} />
      )}
    </div>
  )
}
