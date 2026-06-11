import { Card } from '../types'

// Load all cards from course JSON files bundled at build time
const cardModules = import.meta.glob('/courses/**/*.json', { eager: true })

let _allCards: Card[] | null = null

export function getAllCards(): Card[] {
  if (_allCards) return _allCards
  const cards: Card[] = []
  for (const path in cardModules) {
    const module = cardModules[path] as { default?: Card[] } | Card[]
    const data = Array.isArray(module) ? module : (module as any).default
    if (Array.isArray(data)) cards.push(...data)
  }
  _allCards = cards
  return cards
}

export function getCardsByCourse(course: string): Card[] {
  return getAllCards().filter((c) => c.course === course)
}

export function getCourses(): string[] {
  return [...new Set(getAllCards().map((c) => c.course))]
}

export function getTopics(course: string): string[] {
  return [...new Set(getCardsByCourse(course).map((c) => c.topic))]
}

export function getCardsByTopic(course: string, topic: string): Card[] {
  return getAllCards().filter((c) => c.course === course && c.topic === topic)
}
