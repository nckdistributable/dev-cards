import { useEffect, useState } from 'react'
import { getAllCards, getCourses, getCardsByCourse, getTopics, getCardsByTopic } from '../lib/cards'
import { getAllProgress, getStreak, getDailyStats } from '../lib/db'
import { isSyncConfigured, syncNow } from '../lib/sync'
import { Card } from '../types'
import './HomeScreen.css'

const NEW_PER_DAY = 15
// FSRS state: 0 = New, 1 = Learning, 2 = Review, 3 = Relearning
const STATE_REVIEW = 2

interface Props {
  onStartSession: (cards: Card[], practice?: boolean) => void
  onOpenSync: () => void
}

export default function HomeScreen({ onStartSession, onOpenSync }: Props) {
  const [newCount, setNewCount] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionCards, setSessionCards] = useState<Card[]>([])
  const [learnedByCourse, setLearnedByCourse] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    async function load() {
      // pull progress from other devices before computing counters
      if (isSyncConfigured()) {
        try {
          await syncNow()
        } catch {
          // offline or token problem — fall back to local data
        }
      }
      const allCards = getAllCards()
      const allProgress = await getAllProgress()
      const progressMap = new Map(allProgress.map((p) => [p.cardId, p]))
      const now = new Date().toISOString()

      const newCards = allCards.filter((c) => !progressMap.has(c.id))
      const dueReview = allCards.filter((c) => {
        const p = progressMap.get(c.id)
        return p !== undefined && p.due <= now
      })

      const today = new Date().toISOString().slice(0, 10)
      const todayStats = await getDailyStats(today)
      const introducedToday = todayStats?.newIntroduced ?? 0
      const newLimit = Math.max(0, NEW_PER_DAY - introducedToday)
      const limitedNew = newCards.slice(0, newLimit)

      setSessionCards([...limitedNew, ...dueReview])
      setNewCount(limitedNew.length)
      setReviewCount(dueReview.length)
      setStreak(await getStreak())

      // learned = card reached Review state, not just "was seen once"
      const learned = new Map<string, number>()
      for (const card of allCards) {
        const p = progressMap.get(card.id)
        if (p && p.state >= STATE_REVIEW) {
          learned.set(card.course, (learned.get(card.course) ?? 0) + 1)
        }
      }
      setLearnedByCourse(learned)
    }
    load()
  }, [])

  const courses = getCourses()
  const sessionTotal = sessionCards.length

  return (
    <div className="screen home-screen">
      <header className="home-header">
        <div className="home-logo">
          <span className="logo-dev">dev</span>
          <span className="logo-sep">::</span>
          <span className="logo-cards">cards</span>
        </div>
        <button className="sync-btn" onClick={onOpenSync} aria-label="Синхронизация">
          ⚙
        </button>
      </header>

      <div className="home-stats">
        <div className="stat-card">
          <div className="stat-value">{newCount}</div>
          <div className="stat-label">новые</div>
        </div>
        <div className="stat-card">
          <div className="stat-value accent">{reviewCount}</div>
          <div className="stat-label">повторить</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{streak}</div>
          <div className="stat-label">🔥 стрик</div>
        </div>
      </div>

      <button
        className="btn btn-primary btn-block start-btn"
        onClick={() => onStartSession(sessionCards)}
        disabled={sessionTotal === 0}
      >
        {sessionTotal === 0 ? 'На сегодня всё ✨' : `Начать сессию (${sessionTotal}) →`}
      </button>

      <section className="home-courses">
        <h2 className="section-title">Курсы</h2>
        {courses.map((course) => {
          const topics = getTopics(course)
          const total = getCardsByCourse(course).length
          const learned = learnedByCourse.get(course) ?? 0
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
                <span className="course-total">{learned}/{total} →</span>
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
