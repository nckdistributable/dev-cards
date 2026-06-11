import './CargoFeedback.css'

interface Props {
  correct: boolean
  explanation: string
  errorCode?: string
  variant?: 'cargo' | 'test'
}

const ERROR_CODES: Record<string, string> = {
  'E0382': 'use of moved value',
  'E0502': 'cannot borrow as mutable because also borrowed as immutable',
  'E0505': 'cannot move because borrowed',
  'E0508': 'cannot move out of borrowed content',
  'E0106': 'missing lifetime specifier',
  'E0597': 'value does not live long enough',
  'E0499': 'cannot borrow as mutable more than once',
  'E0716': 'temporary value dropped while borrowed',
}

export default function CargoFeedback({ correct, explanation, errorCode, variant = 'cargo' }: Props) {
  const code = errorCode ?? (correct ? null : guessErrorCode(explanation))

  return (
    <div className={`cargo-feedback ${correct ? 'cargo-ok' : 'cargo-err'}`}>
      <div className="cargo-header">
        <span className="cargo-icon">{correct ? '✓' : '✗'}</span>
        {variant === 'test' ? (
          <span className="cargo-status">
            {correct ? (
              <>
                <span className="cargo-finished">test result: ok.</span> 1 passed; 0 failed
              </>
            ) : (
              <span className="cargo-errcode">
                test result: FAILED. <span className="cargo-errdesc">0 passed; 1 failed</span>
              </span>
            )}
          </span>
        ) : correct ? (
          <span className="cargo-status">
            <span className="cargo-compiling">Compiling</span>{' '}
            <span className="cargo-crate">playground v0.1.0</span>
            <br />
            <span className="cargo-finished">Finished</span>{' '}dev target in 0.42s
          </span>
        ) : (
          <span className="cargo-status">
            {code && (
              <span className="cargo-errcode">
                error[{code}]:{' '}
                <span className="cargo-errdesc">{ERROR_CODES[code] ?? 'compile error'}</span>
              </span>
            )}
            {!code && <span className="cargo-errcode">error: compile error</span>}
          </span>
        )}
      </div>
      <div className="cargo-explanation">{explanation}</div>
    </div>
  )
}

function guessErrorCode(text: string): string | undefined {
  const match = text.match(/E\d{4}/)
  return match?.[0]
}
