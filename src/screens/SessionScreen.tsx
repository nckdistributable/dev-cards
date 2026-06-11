import { useEffect } from 'react'
import { Card } from '../types'
import { useSession } from '../hooks/useSession'
import { getRatingOptions } from '../lib/srs'
import CodeBlock from '../components/CodeBlock'
import CargoFeedback from '../components/CargoFeedback'
import { SessionStats } from '../App'
import './SessionScreen.css'

interface Props {
  cards: Card[]
  onFinish: (stats: SessionStats) => void
  onBack: () => void
}

export default function SessionScreen({ cards, onFinish, onBack }: Props) {
  const { state, selectOption, revealConcept, applyRatingAndAdvance, getDuration } = useSession(cards)

  useEffect(() => {
    if (state.done) {
      onFinish({
        total: state.total,
        correct: state.correct,
        durationMs: getDuration(),
      })
    }
  }, [state.done])

  if (!state.currentCard) return null

  const card = state.currentCard
  const ratingOptions = getRatingOptions(undefined)

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
      </header>

      <div className="card-area">
        <div className="card-meta">
          <span className="card-course">{card.course}/{card.topic}</span>
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
              (card.options ?? []).map((opt, i) => (
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
              correct={state.isCorrect ?? true}
              explanation={card.explanation}
            />

            <div className="rating-buttons">
              {ratingOptions.map(({ rating, label, interval }) => (
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
          </div>
        )}
      </div>

      <button className="floating-back-btn" onClick={onBack} aria-label="Назад">
        ←
      </button>
    </div>
  )
}
