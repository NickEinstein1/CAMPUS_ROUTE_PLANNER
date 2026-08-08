/** Map key, overlaid bottom-right. */
export default function Legend() {
  return (
    <aside className="panel legend" aria-label="Map key">
      <span title="Footpath imported from OpenStreetMap">
        <i className="key key--osm" />
        Path
      </span>
      <span title="Connector we inferred from geometry — not OpenStreetMap data">
        <i className="key key--assumed" />
        Assumed
      </span>
      <span title="The shortest route found by Dijkstra">
        <i className="key key--route" />
        Route
      </span>
      <span className="legend-rule" />
      <span title="Passable but slow — costs 2× its length">
        <i className="key key--maintenance" />
        Maintenance ×2
      </span>
      <span title="Heavily obstructed — costs 5× its length">
        <i className="key key--construction" />
        Construction ×5
      </span>
      <span title="Impassable — removed from the graph">
        <i className="key key--closed" />
        Closed
      </span>
    </aside>
  )
}
