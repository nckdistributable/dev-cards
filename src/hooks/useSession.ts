import { useState, useCallback, useRef } from 'react'
import { Card, CardProgress } from '../types'
import {
  saveProgress,
  getProgress,
  deleteProgress,
  saveDailyStats,
  getDailyStats,
} from '../lib/db'
import { applyRating, Rating } from '../lib/srs'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export interface DeckItem {
  card: Card
  options?: string[]
  answer?: number
}

// Shuffle answer options so users learn the material, not button positions.
// Binary Yes/No (compiles) keeps its natural order.
function prepareDeck(cards: Card[]): DeckItem[] {
  return shuffle(cards).map((card) => {
    if (card.options && card.type !== 'compiles' && card.options.length > 2) {
      const order = shuffle(card.options.map((_, i) => i))
      return {
        card,
        options: order.map((i) => card.options![i]),
        answer: card.answer !== undefined ? order.indexOf(card.answer) : undefined,
      }
    }
    return { card, options: card.options, answer: card.answer }
  })
}

interface HistoryEntry {
  index: number
  cardId: string
  prevProgress?: CardProgress
  introducedNew: boolean
  graded: boolean
  wasCorrect: boolean
  requeued: boolean
  practice: boolean
}

export interface SessionState {
  currentIndex: number
  total: number
  showAnswer: boolean
  answered: boolean
  selectedOption: number | null
  isCorrect: boolean | null
  done: boolean
  correct: number
  graded: number
  rated: number
}

export function useSession(cards: Card[], practice = false) {
  const startTime = useRef(Date.now())
  const [queue, setQueue] = useState<DeckItem[]>(() => prepareDeck(cards))
  const history = useRef<HistoryEntry[]>([])
  const [state, setState] = useState<SessionState>(() => ({
    currentIndex: 0,
    total: cards.length,
    showAnswer: false,
    answered: false,
    selectedOption: null,
    isCorrect: null,
    done: false,
    correct: 0,
    graded: 0,
    rated: 0,
  }))

  const currentItem: DeckItem | null = queue[state.currentIndex] ?? null

  const selectOption = useCallback(
    (idx: number) => {
      const item = queue[state.currentIndex]
      if (!item || state.answered) return
      const isCorrect = item.answer === idx
      setState((s) => ({
        ...s,
        selectedOption: idx,
        answered: true,
        showAnswer: true,
        isCorrect,
        correct: isCorrect ? s.correct + 1 : s.correct,
        graded: s.graded + 1,
      }))
    },
    [queue, state.currentIndex, state.answered]
  )

  // Concept cards are not graded — they don't affect accuracy
  const revealConcept = useCallback(() => {
    setState((s) => ({ ...s, showAnswer: true, answered: true, isCorrect: null }))
  }, [])

  const advance = useCallback((requeue: boolean) => {
    setQueue((q) => (requeue ? [...q, q[state.currentIndex]] : q))
    setState((s) => {
      const total = requeue ? s.total + 1 : s.total
      const nextIndex = s.currentIndex + 1
      if (nextIndex >= total) {
        return { ...s, total, rated: s.rated + 1, done: true }
      }
      return {
        ...s,
        total,
        rated: s.rated + 1,
        currentIndex: nextIndex,
        showAnswer: false,
        answered: false,
        selectedOption: null,
        isCorrect: null,
      }
    })
  }, [state.currentIndex])

  // Scheduled mode: rating required. Practice mode: call without rating,
  // SRS progress is never touched and wrong cards requeue automatically.
  const applyRatingAndAdvance = useCallback(
    async (rating?: Rating) => {
      const item = queue[state.currentIndex]
      if (!item) return

      const graded = item.card.type !== 'concept'
      const wasCorrect = state.isCorrect === true
      let prevProgress: CardProgress | undefined
      let introducedNew = false
      let requeue: boolean

      if (practice) {
        requeue = graded && !wasCorrect
      } else {
        requeue = rating === Rating.Again
        prevProgress = await getProgress(item.card.id)
        introducedNew = !prevProgress
        const next = applyRating(item.card.id, prevProgress, rating ?? Rating.Good)
        await saveProgress(next)
      }

      const today = new Date().toISOString().slice(0, 10)
      const todayStats = await getDailyStats(today)
      await saveDailyStats({
        date: today,
        reviewed: (todayStats?.reviewed ?? 0) + 1,
        correct: (todayStats?.correct ?? 0) + (graded && wasCorrect ? 1 : 0),
        newIntroduced: (todayStats?.newIntroduced ?? 0) + (introducedNew ? 1 : 0),
      })

      history.current.push({
        index: state.currentIndex,
        cardId: item.card.id,
        prevProgress,
        introducedNew,
        graded,
        wasCorrect,
        requeued: requeue,
        practice,
      })

      advance(requeue)
    },
    [queue, state.currentIndex, state.isCorrect, practice, advance]
  )

  // Undo the last rated card: restore SRS progress, revert stats, go back.
  // Only allowed before the current card is answered (button hidden otherwise).
  const undo = useCallback(async () => {
    const entry = history.current.pop()
    if (!entry) return

    if (!entry.practice) {
      if (entry.prevProgress) await saveProgress(entry.prevProgress)
      else await deleteProgress(entry.cardId)
    }

    const today = new Date().toISOString().slice(0, 10)
    const todayStats = await getDailyStats(today)
    if (todayStats) {
      await saveDailyStats({
        date: today,
        reviewed: Math.max(0, todayStats.reviewed - 1),
        correct: Math.max(0, todayStats.correct - (entry.graded && entry.wasCorrect ? 1 : 0)),
        newIntroduced: Math.max(0, (todayStats.newIntroduced ?? 0) - (entry.introducedNew ? 1 : 0)),
      })
    }

    setQueue((q) => (entry.requeued ? q.slice(0, -1) : q))
    setState((s) => ({
      ...s,
      currentIndex: entry.index,
      total: entry.requeued ? s.total - 1 : s.total,
      showAnswer: false,
      answered: false,
      selectedOption: null,
      isCorrect: null,
      correct: s.correct - (entry.graded && entry.wasCorrect ? 1 : 0),
      graded: s.graded - (entry.graded ? 1 : 0),
      rated: s.rated - 1,
      done: false,
    }))
  }, [])

  const getDuration = useCallback(() => Date.now() - startTime.current, [])

  return {
    state,
    currentItem,
    selectOption,
    revealConcept,
    applyRatingAndAdvance,
    undo,
    canUndo: state.rated > 0,
    getDuration,
  }
}
