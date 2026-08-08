/**
 * Suggests missing walkway connections in the OSM path network.
 *
 *   node scripts/propose-connectors.mjs [--write]
 *
 * WHY THIS EXISTS
 * ---------------
 * OpenStreetMap's footpath coverage at this campus is incomplete: it maps paths
 * *around* the buildings but not the short walkways *between* them. The result
 * is routes like Science Hall -> Art Studio, 39 m apart but 690 m on foot.
 *
 * This script finds node pairs that are physically close but far apart on the
 * network — the signature of a missing segment — and proposes joining them.
 *
 * IMPORTANT: the output is an ASSUMPTION, not survey data. Every proposed
 * connector is written with "assumed": true and is drawn differently in the app,
 * so nobody mistakes it for real OpenStreetMap data. A proposal is only made if
 * the straight line between the two nodes does not cross a building footprint.
 *
 * Reads  data/campus.json + data/buildings.json
 * Writes data/connectors.json  (only with --write)
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (f) => JSON.parse(readFileSync(resolve(ROOT, f), 'utf8'))

/** Physically closer than this to be worth joining. */
const MAX_GAP_M = 35
/** ...and this far apart on the existing network to be worth joining. */
const MIN_NETWORK_M = 120
/** Stop after this many; we want a few defensible links, not a rewrite. */
const MAX_CONNECTORS = 8

function haversine(a, b) {
  const R = 6371000
  const p1 = (a.lat * Math.PI) / 180
  const p2 = (b.lat * Math.PI) / 180
  const dp = p2 - p1
  const dl = ((b.lon - a.lon) * Math.PI) / 180
  const h =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// ---- Geometry: does a proposed link cut through a building? -----------------
const buildings = read('data/buildings.json')
  .elements.filter((e) => e.type === 'way' && e.geometry)
  .map((w) => w.geometry.map((p) => [p.lon, p.lat]))

const ccw = (a, b, c) =>
  (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0])

/** Standard segment-intersection test. */
const segmentsCross = (p1, p2, p3, p4) =>
  ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4)

function crossesBuilding(a, b) {
  const p1 = [a.lon, a.lat]
  const p2 = [b.lon, b.lat]
  for (const poly of buildings) {
    for (let i = 0; i < poly.length - 1; i++) {
      if (segmentsCross(p1, p2, poly[i], poly[i + 1])) return true
    }
  }
  return false
}

// ---- Load the graph ---------------------------------------------------------
const campus = read('data/campus.json')
const nodeById = new Map(campus.nodes.map((n) => [n.id, n]))
const adjacency = new Map()
const link = (a, b, w) => {
  if (!adjacency.has(a)) adjacency.set(a, [])
  adjacency.get(a).push([b, w])
}
for (const e of campus.edges) {
  link(e.from, e.to, e.weight)
  link(e.to, e.from, e.weight)
}

/** Distances from one source, used to measure "far apart on the network". */
function distancesFrom(source) {
  const dist = new Map([[source, 0]])
  const queue = [[source, 0]]
  while (queue.length) {
    // Small graph: a linear scan for the minimum is fine here.
    let bi = 0
    for (let i = 1; i < queue.length; i++) if (queue[i][1] < queue[bi][1]) bi = i
    const [u, d] = queue.splice(bi, 1)[0]
    if (d > (dist.get(u) ?? Infinity)) continue
    for (const [v, w] of adjacency.get(u) ?? []) {
      const alt = d + w
      if (alt < (dist.get(v) ?? Infinity)) {
        dist.set(v, alt)
        queue.push([v, alt])
      }
    }
  }
  return dist
}

// ---- Find candidates --------------------------------------------------------
// Only junctions: building nodes already have their own access edges.
const junctions = campus.nodes.filter((n) => !n.id.startsWith('lm-'))

const accepted = []
for (let round = 0; round < MAX_CONNECTORS; round++) {
  let best = null

  for (const a of junctions) {
    const dist = distancesFrom(a.id)
    for (const b of junctions) {
      if (a.id >= b.id) continue
      const gap = haversine(a, b)
      if (gap > MAX_GAP_M) continue
      const net = dist.get(b.id) ?? Infinity
      if (net < MIN_NETWORK_M) continue
      if (crossesBuilding(a, b)) continue
      const gain = net / gap
      if (!best || gain > best.gain) best = { a, b, gap, net, gain }
    }
  }

  if (!best) break

  accepted.push({
    id: `c${round}`,
    from: best.a.id,
    to: best.b.id,
    lengthM: Math.round(best.gap * 10) / 10,
    replacedNetworkM: Math.round(best.net),
    assumed: true,
    note: `Assumed walkway. ${Math.round(best.gap)} m gap that OSM routes ${Math.round(best.net)} m around.`,
  })

  // Add it to the working graph so the next round sees the improvement.
  link(best.a.id, best.b.id, best.gap)
  link(best.b.id, best.a.id, best.gap)
}

// ---- Report / write ---------------------------------------------------------
console.log(`proposed ${accepted.length} connector(s):\n`)
for (const c of accepted) {
  console.log(
    `  ${c.id}  ${String(c.lengthM).padStart(5)} m link  replaces a ` +
      `${String(c.replacedNetworkM).padStart(4)} m detour  (x${(c.replacedNetworkM / c.lengthM).toFixed(1)})`,
  )
}

if (!process.argv.includes('--write')) {
  console.log('\nDry run. Re-run with --write to save data/connectors.json')
  process.exit(0)
}

writeFileSync(
  resolve(ROOT, 'data/connectors.json'),
  JSON.stringify(
    {
      _comment:
        'ASSUMED walkways, NOT OpenStreetMap data. OSM maps paths around this ' +
        'campus but not the short links between buildings, so routes were up to ' +
        '17x longer than the straight-line distance. These connectors close the ' +
        'most glaring gaps. They are drawn as dashed amber lines in the app and ' +
        'flagged "assumed": true so they are never mistaken for surveyed data.',
      _howToVerify:
        'Nobody on the team has walked the campus, so these are inferred from ' +
        'geometry alone: each links two points within 35 m of each other that ' +
        'the network routes 120 m+ around, and none crosses a building ' +
        'footprint. Walk the campus and delete any that do not exist.',
      _editing:
        'Delete an entry to remove it. Re-run scripts/build-graph.mjs after ' +
        'any change. Removing this file entirely returns the app to pure OSM data.',
      connectors: accepted,
    },
    null,
    1,
  ),
)
console.log('\nWrote data/connectors.json')
