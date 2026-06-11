import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { CardProgress, DailyStats } from '../types'

interface DevCardsDB extends DBSchema {
  progress: {
    key: string
    value: CardProgress
    indexes: { 'by-due': string }
  }
  stats: {
    key: string
    value: DailyStats
  }
}

let db: IDBPDatabase<DevCardsDB> | null = null

export async function getDB(): Promise<IDBPDatabase<DevCardsDB>> {
  if (db) return db
  db = await openDB<DevCardsDB>('dev-cards', 1, {
    upgrade(db) {
      const store = db.createObjectStore('progress', { keyPath: 'cardId' })
      store.createIndex('by-due', 'due')
      db.createObjectStore('stats', { keyPath: 'date' })
    },
  })
  return db
}

export async function getProgress(cardId: string): Promise<CardProgress | undefined> {
  const db = await getDB()
  return db.get('progress', cardId)
}

export async function saveProgress(progress: CardProgress): Promise<void> {
  const db = await getDB()
  await db.put('progress', progress)
}

export async function getAllProgress(): Promise<CardProgress[]> {
  const db = await getDB()
  return db.getAll('progress')
}

export async function getDueCards(cardIds: string[]): Promise<string[]> {
  const now = new Date().toISOString()
  const all = await getAllProgress()
  const dueSet = new Set(
    all.filter((p) => p.due <= now).map((p) => p.cardId)
  )
  const newCards = cardIds.filter((id) => !all.find((p) => p.cardId === id))
  return [...newCards, ...cardIds.filter((id) => dueSet.has(id))]
}

export async function getDailyStats(date: string): Promise<DailyStats | undefined> {
  const db = await getDB()
  return db.get('stats', date)
}

export async function saveDailyStats(stats: DailyStats): Promise<void> {
  const db = await getDB()
  await db.put('stats', stats)
}

export async function getStreak(): Promise<number> {
  const db = await getDB()
  const allStats = await db.getAll('stats')
  if (allStats.length === 0) return 0
  const sorted = allStats.sort((a, b) => b.date.localeCompare(a.date))
  const today = new Date().toISOString().slice(0, 10)
  let streak = 0
  let checkDate = today
  for (const s of sorted) {
    if (s.date === checkDate && s.reviewed > 0) {
      streak++
      const d = new Date(checkDate)
      d.setDate(d.getDate() - 1)
      checkDate = d.toISOString().slice(0, 10)
    } else {
      break
    }
  }
  return streak
}
