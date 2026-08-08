import Graph from './Graph.js'
import SpatialGrid from './SpatialGrid.js'
import campusData from '../../../data/campus.json'

/**
 * Loads the pre-built campus graph and exposes everything the UI needs.
 *
 * The data comes from OpenStreetMap via scripts/fetch-osm.mjs and
 * scripts/build-graph.mjs. It is committed to the repo, so the app never
 * depends on a network service at runtime.
 */

export const graph = new Graph()
for (const n of campusData.nodes) graph.addNode(n.id, n.lat, n.lon)
for (const e of campusData.edges) graph.addEdge(e.from, e.to, e.weight, e.id)

export const edges = campusData.edges
export const landmarks = campusData.landmarks
export const meta = campusData.meta

/** edge id -> edge, for drawing the route and toggling closures. */
export const edgeById = new Map(edges.map((e) => [e.id, e]))

/**
 * Index over junctions only. Building nodes are excluded so that clicking the
 * map snaps you to the path network you would actually walk on, not to the
 * centre of whichever building happens to be closest.
 */
export const grid = new SpatialGrid(
  campusData.nodes.filter((n) => !n.id.startsWith('lm-')),
)

/** Average walking pace, ~1.3 m/s. */
const METRES_PER_MINUTE = 78

export function estimateWalkMinutes(metres) {
  return Math.max(1, Math.round(metres / METRES_PER_MINUTE))
}

export function landmarkById(id) {
  return landmarks.find((l) => l.id === id)
}

/** Total length of the route's geometry, used for the map bounds. */
export function routePositions(edgeIds) {
  return edgeIds.flatMap((id) => edgeById.get(id)?.geometry ?? [])
}
