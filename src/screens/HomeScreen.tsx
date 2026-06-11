import { useEffect, useState } from 'react'
import { getAllCards, getCourses, getCardsByCourse, getTopics, getCardsByTopic } from '../lib/cards'
import { getDueCards, getStreak, getDailyStats } from '../lib/db'
import { Card } from '../types'
import './HomeScreen.css'

interface Props {
  onStartSession: (cards: Card[]) => void
}

export default function HomeScreen({ onStartSession }: Props) {
  const [dueCount, setDueCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [dueCards, setDueCards] = useState<Card[]>([])
  const [todayReviewed, setTodayReviewed] = useState(0)

  useEffect(() => {
    async function load() {
      const allCards = getAllCards()
      const allIds = allCards.map((c) => c.id)
      const due = await getDueCards(allIds)
      const dueCardObjects = allCards.filter((c) => due.includes(c.id))
      setDueCards(dueCardObjects)
      setDueCount(dueCardObjects.length)
      setStreak(await getStreak())
      const today = new Date().toISOString().slice(0, 10)
      const s = await getDailyStats(today)
      setTodayReviewed(s?.reviewed ?? 0)
    }
    load()
  }, [])

  const courses = getCourses()

  return (
    <div className="screen home-screen">
      <header className="home-header">
        <div className="home-logo">
          <span className="logo-dev">dev</span>
          <span className="logo-sep">::</span>
          <span className="logo-cards">cards</span>
        </div>
      </header>

      <div className="home-stats">
        <div className="stat-card">
          <div className="stat-value accent">{dueCount}</div>
          <div className="stat-label">к повторению</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{streak}</div>
          <div className="stat-label">🔥 стрик</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{todayReviewed}</div>
          <div className="stat-label">сегодня</div>
        </div>
      </div>

      <button
        className="btn btn-primary btn-block start-btn"
        onClick={() => onStartSession(dueCards)}
        disabled={dueCount === 0}
      >
        {dueCount === 0 ? 'Нечего повторять ✨' : `Начать сессию →`}
      </button>

      <section className="home-courses">
        <h2 className="section-title">Курсы</h2>
        {courses.map((course) => {
          const topics = getTopics(course)
          const total = getCardsByCourse(course).length
          return (
            <div
              key={course}
              className="course-preview card-surface"
              onClick={() => onStartSession(getCardsByCourse(course))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onStartSession(getCardsByCourse(course))}
            >
              <div className="course-preview-header">
                <span className="course-name">{course}</span>
                <span className="course-total">{total} карт →</span>
              </div>
              <div className="topic-chips">
                {topics.map((t) => (
                  <button
                    key={t}
                    className="topic-chip"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStartSession(getCardsByTopic(course, t))
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}
