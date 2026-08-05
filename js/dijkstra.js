/**
 * Dijkstra's shortest-path algorithm using a priority queue.
 * Team member: Graph + Algorithms
 */

/**
 * Find shortest path between two nodes.
 * @param {Graph} graph
 * @param {string} startId
 * @param {string} endId
 * @param {Set<string>} [closedEdges] - edge ids to treat as blocked
 * @returns {{ path: string[], distance: number, edges: string[] } | null}
 */
function dijkstra(graph, startId, endId, closedEdges = new Set()) {
  if (!graph.getNode(startId) || !graph.getNode(endId)) return null;
  if (startId === endId) return { path: [startId], distance: 0, edges: [] };

  const dist = new Map();
  const prev = new Map();
  const prevEdge = new Map();
  const pq = new PriorityQueue();

  for (const id of graph.getAllNodeIds()) {
    dist.set(id, Infinity);
  }
  dist.set(startId, 0);
  pq.enqueue(startId, 0);

  while (!pq.isEmpty()) {
    const current = pq.dequeue();
    const u = current.value;

    if (current.priority > dist.get(u)) continue;
    if (u === endId) break;

    for (const { to: v, weight, id: edgeId } of graph.getNeighbors(u)) {
      if (closedEdges.has(edgeId)) continue;

      const alt = dist.get(u) + weight;
      if (alt < dist.get(v)) {
        dist.set(v, alt);
        prev.set(v, u);
        prevEdge.set(v, edgeId);
        pq.enqueue(v, alt);
      }
    }
  }

  if (dist.get(endId) === Infinity) return null;

  const path = [];
  const edges = [];
  let current = endId;

  while (current !== undefined) {
    path.unshift(current);
    if (prevEdge.has(current)) {
      edges.unshift(prevEdge.get(current));
    }
    current = prev.get(current);
  }

  return { path, distance: dist.get(endId), edges };
}

/**
 * Estimate walking time from distance (meters).
 * Assumes ~1.3 m/s average walking speed (~78 m/min).
 */
function estimateWalkMinutes(distanceMeters) {
  return Math.max(1, Math.round(distanceMeters / 78));
}
