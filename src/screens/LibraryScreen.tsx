import { useEffect, useState } from 'react'
import { getCourses, getCardsByCourse, getTopics, getCardsByTopic } from '../lib/cards'
import { getAllProgress } from '../lib/db'
import { Card } from '../types'
import './LibraryScreen.css'

interface Props {
  courseId?: string
  onBack: () => void
  onStartCourse: (cards: Card[], courseId: string) => void
}

interface CourseData {
  id: string
  totalCards: number
  learnedCards: number
  dueCards: number
  topics: { id: string; total: number; learned: number; due: number }[]
}

export default function LibraryScreen({ courseId, onBack, onStartCourse }: Props) {
  const [courses, setCourses] = useState<CourseData[]>([])

  useEffect(() => {
    async function load() {
      const allProgress = await getAllProgress()
      const progressMap = new Map(allProgress.map((p) => [p.cardId, p]))
      const now = new Date().toISOString()

      const courseIds = courseId ? [courseId] : getCourses()
      const data: CourseData[] = courseIds.map((id) => {
        const cards = getCardsByCourse(id)
        const topics = getTopics(id).map((topicId) => {
          const tc = getCardsByTopic(id, topicId)
          const learned = tc.filter((c) => progressMap.has(c.id)).length
          const due = tc.filter((c) => {
            const p = progressMap.get(c.id)
            return !p || p.due <= now
          }).length
          return { id: topicId, total: tc.length, learned, due }
        })
        const learned = cards.filter((c) => progressMap.has(c.id)).length
        const due = cards.filter((c) => {
          const p = progressMap.get(c.id)
          return !p || p.due <= now
        }).length
        return { id, totalCards: cards.length, learnedCards: learned, dueCards: due, topics }
      })
      setCourses(data)
    }
    load()
  }, [courseId])

  function startCourse(id: string) {
    onStartCourse(getCardsByCourse(id), id)
  }

  function startTopic(id: string, topicId: string) {
    onStartCourse(getCardsByTopic(id, topicId), id)
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <span className="screen-title">{courseId ?? 'Библиотека'}</span>
      </header>

      <div className="library-list">
        {courses.map((course) => (
          <div key={course.id} className="course-card card-surface">
            <div className="course-card-header">
              <span className="course-card-name">{course.id}</span>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => startCourse(course.id)}
              >
                Старт
              </button>
            </div>
            <div className="course-progress-bar">
              <div
                className="course-progress-fill"
                style={{ width: `${(course.learnedCards / course.totalCards) * 100}%` }}
              />
            </div>
            <div className="course-card-stats">
              <span>{course.learnedCards}/{course.totalCards} изучено</span>
              {course.dueCards > 0 && <span className="accent">{course.dueCards} к повторению</span>}
            </div>
            <div className="topic-list">
              {course.topics.map((t) => (
                <div key={t.id} className="topic-row">
                  <span className="topic-name">{t.id}</span>
                  <div className="topic-row-right">
                    <span className="topic-stats">{t.learned}/{t.total}</span>
                    <button
                      className="topic-start-btn"
                      onClick={() => startTopic(course.id, t.id)}
                    >
                      →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
