/**
 * Compact result cards, overlaid on the map. Shows the route outcome and
 * nothing else — the algorithm narration lives in the notes drawer.
 */
export default function ResultsPanel({ result, meta }) {
  if (!result) return null

  if (!result.ok) {
    return (
      <section className="panel results results--error" role="status">
        <p className="error-msg">{result.error}</p>
      </section>
    )
  }

  return (
    <section className="panel results" role="status">
      <div className="cards">
        <div className="card" title="Total length of the walked path">
          <span className="card-label">Distance</span>
          <span className="card-value">
            {result.distance}
            <small> m</small>
          </span>
        </div>
        <div className="card" title="At an average pace of 1.3 m/s">
          <span className="card-label">Walk</span>
          <span className="card-value">
            {result.minutes}
            <small> min</small>
          </span>
        </div>
        <div
          className="card"
          title="Nodes Dijkstra finalised before reaching the destination"
        >
          <span className="card-label">Settled</span>
          <span className="card-value">
            {result.settled}
            <small> / {meta.nodes}</small>
          </span>
        </div>
        <div className="card" title="Junctions between start and destination">
          <span className="card-label">Waypoints</span>
          <span className="card-value">{result.waypoints}</span>
        </div>

        {result.disrupted && (
          <div
            className="card card--impact"
            title="Extra distance and time versus the same trip on a clear campus"
          >
            <span className="card-label">
              {result.rerouted ? 'Detour' : 'Impact'}
            </span>
            <span className="card-value">
              {result.detourMetres > 0 ? '+' : ''}
              {result.detourMetres}
              <small> m</small>
              {result.delayMinutes > 0 && (
                <small> · +{result.delayMinutes} min</small>
              )}
            </span>
          </div>
        )}
      </div>

      {result.notes.length > 0 && (
        <p className="results-note">{result.notes.join(' · ')}</p>
      )}
    </section>
  )
}
