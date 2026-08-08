/**
 * Adjacency-list graph of the campus path network.
 *
 * Chosen over an adjacency matrix because the map is sparse — each junction
 * touches 2-4 others, not all 123. Dijkstra's inner loop asks "who are u's
 * neighbours?" constantly, and a list answers in time proportional to the
 * actual neighbours rather than scanning a mostly-empty row.
 *
 * Same structure as the original hand-built version; nodes now carry real
 * latitude/longitude instead of SVG coordinates.
 */
export default class Graph {
  constructor() {
    /** @type {Map<string, { id: string, lat: number, lon: number }>} */
    this.nodes = new Map()
    /** @type {Map<string, Array<{ to: string, weight: number, id: string }>>} */
    this.adjacency = new Map()
  }

  addNode(id, lat, lon) {
    this.nodes.set(id, { id, lat, lon })
    if (!this.adjacency.has(id)) this.adjacency.set(id, [])
  }

  /** Undirected: stored in both directions, sharing one edge id. */
  addEdge(from, to, weight, id) {
    this.adjacency.get(from)?.push({ to, weight, id })
    this.adjacency.get(to)?.push({ to: from, weight, id })
  }

  getNode(id) {
    return this.nodes.get(id)
  }

  getNeighbors(id) {
    return this.adjacency.get(id) ?? []
  }

  getAllNodeIds() {
    return [...this.nodes.keys()]
  }

  get nodeCount() {
    return this.nodes.size
  }
}
