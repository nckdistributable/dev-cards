import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  Card as FSRSCard,
  State,
} from 'ts-fsrs'
import { CardProgress } from '../types'

export { Rating }

const params = generatorParameters({ enable_fuzz: true })
const f = fsrs(params)

export function progressToFSRS(p: CardProgress): FSRSCard {
  return {
    due: new Date(p.due),
    stability: p.stability,
    difficulty: p.difficulty,
    elapsed_days: p.elapsed_days,
    scheduled_days: p.scheduled_days,
    reps: p.reps,
    lapses: p.lapses,
    state: p.state as State,
    last_review: p.last_review ? new Date(p.last_review) : undefined,
  }
}

export function fsrsToProgress(cardId: string, card: FSRSCard): CardProgress {
  return {
    cardId,
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review?.toISOString(),
  }
}

export function newCardProgress(cardId: string): CardProgress {
  return fsrsToProgress(cardId, createEmptyCard())
}

export interface RatingOption {
  rating: Rating
  label: string
  interval: string
}

export function getRatingOptions(
  progress: CardProgress | undefined
): RatingOption[] {
  const card = progress ? progressToFSRS(progress) : createEmptyCard()
  const now = new Date()
  const schedulingCards = f.repeat(card, now)

  const ratingMap: { rating: Rating; label: string }[] = [
    { rating: Rating.Again, label: 'Снова' },
    { rating: Rating.Hard, label: 'Трудно' },
    { rating: Rating.Good, label: 'Хорошо' },
    { rating: Rating.Easy, label: 'Легко' },
  ]

  return ratingMap.map(({ rating, label }) => {
    const next = schedulingCards[rating].card
    const daysUntil = Math.round(next.scheduled_days)
    let interval = ''
    if (daysUntil === 0) interval = '< 1 дня'
    else if (daysUntil === 1) interval = '1 день'
    else if (daysUntil < 5) interval = `${daysUntil} дня`
    else interval = `${daysUntil} дней`
    return { rating, label, interval }
  })
}

export function applyRating(
  cardId: string,
  progress: CardProgress | undefined,
  rating: Rating
): CardProgress {
  const card = progress ? progressToFSRS(progress) : createEmptyCard()
  const now = new Date()
  const schedulingCards = f.repeat(card, now)
  const next = schedulingCards[rating].card
  return fsrsToProgress(cardId, next)
}
