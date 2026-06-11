import { useState, useCallback, useRef } from 'react'
import { Card } from '../types'
import { saveProgress, getProgress, saveDailyStats, getDailyStats, getStreak } from '../lib/db'
import { applyRating, Rating, newCardProgress } from '../lib/srs'

export interface SessionState {
  currentCard: Card | null
  currentIndex: number
  total: number
  showAnswer: boolean
  answered: boolean
  selectedOption: number | null
  isCorrect: boolean | null
  done: boolean
  correct: number
}

export function useSession(cards: Card[]) {
  const startTime = useRef(Date.now())
  const [state, setState] = useState<SessionState>({
    currentCard: cards[0] ?? null,
    currentIndex: 0,
    total: cards.length,
    showAnswer: false,
    answered: false,
    selectedOption: null,
    isCorrect: null,
    done: false,
    correct: 0,
  })

  const selectOption = useCallback(
    (idx: number) => {
      const card = cards[state.currentIndex]
      if (!card || state.answered) return
      const isCorrect = card.type === 'concept' ? true : card.answer === idx
      setState((s) => ({
        ...s,
        selectedOption: idx,
        answered: true,
        showAnswer: true,
        isCorrect,
        correct: isCorrect ? s.correct + 1 : s.correct,
      }))
    },
    [cards, state.currentIndex, state.answered]
  )

  const revealConcept = useCallback(() => {
    setState((s) => ({ ...s, showAnswer: true, answered: true, isCorrect: true, correct: s.correct + 1 }))
  }, [])

  const applyRatingAndAdvance = useCallback(
    async (rating: Rating) => {
      const card = cards[state.currentIndex]
      if (!card) return

      const existing = await getProgress(card.id)
      const next = applyRating(card.id, existing, rating)
      await saveProgress(next)

      // update daily stats
      const today = new Date().toISOString().slice(0, 10)
      const todayStats = await getDailyStats(today)
      const updated = {
        date: today,
        reviewed: (todayStats?.reviewed ?? 0) + 1,
        correct: (todayStats?.correct ?? 0) + (state.isCorrect ? 1 : 0),
        streak: await getStreak(),
      }
      await saveDailyStats(updated)

      const nextIndex = state.currentIndex + 1
      if (nextIndex >= cards.length) {
        setState((s) => ({ ...s, done: true }))
      } else {
        setState((s) => ({
          ...s,
          currentIndex: nextIndex,
          currentCard: cards[nextIndex],
          showAnswer: false,
          answered: false,
          selectedOption: null,
          isCorrect: null,
        }))
      }
    },
    [cards, state.currentIndex, state.isCorrect]
  )

  const getDuration = useCallback(() => Date.now() - startTime.current, [])

  return { state, selectOption, revealConcept, applyRatingAndAdvance, getDuration }
}
