import { SwapIcon, SearchIcon, UndoIcon } from './icons'

/**
 * The floating search card: start, destination, swap, and the route trigger
 * grouped as one unit. Presentational only — all state lives in App.
 */
export default function ControlPanel({
  landmarks,
  fromId,
  toId,
  usingCurrentPosition,
  onFromChange,
  onToChange,
  onFindRoute,
  onSwap,
  counts,
  disruptionCount,
  onClearDisruptions,
}) {
  const active = [
    counts.maintenance && `${counts.maintenance} maintenance`,
    counts.construction && `${counts.construction} construction`,
    counts.closed && `${counts.closed} closed`,
  ].filter(Boolean)

  return (
    <section className="panel search-card" aria-label="Route search">
      <div className="field">
        <label htmlFor="from-select">From</label>
        <select
          id="from-select"
          value={usingCurrentPosition ? '__current' : fromId}
          onChange={(e) => onFromChange(e.target.value)}
        >
          {usingCurrentPosition && (
            <option value="__current">Current position</option>
          )}
          {landmarks.map((lm) => (
            <option key={lm.id} value={lm.id}>
              {lm.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="icon-btn swap"
        onClick={onSwap}
        disabled={usingCurrentPosition}
        title={
          usingCurrentPosition
            ? 'Cannot swap while using a dropped position'
            : 'Swap start and destination'
        }
        aria-label="Swap start and destination"
      >
        <SwapIcon />
      </button>

      <div className="field">
        <label htmlFor="to-select">To</label>
        <select
          id="to-select"
          value={toId}
          onChange={(e) => onToChange(e.target.value)}
        >
          {landmarks.map((lm) => (
            <option key={lm.id} value={lm.id}>
              {lm.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="primary"
        onClick={onFindRoute}
        title="Run Dijkstra and re-centre the map on the route"
      >
        <SearchIcon />
        <span>Find route</span>
      </button>

      {disruptionCount > 0 && (
        <button
          type="button"
          className="ghost reopen"
          onClick={onClearDisruptions}
          title="Clear every disruption and restore the campus to normal"
        >
          <UndoIcon />
          <span>Clear {active.join(' · ')}</span>
        </button>
      )}
    </section>
  )
}
