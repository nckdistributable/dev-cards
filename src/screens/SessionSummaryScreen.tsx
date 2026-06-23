import { SessionStats } from '../App'
import './SessionSummaryScreen.css'

interface Props {
  stats: SessionStats
  onHome: () => void
}

export default function SessionSummaryScreen({ stats, onHome }: Props) {
  const accuracy = stats.graded > 0 ? Math.round((stats.correct / stats.graded) * 100) : null
  const minutes = Math.floor(stats.durationMs / 60000)
  const seconds = Math.floor((stats.durationMs % 60000) / 1000)
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
  const failed = stats.graded - stats.correct

  return (
    <div className="screen summary-screen">
      <div className="summary-content">
        <div className="summary-icon">
          {accuracy === null ? '📖' : accuracy >= 80 ? '🎉' : accuracy >= 50 ? '💪' : '👆'}
        </div>
        <h1 className="summary-title">Session complete</h1>

        <div className="summary-grid">
          <div className="summary-stat card-surface">
            <div className="summary-stat-value">{stats.total}</div>
            <div className="summary-stat-label">cards</div>
          </div>
          <div className="summary-stat card-surface">
            <div className="summary-stat-value accent">
              {accuracy === null ? '—' : `${accuracy}%`}
            </div>
            <div className="summary-stat-label">accuracy</div>
          </div>
          <div className="summary-stat card-surface">
            <div className="summary-stat-value">{timeStr}</div>
            <div className="summary-stat-label">time</div>
          </div>
        </div>

        <div className="cargo-summary">
          <pre className="cargo-output">
{`$ cargo test\n   Compiling dev-cards v0.1.0\n    Finished dev [unoptimized] target\n     Running tests\n\ntest result: ${failed === 0 ? 'ok' : 'FAILED'}. ${stats.correct} passed; ${failed} failed; ${stats.total - stats.graded} ignored`}
          </pre>
        </div>

        <button className="btn btn-primary btn-block" onClick={onHome}>
          Home
        </button>
      </div>
    </div>
  )
}
