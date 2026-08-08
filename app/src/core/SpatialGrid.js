/**
 * Uniform grid spatial index — "which graph node is nearest this click?".
 *
 * Nodes are bucketed into fixed-size cells. A lookup checks the click's own
 * cell first, then expands outward ring by ring, stopping once the nearest hit
 * so far is closer than the next ring could possibly be.
 *
 * Honest note: at 124 nodes a plain linear scan is already fast enough. The
 * grid is here because it keeps map clicks O(1)-ish as the network grows, and
 * because "snap a click to the network" is a real problem worth solving
 * properly rather than by brute force.
 */
export default class SpatialGrid {
  /**
   * @param {Array<{ id: string, lat: number, lon: number }>} nodes
   * @param {number} cellMetres approximate cell size
   */
  constructor(nodes, cellMetres = 60) {
    this.nodes = nodes
    // Degrees per metre, using the mean latitude so cells stay roughly square.
    const meanLat = nodes.reduce((s, n) => s + n.lat, 0) / nodes.length
    this.latStep = cellMetres / 111320
    this.lonStep = cellMetres / (111320 * Math.cos((meanLat * Math.PI) / 180))
    this.cellMetres = cellMetres

    /** @type {Map<string, typeof nodes>} */
    this.cells = new Map()
    for (const n of nodes) {
      const key = this.#key(n.lat, n.lon)
      if (!this.cells.has(key)) this.cells.set(key, [])
      this.cells.get(key).push(n)
    }
  }

  #key(lat, lon) {
    return `${Math.floor(lat / this.latStep)}:${Math.floor(lon / this.lonStep)}`
  }

  /**
   * Nearest node to a point, or null if the graph is empty.
   * @returns {{ node: object, distance: number } | null}
   */
  nearest(lat, lon) {
    if (this.nodes.length === 0) return null

    const row = Math.floor(lat / this.latStep)
    const col = Math.floor(lon / this.lonStep)

    let best = null
    let bestDist = Infinity

    for (let ring = 0; ring < 40; ring++) {
      for (let r = row - ring; r <= row + ring; r++) {
        for (let c = col - ring; c <= col + ring; c++) {
          // Only the outer shell is new on each pass.
          if (ring > 0 && Math.abs(r - row) !== ring && Math.abs(c - col) !== ring) {
            continue
          }
          for (const n of this.cells.get(`${r}:${c}`) ?? []) {
            const d = haversine(lat, lon, n.lat, n.lon)
            if (d < bestDist) {
              bestDist = d
              best = n
            }
          }
        }
      }
      // A hit inside the searched box beats anything the next ring could hold.
      if (best && bestDist <= ring * this.cellMetres) break
    }

    return best ? { node: best, distance: bestDist } : null
  }
}

/** Great-circle distance in metres. */
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const p1 = (lat1 * Math.PI) / 180
  const p2 = (lat2 * Math.PI) / 180
  const dp = p2 - p1
  const dl = ((lon2 - lon1) * Math.PI) / 180
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
