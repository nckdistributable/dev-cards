import { useState } from 'react'
import HomeScreen from './screens/HomeScreen'
import LibraryScreen from './screens/LibraryScreen'
import SessionScreen from './screens/SessionScreen'
import SessionSummaryScreen from './screens/SessionSummaryScreen'
import { Card } from './types'
import './styles/App.css'

export type Screen =
  | { name: 'home' }
  | { name: 'course'; courseId: string }
  | { name: 'session'; cards: Card[]; courseId?: string }
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
          onOpenCourse={(courseId) => setScreen({ name: 'course', courseId })}
        />
      )}
      {screen.name === 'course' && (
        <LibraryScreen
          courseId={screen.courseId}
          onBack={() => setScreen({ name: 'home' })}
          onStartCourse={(cards, courseId) =>
            setScreen({ name: 'session', cards, courseId })
          }
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
