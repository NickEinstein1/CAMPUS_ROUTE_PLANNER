import PriorityQueue from './PriorityQueue.js'

/**
 * Dijkstra's shortest-path algorithm.
 *
 * Keeps a best-known distance for every node (0 for the start, Infinity for the
 * rest) and repeatedly settles the closest unfinished node, relaxing its
 * neighbours. Because all weights are non-negative, a node's distance is final
 * the moment it leaves the queue — which is also why we can stop early.
 *
 * No decrease-key: an improved node is simply pushed again, and the outdated
 * copy is discarded when it surfaces (a "lazy" heap).
 *
 * Disruptions are applied as a per-edge multiplier at relax time rather than by
 * rebuilding the graph. A factor of Infinity blocks the edge outright, which is
 * the only case that changes the graph's shape rather than just its costs. Note
 * that scaling weights is safe here precisely because every factor is >= 1:
 * costs stay non-negative, so the "final on dequeue" guarantee still holds.
 *
 * @param {import('./Graph.js').default} graph
 * @param {string} startId
 * @param {string} endId
 * @param {Map<string, number>} [factors] edge id -> weight multiplier
 * @returns {{ path: string[], edges: string[], cost: number, metres: number,
 *             settled: string[], stale: number } | null}
 */
export default function dijkstra(graph, startId, endId, factors = new Map()) {
  if (!graph.getNode(startId) || !graph.getNode(endId)) return null
  if (startId === endId) {
    return {
      path: [startId],
      edges: [],
      cost: 0,
      metres: 0,
      settled: [startId],
      stale: 0,
    }
  }

  const dist = new Map()
  const prev = new Map()
  const prevEdge = new Map()
  const settled = []
  let stale = 0

  for (const id of graph.getAllNodeIds()) dist.set(id, Infinity)
  dist.set(startId, 0)

  const pq = new PriorityQueue()
  pq.enqueue(startId, 0)

  while (!pq.isEmpty()) {
    const { value: u, priority } = pq.dequeue()

    // An outdated copy left over from before this node was improved.
    if (priority > dist.get(u)) {
      stale++
      continue
    }

    settled.push(u)
    if (u === endId) break

    for (const { to: v, weight, id: edgeId } of graph.getNeighbors(u)) {
      const factor = factors.get(edgeId) ?? 1
      if (factor === Infinity) continue // closed: not part of the graph today
      const alt = dist.get(u) + weight * factor
      if (alt < dist.get(v)) {
        dist.set(v, alt)
        prev.set(v, u)
        prevEdge.set(v, edgeId)
        pq.enqueue(v, alt)
      }
    }
  }

  if (dist.get(endId) === Infinity) return null

  const path = []
  const edges = []
  for (let at = endId; at !== undefined; at = prev.get(at)) {
    path.unshift(at)
    if (prevEdge.has(at)) edges.unshift(prevEdge.get(at))
  }

  // Ground distance actually covered, ignoring the slowdown multipliers. The
  // cost is what the search minimised; the metres are what you walk.
  let metres = 0
  for (let i = 1; i < path.length; i++) {
    const step = graph
      .getNeighbors(path[i - 1])
      .find((n) => n.id === prevEdge.get(path[i]))
    if (step) metres += step.weight
  }

  return { path, edges, cost: dist.get(endId), metres, settled, stale }
}
