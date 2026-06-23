import { useEffect, useState } from 'react'
import { getAllCards, getCourses, getCardsByCourse, getTopics, getCardsByTopic } from '../lib/cards'
import { getAllProgress, getStreak, getDailyStats } from '../lib/db'
import { isSyncConfigured, syncNow } from '../lib/sync'
import { Card } from '../types'
import './HomeScreen.css'

const NEW_PER_DAY = 15
const STATE_REVIEW = 2

interface Props {
  onStartSession: (cards: Card[], practice?: boolean) => void
  onOpenSync: () => void
}

function ProgressRing({ value, max }: { value: number; max: number }) {
  const size = 116
  const stroke = 10
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const ratio = max > 0 ? value / max : 0
  const pct = Math.round(ratio * 100)
  const offset = circ * (1 - ratio)

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--bg-elevated)" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--accent)" strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)',
            filter: ratio > 0 ? 'drop-shadow(0 0 6px rgba(247,76,0,0.55))' : 'none',
          }}
        />
      </svg>
      <div className="ring-inner">
        <span className="ring-pct">{pct}%</span>
        <span className="ring-sub">{value}/{max}</span>
        <span className="ring-lbl">learned</span>
      </div>
    </div>
  )
}

export default function HomeScreen({ onStartSession, onOpenSync }: Props) {
  const [newCount, setNewCount] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [sessionCards, setSessionCards] = useState<Card[]>([])
  const [learnedByCourse, setLearnedByCourse] = useState<Map<string, number>>(new Map())
  const [learnedByTopic, setLearnedByTopic] = useState<Map<string, number>>(new Map())
  const [totalCards, setTotalCards] = useState(0)
  const [totalLearned, setTotalLearned] = useState(0)

  useEffect(() => {
    async function load() {
      if (isSyncConfigured()) {
        try { await syncNow() } catch { /* offline — use local */ }
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
      setTotalCards(allCards.length)

      const learnedCourse = new Map<string, number>()
      const learnedTopic = new Map<string, number>()
      let learnedTotal = 0
      for (const card of allCards) {
        const p = progressMap.get(card.id)
        if (p && p.state >= STATE_REVIEW) {
          learnedCourse.set(card.course, (learnedCourse.get(card.course) ?? 0) + 1)
          const key = `${card.course}/${card.topic}`
          learnedTopic.set(key, (learnedTopic.get(key) ?? 0) + 1)
          learnedTotal++
        }
      }
      setLearnedByCourse(learnedCourse)
      setLearnedByTopic(learnedTopic)
      setTotalLearned(learnedTotal)
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
        <button className="sync-btn" onClick={onOpenSync} aria-label="Sync">⚙</button>
      </header>

      {/* ── infographic card ── */}
      <div className="infographic card-surface">
        <div className="infographic-top">
          <ProgressRing value={totalLearned} max={totalCards} />

          <div className="mini-stats">
            <div className="mini-stat">
              <span className="mini-icon">🔥</span>
              <div className="mini-body">
                <span className="mini-val">{streak}</span>
                <span className="mini-lbl">streak</span>
              </div>
            </div>
            <div className="mini-stat">
              <span className="mini-icon">✨</span>
              <div className="mini-body">
                <span className="mini-val">{newCount}</span>
                <span className="mini-lbl">new</span>
              </div>
            </div>
            <div className="mini-stat">
              <span className="mini-icon accent">↻</span>
              <div className="mini-body">
                <span className="mini-val accent">{reviewCount}</span>
                <span className="mini-lbl">review</span>
              </div>
            </div>
          </div>
        </div>

        <div className="infographic-divider" />

        <div className="course-bars">
          {courses.map((course) => {
            const total = getCardsByCourse(course).length
            const learned = learnedByCourse.get(course) ?? 0
            const pct = total > 0 ? (learned / total) * 100 : 0
            return (
              <div key={course} className="bar-row">
                <span className="bar-name">{course}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="bar-count">{learned}/{total}</span>
              </div>
            )
          })}
        </div>
      </div>

      <button
        className="btn btn-primary btn-block start-btn"
        onClick={() => onStartSession(sessionCards)}
        disabled={sessionTotal === 0}
      >
        {sessionTotal === 0 ? "That's all for today ✨" : `Start session (${sessionTotal}) →`}
      </button>

      <section className="home-courses">
        <h2 className="section-title">Courses</h2>
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
                {topics.map((t) => {
                  const topicCards = getCardsByTopic(course, t)
                  const topicLearned = learnedByTopic.get(`${course}/${t}`) ?? 0
                  return (
                    <button
                      key={t}
                      className="topic-chip"
                      onClick={(e) => {
                        e.stopPropagation()
                        onStartSession(topicCards)
                      }}
                    >
                      <span className="chip-name">{t}</span>
                      <span className="chip-progress">{topicLearned}/{topicCards.length}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}
