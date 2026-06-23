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
      setMessage(`Done: ${result.total} cards in the cloud`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync error')
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
        <button className="back-btn" onClick={onBack} aria-label="Back">
          ←
        </button>
        <h1 className="screen-title">Sync</h1>
      </header>

      {!configured ? (
        <div className="sync-setup card-surface">
          <p className="sync-text">
            Progress syncs across devices through a private GitHub
            Gist. Data is stored only in your account.
          </p>
          <ol className="sync-steps">
            <li>
              Open{' '}
              <a
                href="https://github.com/settings/tokens/new?scopes=gist&description=dev-cards-sync"
                target="_blank"
                rel="noreferrer"
              >
                github.com/settings/tokens/new
              </a>
            </li>
            <li>
              The <code>gist</code> scope is already checked — click{' '}
              <strong>Generate token</strong>
            </li>
            <li>Paste the token here:</li>
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
            {syncing ? 'Connecting…' : 'Connect'}
          </button>
        </div>
      ) : (
        <div className="sync-status card-surface">
          <div className="sync-row">
            <span className="sync-label">Status</span>
            <span className="sync-value ok">connected</span>
          </div>
          <div className="sync-row">
            <span className="sync-label">Last sync</span>
            <span className="sync-value">{formatTime(lastSync)}</span>
          </div>
          <button
            className="btn btn-primary btn-block sync-now-btn"
            onClick={runSync}
            disabled={syncing}
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
          <button className="btn btn-secondary btn-block" onClick={disconnect}>
            Disconnect
          </button>
        </div>
      )}

      {message && <div className="sync-message ok">{message}</div>}
      {error && <div className="sync-message error">{error}</div>}

      <p className="sync-note">
        Sync runs automatically on startup and after each session.
        The token is stored only on this device.
      </p>
    </div>
  )
}
