import { useEffect, useState } from 'react'
import { Card } from '../types'
import { useSession } from '../hooks/useSession'
import { getRatingOptions, Rating, RatingOption } from '../lib/srs'
import { getProgress } from '../lib/db'
import CodeBlock from '../components/CodeBlock'
import CargoFeedback from '../components/CargoFeedback'
import { SessionStats } from '../App'
import './SessionScreen.css'

interface Props {
  cards: Card[]
  practice: boolean
  onFinish: (stats: SessionStats) => void
  onBack: () => void
}

export default function SessionScreen({ cards, practice, onFinish, onBack }: Props) {
  const {
    state,
    currentItem,
    selectOption,
    revealConcept,
    applyRatingAndAdvance,
    undo,
    canUndo,
    getDuration,
  } = useSession(cards, practice)

  const [ratingOptions, setRatingOptions] = useState<RatingOption[]>([])

  useEffect(() => {
    if (state.done) {
      onFinish({
        total: state.rated,
        correct: state.correct,
        graded: state.graded,
        durationMs: getDuration(),
      })
    }
  }, [state.done])

  // Compute intervals from the card's actual progress, not a blank card
  useEffect(() => {
    if (!practice && state.showAnswer && currentItem) {
      let cancelled = false
      getProgress(currentItem.card.id).then((p) => {
        if (!cancelled) setRatingOptions(getRatingOptions(p))
      })
      return () => {
        cancelled = true
      }
    }
  }, [state.showAnswer, state.currentIndex])

  if (!currentItem) return null

  const card = currentItem.card

  // Wrong answer → only Again/Hard, so a miss can't be scheduled far away
  const visibleRatings =
    state.isCorrect === false
      ? ratingOptions.filter((o) => o.rating === Rating.Again || o.rating === Rating.Hard)
      : ratingOptions

  const LEVEL_COLORS: Record<string, string> = {
    beginner: 'var(--green)',
    intermediate: 'var(--yellow)',
    advanced: 'var(--red)',
  }

  return (
    <div className="screen session-screen">
      <header className="session-header">
        <div className="session-progress">
          <div
            className="session-progress-fill"
            style={{ width: `${(state.currentIndex / state.total) * 100}%` }}
          />
        </div>
        <span className="session-counter">{state.currentIndex + 1}/{state.total}</span>
        {canUndo && !state.answered && (
          <button className="undo-btn" onClick={undo} title="Отменить последний ответ">
            ↩
          </button>
        )}
      </header>

      <div className="card-area">
        <div className="card-meta">
          <span className="card-course">
            {card.course}/{card.topic}
            {practice && <span className="practice-badge"> · практика</span>}
          </span>
          <span
            className="card-level"
            style={{ color: LEVEL_COLORS[card.level] }}
          >
            {card.level}
          </span>
        </div>

        <div className="concept-box card-surface">
          <p className="concept-text">{card.concept}</p>
        </div>

        {card.code && <CodeBlock code={card.code} />}

        <p className="card-question">{card.question}</p>

        {!state.answered && (
          <div className="options-grid">
            {card.type === 'concept' ? (
              <button className="btn btn-primary btn-block" onClick={revealConcept}>
                Понятно
              </button>
            ) : (
              (currentItem.options ?? []).map((opt, i) => (
                <button
                  key={i}
                  className="option-btn"
                  onClick={() => selectOption(i)}
                >
                  <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                  {opt}
                </button>
              ))
            )}
          </div>
        )}

        {state.showAnswer && (
          <div className="answer-area">
            {card.type !== 'concept' && (
              <div className={`answer-badge ${state.isCorrect ? 'correct' : 'wrong'}`}>
                {state.isCorrect ? '✅ Правильно!' : '❌ Неправильно'}
              </div>
            )}

            <CargoFeedback
              correct={state.isCorrect !== false}
              explanation={card.explanation}
              variant={card.code ? 'cargo' : 'test'}
            />

            {practice ? (
              <>
                {state.isCorrect === false && (
                  <p className="requeue-hint">Карточка вернётся в конце сессии</p>
                )}
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => applyRatingAndAdvance()}
                >
                  Дальше →
                </button>
              </>
            ) : (
              <div
                className="rating-buttons"
                style={{ gridTemplateColumns: `repeat(${visibleRatings.length || 4}, 1fr)` }}
              >
                {visibleRatings.map(({ rating, label, interval }) => (
                  <button
                    key={rating}
                    className={`rating-btn rating-${label.toLowerCase()}`}
                    onClick={() => applyRatingAndAdvance(rating)}
                  >
                    <span className="rating-label">{label}</span>
                    <span className="rating-interval">{interval}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <button className="floating-back-btn" onClick={onBack} aria-label="Назад">
        ←
      </button>
    </div>
  )
}
