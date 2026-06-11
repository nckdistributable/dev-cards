import { useState } from 'react'
import HomeScreen from './screens/HomeScreen'
import SessionScreen from './screens/SessionScreen'
import SessionSummaryScreen from './screens/SessionSummaryScreen'
import { Card } from './types'
import './styles/App.css'

export type Screen =
  | { name: 'home' }
  | { name: 'session'; cards: Card[] }
  | { name: 'summary'; stats: SessionStats }

export interface SessionStats {
  total: number
  correct: number
  durationMs: number
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })

  return (
    <div className="app">
      {screen.name === 'home' && (
        <HomeScreen
          onStartSession={(cards) => setScreen({ name: 'session', cards })}
        />
      )}
      {screen.name === 'session' && (
        <SessionScreen
          cards={screen.cards}
          onFinish={(stats) => setScreen({ name: 'summary', stats })}
          onBack={() => setScreen({ name: 'home' })}
        />
      )}
      {screen.name === 'summary' && (
        <SessionSummaryScreen
          stats={screen.stats}
          onHome={() => setScreen({ name: 'home' })}
        />
      )}
    </div>
  )
}
