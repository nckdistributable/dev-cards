import { CardProgress, DailyStats } from '../types'
import { getDB } from './db'

const GIST_FILENAME = 'dev-cards-sync.json'
const TOKEN_KEY = 'devcards.gistToken'
const GIST_ID_KEY = 'devcards.gistId'
const LAST_SYNC_KEY = 'devcards.lastSync'
const API = 'https://api.github.com'

interface SyncPayload {
  version: 1
  progress: CardProgress[]
  stats: DailyStats[]
}

export interface SyncResult {
  total: number
  at: string
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token.trim())
}

export function isSyncConfigured(): boolean {
  return !!getToken()
}

export function getGistId(): string | null {
  return localStorage.getItem(GIST_ID_KEY)
}

export function getLastSync(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY)
}

export function clearSyncConfig(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(GIST_ID_KEY)
  localStorage.removeItem(LAST_SYNC_KEY)
}

async function ghFetch(path: string, token: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      ...init?.headers,
    },
  })
  if (res.status === 401) {
    throw new Error('Token rejected by GitHub. Make sure it has not expired and has the "gist" scope.')
  }
  return res
}

function parsePayload(content: string): SyncPayload | null {
  try {
    const data = JSON.parse(content)
    if (data && Array.isArray(data.progress) && Array.isArray(data.stats)) {
      return data as SyncPayload
    }
  } catch {
    // corrupted remote — treat as empty, local state will overwrite it
  }
  return null
}

interface GistFile {
  content: string
  truncated?: boolean
  raw_url?: string
}

async function readGistPayload(gist: { files: Record<string, GistFile> }): Promise<SyncPayload | null> {
  const file = gist.files[GIST_FILENAME]
  if (!file) return null
  let content = file.content
  if (file.truncated && file.raw_url) {
    const raw = await fetch(file.raw_url)
    content = await raw.text()
  }
  return parsePayload(content)
}

async function findOrCreateGist(token: string): Promise<{ id: string; payload: SyncPayload | null }> {
  // 1) known gist id from a previous sync on this device
  const cachedId = getGistId()
  if (cachedId) {
    const res = await ghFetch(`/gists/${cachedId}`, token)
    if (res.ok) {
      const gist = await res.json()
      return { id: cachedId, payload: await readGistPayload(gist) }
    }
    localStorage.removeItem(GIST_ID_KEY)
  }

  // 2) look for an existing sync gist (created on another device)
  const listRes = await ghFetch('/gists?per_page=100', token)
  if (!listRes.ok) throw new Error(`GitHub API: ${listRes.status}`)
  const gists: Array<{ id: string; files: Record<string, GistFile> }> = await listRes.json()
  const existing = gists.find((g) => GIST_FILENAME in g.files)
  if (existing) {
    const res = await ghFetch(`/gists/${existing.id}`, token)
    if (!res.ok) throw new Error(`GitHub API: ${res.status}`)
    const gist = await res.json()
    localStorage.setItem(GIST_ID_KEY, existing.id)
    return { id: existing.id, payload: await readGistPayload(gist) }
  }

  // 3) first device — create a private gist
  const empty: SyncPayload = { version: 1, progress: [], stats: [] }
  const createRes = await ghFetch('/gists', token, {
    method: 'POST',
    body: JSON.stringify({
      description: 'dev::cards — sync data (managed automatically)',
      public: false,
      files: { [GIST_FILENAME]: { content: JSON.stringify(empty) } },
    }),
  })
  if (!createRes.ok) throw new Error(`Failed to create gist: ${createRes.status}`)
  const created = await createRes.json()
  localStorage.setItem(GIST_ID_KEY, created.id)
  return { id: created.id, payload: empty }
}

// later last_review wins; ties broken by reps so a fresh device never clobbers progress
function pickProgress(a: CardProgress, b: CardProgress): CardProgress {
  const ar = a.last_review ?? ''
  const br = b.last_review ?? ''
  if (ar !== br) return ar > br ? a : b
  return a.reps >= b.reps ? a : b
}

function pickStats(a: DailyStats, b: DailyStats): DailyStats {
  return a.reviewed >= b.reviewed ? a : b
}

export async function syncNow(): Promise<SyncResult> {
  const token = getToken()
  if (!token) throw new Error('Sync is not configured')

  const { id, payload } = await findOrCreateGist(token)

  const db = await getDB()
  const localProgress = await db.getAll('progress')
  const localStats = await db.getAll('stats')

  const progressMap = new Map(localProgress.map((p) => [p.cardId, p]))
  for (const remote of payload?.progress ?? []) {
    const local = progressMap.get(remote.cardId)
    progressMap.set(remote.cardId, local ? pickProgress(local, remote) : remote)
  }

  const statsMap = new Map(localStats.map((s) => [s.date, s]))
  for (const remote of payload?.stats ?? []) {
    const local = statsMap.get(remote.date)
    statsMap.set(remote.date, local ? pickStats(local, remote) : remote)
  }

  const merged: SyncPayload = {
    version: 1,
    progress: [...progressMap.values()],
    stats: [...statsMap.values()],
  }

  const tx = db.transaction(['progress', 'stats'], 'readwrite')
  for (const p of merged.progress) tx.objectStore('progress').put(p)
  for (const s of merged.stats) tx.objectStore('stats').put(s)
  await tx.done

  const patchRes = await ghFetch(`/gists/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify({
      files: { [GIST_FILENAME]: { content: JSON.stringify(merged) } },
    }),
  })
  if (!patchRes.ok) throw new Error(`Failed to save gist: ${patchRes.status}`)

  const at = new Date().toISOString()
  localStorage.setItem(LAST_SYNC_KEY, at)
  return { total: merged.progress.length, at }
}
