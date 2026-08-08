/**
 * Dijkstra's shortest-path algorithm using a priority queue.
 *
 * Finds the minimum-cost path from a start node to an end node in a weighted graph
 * with non-negative edge weights (distances in meters). Works by always expanding
 * the closest unvisited node first — a greedy strategy that is guaranteed to be optimal.
 *
 * Team member: Graph + Algorithms
 */

/**
 * Find shortest path between two nodes.
 * @param {Graph} graph
 * @param {string} startId
 * @param {string} endId
 * @param {Set<string>} [closedEdges] - edge ids to treat as blocked (road closures)
 * @returns {{ path: string[], distance: number, edges: string[] } | null}
 */
function dijkstra(graph, startId, endId, closedEdges = new Set()) {
  // Guard: invalid nodes or same start/end need no search.
  if (!graph.getNode(startId) || !graph.getNode(endId)) return null;
  if (startId === endId) return { path: [startId], distance: 0, edges: [] };

  // dist[v]  = best known distance from start to v (initial "distance vector")
  // prev[v]  = which node we came from to reach v (for rebuilding the path)
  // prevEdge = which edge we used to reach v (for highlighting on the map)
  const prev = new Map();
  const prevEdge = new Map();
  const pq = new PriorityQueue();

  // Step 1: Initial distance matrix/vector — all ∞ except source = 0.
  // See createInitialDistanceMap() in mapData.js and INITIAL_ADJACENCY_MATRIX.
  const dist = createInitialDistanceMap(graph, startId);
  pq.enqueue(startId, 0);

  // Step 2: Main loop — repeatedly take the closest unprocessed node.
  while (!pq.isEmpty()) {
    const current = pq.dequeue();
    const u = current.value;

    // Skip stale entries: we may have enqueued u again with a shorter distance later.
    if (current.priority > dist.get(u)) continue;

    // Early exit: we found the destination with the shortest distance.
    if (u === endId) break;

    // Step 3: Relax each neighbor — try to improve the path to v through u.
    for (const { to: v, weight, id: edgeId } of graph.getNeighbors(u)) {
      if (closedEdges.has(edgeId)) continue; // Skip blocked roads

      const alt = dist.get(u) + weight; // Candidate distance to v via u
      if (alt < dist.get(v)) {
        dist.set(v, alt);
        prev.set(v, u);
        prevEdge.set(v, edgeId);
        pq.enqueue(v, alt);
      }
    }
  }

  // No path exists (e.g. destination cut off by closures).
  if (dist.get(endId) === Infinity) return null;

  // Step 4: Reconstruct path by walking backward from end to start using prev.
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
 * Uses ~1.3 m/s average walking speed, which is about 78 meters per minute.
 */
function estimateWalkMinutes(distanceMeters) {
  return Math.max(1, Math.round(distanceMeters / 78));
}
