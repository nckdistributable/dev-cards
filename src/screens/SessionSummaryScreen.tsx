import { SessionStats } from '../App'
import './SessionSummaryScreen.css'

interface Props {
  stats: SessionStats
  onHome: () => void
}

export default function SessionSummaryScreen({ stats, onHome }: Props) {
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
  const minutes = Math.floor(stats.durationMs / 60000)
  const seconds = Math.floor((stats.durationMs % 60000) / 1000)
  const timeStr = minutes > 0 ? `${minutes}м ${seconds}с` : `${seconds}с`

  return (
    <div className="screen summary-screen">
      <div className="summary-content">
        <div className="summary-icon">{accuracy >= 80 ? '🎉' : accuracy >= 50 ? '💪' : '👆'}</div>
        <h1 className="summary-title">Сессия завершена</h1>

        <div className="summary-grid">
          <div className="summary-stat card-surface">
            <div className="summary-stat-value">{stats.total}</div>
            <div className="summary-stat-label">карточек</div>
          </div>
          <div className="summary-stat card-surface">
            <div className="summary-stat-value accent">{accuracy}%</div>
            <div className="summary-stat-label">точность</div>
          </div>
          <div className="summary-stat card-surface">
            <div className="summary-stat-value">{timeStr}</div>
            <div className="summary-stat-label">время</div>
          </div>
        </div>

        <div className="cargo-summary">
          <pre className="cargo-output">
{`$ cargo test\n   Compiling dev-cards v0.1.0\n    Finished dev [unoptimized] target\n     Running tests\n\ntest result: ok. ${stats.correct} passed; ${stats.total - stats.correct} failed; 0 ignored`}
          </pre>
        </div>

        <button className="btn btn-primary btn-block" onClick={onHome}>
          На главную
        </button>
      </div>
    </div>
  )
}
