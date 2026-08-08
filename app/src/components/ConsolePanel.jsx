import { MinimiseIcon, RestoreIcon, CloseIcon } from './icons'

/**
 * The console-style output the assignment brief asks for, kept verbatim:
 *
 *   FINDING THE SHORTEST PATH FROM <A> TO <B> USING DIJKSTRA'S ALGORITHM
 *
 * Minimisable so it can collapse to its title bar during a demo without
 * losing the requirement from the page.
 */
export default function ConsolePanel({
  result,
  minimised,
  onToggleMinimise,
  onClose,
}) {
  if (!result) return null

  return (
    <section
      className={`panel console-panel${minimised ? ' is-min' : ''}`}
      aria-label="Algorithm output"
    >
      <header className="console-bar">
        <span className="console-title">Output</span>
        <span className="console-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={onToggleMinimise}
            title={minimised ? 'Expand output' : 'Minimise output'}
            aria-expanded={!minimised}
          >
            {minimised ? <RestoreIcon /> : <MinimiseIcon />}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            title="Hide output"
            aria-label="Hide output"
          >
            <CloseIcon />
          </button>
        </span>
      </header>

      {!minimised && (
        <pre className="console">
          <span
            className={`console-head${result.ok ? '' : ' console-head--error'}`}
          >
            {result.headline}
          </span>
          {'\n\n'}
          {result.body}
        </pre>
      )}
    </section>
  )
}
