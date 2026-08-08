/**
 * Path disruptions — the "what if this walkway is dug up?" layer.
 *
 * Two genuinely different things happen to the graph here, and the distinction
 * is the point of the feature:
 *
 *   - maintenance and construction multiply an edge's WEIGHT. The graph keeps
 *     the same shape; only the cost of using that edge goes up. Dijkstra will
 *     still walk straight through a construction zone if every detour is worse.
 *
 *   - closure removes the edge from the search entirely. That changes the
 *     graph's TOPOLOGY, and can make a destination unreachable no matter how
 *     much walking you are willing to do.
 *
 * The factor is a slowdown, not a distance: a 100 m path under construction is
 * still 100 m of ground, but it costs the search as much as 500 m of clear
 * path, because that is roughly what it costs you to walk it.
 */
export const DISRUPTIONS = {
  open: {
    id: 'open',
    label: 'Open',
    factor: 1,
    hint: 'Normal walking speed.',
  },
  maintenance: {
    id: 'maintenance',
    label: 'Maintenance',
    factor: 2,
    glyph: '🔧',
    hint: 'Passable but slow — crews, cones, single file. Costs 2× its length.',
  },
  construction: {
    id: 'construction',
    label: 'Construction',
    factor: 5,
    glyph: '🚧',
    hint: 'Heavily obstructed. Costs 5× its length — usually worth detouring.',
  },
  closed: {
    id: 'closed',
    label: 'Closed',
    factor: Infinity,
    glyph: '⛔',
    hint: 'Impassable. Removed from the graph for this search.',
  },
}

/** Display order for the picker. */
export const DISRUPTION_ORDER = ['open', 'maintenance', 'construction', 'closed']

export function disruptionOf(stateId) {
  return DISRUPTIONS[stateId] ?? DISRUPTIONS.open
}

/**
 * Turns the UI's edgeId -> stateId map into the edgeId -> factor map the
 * search consumes. Open edges are left out so the common case stays empty.
 * @param {Map<string, string>} states
 * @returns {Map<string, number>}
 */
export function toFactors(states) {
  const factors = new Map()
  for (const [edgeId, stateId] of states) {
    const { factor } = disruptionOf(stateId)
    if (factor !== 1) factors.set(edgeId, factor)
  }
  return factors
}

/** Counts of each active disruption, for the summary line. */
export function summarise(states) {
  const counts = { maintenance: 0, construction: 0, closed: 0 }
  for (const stateId of states.values()) {
    if (stateId in counts) counts[stateId] += 1
  }
  return counts
}
