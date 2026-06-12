import { useState } from 'react'
import {
  isSyncConfigured,
  setToken,
  clearSyncConfig,
  syncNow,
  getLastSync,
} from '../lib/sync'
import './SyncScreen.css'

interface Props {
  onBack: () => void
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SyncScreen({ onBack }: Props) {
  const [configured, setConfigured] = useState(isSyncConfigured())
  const [tokenInput, setTokenInput] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState(getLastSync())

  async function runSync() {
    setSyncing(true)
    setError(null)
    setMessage(null)
    try {
      const result = await syncNow()
      setLastSync(result.at)
      setMessage(`Готово: ${result.total} карточек в облаке`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка синхронизации')
    } finally {
      setSyncing(false)
    }
  }

  async function connect() {
    const token = tokenInput.trim()
    if (!token) return
    setToken(token)
    setConfigured(true)
    setTokenInput('')
    await runSync()
  }

  function disconnect() {
    clearSyncConfig()
    setConfigured(false)
    setLastSync(null)
    setMessage(null)
    setError(null)
  }

  return (
    <div className="screen sync-screen">
      <header className="screen-header">
        <button className="back-btn" onClick={onBack} aria-label="Назад">
          ←
        </button>
        <h1 className="screen-title">Синхронизация</h1>
      </header>

      {!configured ? (
        <div className="sync-setup card-surface">
          <p className="sync-text">
            Прогресс синхронизируется между устройствами через приватный GitHub
            Gist. Данные хранятся только в твоём аккаунте.
          </p>
          <ol className="sync-steps">
            <li>
              Открой{' '}
              <a
                href="https://github.com/settings/tokens/new?scopes=gist&description=dev-cards-sync"
                target="_blank"
                rel="noreferrer"
              >
                github.com/settings/tokens/new
              </a>
            </li>
            <li>
              Scope <code>gist</code> уже отмечен — нажми{' '}
              <strong>Generate token</strong>
            </li>
            <li>Вставь токен сюда:</li>
          </ol>
          <input
            className="sync-input"
            type="password"
            placeholder="ghp_..."
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button
            className="btn btn-primary btn-block"
            onClick={connect}
            disabled={!tokenInput.trim() || syncing}
          >
            {syncing ? 'Подключаю…' : 'Подключить'}
          </button>
        </div>
      ) : (
        <div className="sync-status card-surface">
          <div className="sync-row">
            <span className="sync-label">Статус</span>
            <span className="sync-value ok">подключено</span>
          </div>
          <div className="sync-row">
            <span className="sync-label">Последний синк</span>
            <span className="sync-value">{formatTime(lastSync)}</span>
          </div>
          <button
            className="btn btn-primary btn-block sync-now-btn"
            onClick={runSync}
            disabled={syncing}
          >
            {syncing ? 'Синхронизирую…' : 'Синхронизировать сейчас'}
          </button>
          <button className="btn btn-secondary btn-block" onClick={disconnect}>
            Отключить
          </button>
        </div>
      )}

      {message && <div className="sync-message ok">{message}</div>}
      {error && <div className="sync-message error">{error}</div>}

      <p className="sync-note">
        Синк выполняется автоматически при запуске и после каждой сессии.
        Токен хранится только на этом устройстве.
      </p>
    </div>
  )
}
