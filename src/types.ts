export type CardLevel = 'beginner' | 'intermediate' | 'advanced'
export type CardType = 'concept' | 'compiles' | 'output' | 'choice' | 'fill'

export interface Card {
  id: string
  course: string
  topic: string
  level: CardLevel
  type: CardType
  concept: string
  code?: string
  question: string
  options?: string[]
  answer?: number
  expected?: 'compiles' | 'fails'
  expected_output?: string
  explanation: string
}

export interface CardProgress {
  cardId: string
  due: string
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  state: number
  last_review?: string
}

export interface DailyStats {
  date: string
  reviewed: number
  correct: number
  streak: number
}

export interface CourseInfo {
  id: string
  name: string
  topics: TopicInfo[]
}

export interface TopicInfo {
  id: string
  name: string
  totalCards: number
  learnedCards: number
  dueCards: number
}
