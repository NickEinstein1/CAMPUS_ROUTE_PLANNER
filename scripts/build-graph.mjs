/**
 * Step 2 of 2 — turn the raw OSM download into a routable graph.
 *
 *   node scripts/build-graph.mjs
 *
 * Reads  data/osm-raw.json  + data/landmarks.json
 * Writes data/campus.json
 *
 * OSM gives us *ways* — polylines with many geometry points. A routing graph
 * wants *edges* between decision points. The pipeline:
 *
 *   1. Find junctions   — a node shared by 2+ ways, or a way's endpoint
 *   2. Collapse         — each run of geometry between two junctions = one edge
 *   3. Measure          — Haversine along the polyline gives real metres
 *   4. Keep the largest connected component
 *   5. Snap landmarks   — project each building onto the nearest edge, cut the
 *                        edge there, and join the building by an access edge
 *
 * Step 4 matters more than it looks: the raw campus network breaks into several
 * disconnected islands, and a landmark snapped to an island can never be routed
 * to. Filtering BEFORE snapping is what prevents that.
 *
 * Step 5 is why buildings get their own nodes rather than borrowing a junction:
 * with only ~108 junctions, three buildings shared one and reported 0 m apart.
 *
 * This script never touches landmarks.json — building names stay hand-edited.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (f) => JSON.parse(readFileSync(resolve(ROOT, f), 'utf8'))

/** Great-circle distance in metres between two {lat, lon} points. */
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

const raw = read('data/osm-raw.json')
const ways = raw.elements.filter(
  (e) => e.type === 'way' && e.geometry?.length === e.nodes?.length,
)

// ---- 1. Junction detection -------------------------------------------------
// A node is a junction if it is shared by two or more ways, or terminates one.
const seenCount = new Map()
for (const w of ways) {
  for (const n of w.nodes) seenCount.set(n, (seenCount.get(n) ?? 0) + 1)
}

const isJunction = new Set()
for (const w of ways) {
  isJunction.add(w.nodes[0])
  isJunction.add(w.nodes[w.nodes.length - 1])
  for (const n of w.nodes) if (seenCount.get(n) >= 2) isJunction.add(n)
}

// ---- 2 & 3. Collapse runs of geometry into weighted edges -------------------
const pos = new Map() // osm node id -> {lat, lon}
for (const w of ways) {
  w.nodes.forEach((n, i) => pos.set(n, { lat: w.geometry[i].lat, lon: w.geometry[i].lon }))
}

const edgeByPair = new Map() // "a|b" (sorted) -> edge, keeping the shortest
for (const w of ways) {
  let start = null
  for (let i = 0; i < w.nodes.length; i++) {
    if (!isJunction.has(w.nodes[i])) continue
    if (start !== null) {
      let weight = 0
      const geometry = []
      for (let k = start; k <= i; k++) {
        geometry.push([w.geometry[k].lat, w.geometry[k].lon])
        if (k > start) weight += haversine(w.geometry[k - 1], w.geometry[k])
      }
      const [a, b] = [w.nodes[start], w.nodes[i]]
      if (a !== b && weight > 0) {
        const key = a < b ? `${a}|${b}` : `${b}|${a}`
        const existing = edgeByPair.get(key)
        if (!existing || weight < existing.weight) {
          edgeByPair.set(key, { from: `n${a}`, to: `n${b}`, weight, geometry })
        }
      }
    }
    start = i
  }
}

// ---- 3b. Assumed connectors (optional) -------------------------------------
// data/connectors.json holds hand-kept links standing in for walkways OSM never
// mapped. They are flagged assumed:true all the way through to the UI, which
// draws them dashed, so they are never mistaken for surveyed OSM data. Delete
// the file and re-run to get a pure-OpenStreetMap graph.
let assumedCount = 0
try {
  for (const c of read('data/connectors.json').connectors) {
    const pa = pos.get(Number(c.from.slice(1)))
    const pb = pos.get(Number(c.to.slice(1)))
    if (!pa || !pb) {
      console.warn(`  connector ${c.id}: unknown node, skipped`)
      continue
    }
    edgeByPair.set(`assumed|${c.from}|${c.to}`, {
      from: c.from,
      to: c.to,
      weight: haversine(pa, pb),
      geometry: [
        [pa.lat, pa.lon],
        [pb.lat, pb.lon],
      ],
      assumed: true,
    })
    assumedCount++
  }
} catch {
  // No connectors file: pure OSM data. Perfectly valid.
}

// ---- 4. Stitch near-touching paths, then keep the largest component --------
// OSM ways are often drawn crossing one another WITHOUT sharing a node, so
// paths that plainly meet on the ground are topologically disconnected. Left
// alone this produces absurd routes: two buildings 39 m apart were being routed
// 690 m around the block, because the footpath between them sat on an island.
//
// So before discarding anything, we join components whose nearest nodes are
// within STITCH_M of each other — close enough that they are the same crossing
// in reality. Genuinely separate networks (tens or hundreds of metres away) are
// left alone and dropped as before.
const STITCH_M = 20
const posOf = (id) => pos.get(Number(id.slice(1)))

let adjacency = new Map()
let components = []

function recomputeComponents() {
  adjacency = new Map()
  const link = (a, b) => {
    if (!adjacency.has(a)) adjacency.set(a, [])
    adjacency.get(a).push(b)
  }
  for (const e of edgeByPair.values()) {
    link(e.from, e.to)
    link(e.to, e.from)
  }

  const visited = new Set()
  components = []
  for (const start of adjacency.keys()) {
    if (visited.has(start)) continue
    const stack = [start]
    const group = []
    visited.add(start)
    while (stack.length) {
      const u = stack.pop()
      group.push(u)
      for (const v of adjacency.get(u) ?? []) {
        if (!visited.has(v)) {
          visited.add(v)
          stack.push(v)
        }
      }
    }
    components.push(group)
  }
  components.sort((a, b) => b.length - a.length)
}

let stitched = 0
for (;;) {
  recomputeComponents()
  if (components.length < 2) break

  // Closest node pair between the main component and anything still detached.
  let best = null
  for (let ci = 1; ci < components.length; ci++) {
    for (const a of components[ci]) {
      for (const b of components[0]) {
        const d = haversine(posOf(a), posOf(b))
        if (d <= STITCH_M && (!best || d < best.d)) best = { d, a, b }
      }
    }
  }
  if (!best) break

  edgeByPair.set(`stitch|${best.a}|${best.b}`, {
    from: best.a,
    to: best.b,
    weight: best.d,
    geometry: [
      [posOf(best.a).lat, posOf(best.a).lon],
      [posOf(best.b).lat, posOf(best.b).lon],
    ],
  })
  stitched++
}

const main = new Set(components[0] ?? [])

const trunk = [...edgeByPair.values()].filter(
  (e) => main.has(e.from) && main.has(e.to),
)

const nodes = [...main].map((id) => {
  const p = pos.get(Number(id.slice(1)))
  return { id, lat: p.lat, lon: p.lon }
})

// ---- 5. Snap landmarks onto the network ------------------------------------
// Snapping each building to the nearest *junction* is too coarse: with only ~108
// junctions on campus, several buildings land on the same one and end up zero
// metres apart. Instead we project each landmark onto the nearest *edge* and cut
// the edge at that point, so every building gets its own node in the right place.

/** Project P onto segment A->B using a local flat-earth approximation. */
function projectOntoSegment(P, A, B) {
  const R = 6371000
  const lat0 = (P.lat * Math.PI) / 180
  const xy = (p) => ({
    x: R * ((p.lon * Math.PI) / 180) * Math.cos(lat0),
    y: R * ((p.lat * Math.PI) / 180),
  })
  const p = xy(P)
  const a = xy(A)
  const b = xy(B)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  let t = len2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const point = {
    lat: A.lat + t * (B.lat - A.lat),
    lon: A.lon + t * (B.lon - A.lon),
  }
  return { t, point, dist: haversine(P, point) }
}

/** Reuse an existing junction rather than cutting a near-zero-length stub. */
const REUSE_ENDPOINT_M = 3

const landmarkFile = read('data/landmarks.json')
const cutsByEdge = new Map() // trunk index -> [{ segIdx, t, point, lm }]
const landmarks = landmarkFile.landmarks.map((lm) => ({
  id: lm.id,
  name: lm.name,
  color: lm.color ?? '#2563eb',
  lat: lm.lat,
  lon: lm.lon,
  nodeId: null,
  snapM: null,
  accessPoints: 0,
}))

// A building rarely has one door. Attaching it to only its single nearest path
// can hand it an access point that is physically close but topologically on the
// wrong side, which inflates every route in or out. So give each building up to
// MAX_ACCESS distinct access points and let Dijkstra pick the best one.
const MAX_ACCESS = 3
const ACCESS_MAX_M = 60
/** Two candidate access points nearer than this are the same doorway. */
const ACCESS_SEPARATION_M = 15

const attachIds = new Map(landmarks.map((lm) => [lm.id, []]))

landmarks.forEach((lm) => {
  // Best projection onto each edge, nearest first.
  const perEdge = []
  trunk.forEach((e, edgeIdx) => {
    let best = null
    for (let s = 0; s < e.geometry.length - 1; s++) {
      const A = { lat: e.geometry[s][0], lon: e.geometry[s][1] }
      const B = { lat: e.geometry[s + 1][0], lon: e.geometry[s + 1][1] }
      const r = projectOntoSegment(lm, A, B)
      if (!best || r.dist < best.dist) best = { ...r, edgeIdx, segIdx: s }
    }
    if (best) perEdge.push(best)
  })
  perEdge.sort((a, b) => a.dist - b.dist)

  const chosen = []
  for (const cand of perEdge) {
    if (chosen.length >= MAX_ACCESS) break
    if (chosen.length > 0 && cand.dist > ACCESS_MAX_M) break
    if (chosen.some((c) => haversine(c.point, cand.point) < ACCESS_SEPARATION_M)) {
      continue
    }
    chosen.push(cand)
  }
  if (chosen.length === 0 && perEdge.length > 0) chosen.push(perEdge[0])

  lm.snapM = Math.round(chosen[0].dist * 10) / 10
  lm.accessPoints = chosen.length

  for (const c of chosen) {
    const e = trunk[c.edgeIdx]
    const head = { lat: e.geometry[0][0], lon: e.geometry[0][1] }
    const tail = { lat: e.geometry.at(-1)[0], lon: e.geometry.at(-1)[1] }
    if (haversine(c.point, head) < REUSE_ENDPOINT_M) {
      attachIds.get(lm.id).push(e.from)
    } else if (haversine(c.point, tail) < REUSE_ENDPOINT_M) {
      attachIds.get(lm.id).push(e.to)
    } else {
      if (!cutsByEdge.has(c.edgeIdx)) cutsByEdge.set(c.edgeIdx, [])
      cutsByEdge.get(c.edgeIdx).push({ ...c, lm })
    }
  }
})

// Apply the cuts: each edge carrying split points becomes a chain of sub-edges.
const mkEdge = (from, to, geometry, assumed = false) => {
  let weight = 0
  for (let i = 1; i < geometry.length; i++) {
    weight += haversine(
      { lat: geometry[i - 1][0], lon: geometry[i - 1][1] },
      { lat: geometry[i][0], lon: geometry[i][1] },
    )
  }
  return assumed ? { from, to, weight, geometry, assumed } : { from, to, weight, geometry }
}

const split = []
let snapSeq = 0
trunk.forEach((e, edgeIdx) => {
  const cuts = cutsByEdge.get(edgeIdx)
  if (!cuts) {
    split.push(e)
    return
  }
  cuts.sort((a, b) => a.segIdx - b.segIdx || a.t - b.t)

  let from = e.from
  let geometry = [e.geometry[0]]
  for (let s = 0; s < e.geometry.length - 1; s++) {
    for (const c of cuts.filter((c) => c.segIdx === s)) {
      const id = `s${snapSeq++}`
      nodes.push({ id, lat: c.point.lat, lon: c.point.lon })
      attachIds.get(c.lm.id).push(id)
      geometry.push([c.point.lat, c.point.lon])
      split.push(mkEdge(from, id, geometry, e.assumed))
      from = id
      geometry = [[c.point.lat, c.point.lon]]
    }
    geometry.push(e.geometry[s + 1])
  }
  split.push(mkEdge(from, e.to, geometry, e.assumed))
})

// Every building becomes its own node, joined to the network by one short
// "access" edge per doorway. Its own node keeps two neighbouring buildings from
// collapsing onto one point (and reporting 0 m apart), and makes the reported
// distance door-to-door.
landmarks.forEach((lm) => {
  const id = `lm-${lm.id}`
  nodes.push({ id, lat: lm.lat, lon: lm.lon })
  for (const attachId of attachIds.get(lm.id)) {
    const attach = nodes.find((n) => n.id === attachId)
    if (!attach) continue
    split.push(
      mkEdge(id, attachId, [
        [lm.lat, lm.lon],
        [attach.lat, attach.lon],
      ]),
    )
  }
  lm.nodeId = id
})

const edges = split.map((e, i) => ({
  id: `e${i}`,
  ...e,
  weight: Math.round(e.weight * 10) / 10,
}))

// ---- Write ------------------------------------------------------------------
const totalM = edges.reduce((s, e) => s + e.weight, 0)
const out = {
  meta: {
    generated: new Date().toISOString().slice(0, 10),
    attribution: 'Path network (c) OpenStreetMap contributors, ODbL 1.0',
    campus: 'Jessup University, Rocklin CA',
    nodes: nodes.length,
    edges: edges.length,
    totalPathMetres: Math.round(totalM),
    componentsFound: components.length,
    stitchedCrossings: stitched,
    assumedConnectors: assumedCount,
    nodesDroppedAsIslands: adjacency.size - main.size,
  },
  nodes,
  edges,
  landmarks,
}
writeFileSync(resolve(ROOT, 'data/campus.json'), JSON.stringify(out, null, 1))

// ---- Report -----------------------------------------------------------------
console.log(`ways read              ${ways.length}`)
console.log(`junctions found        ${isJunction.size}`)
console.log(`assumed connectors     ${assumedCount}  (hand-kept, drawn dashed)`)
console.log(`stitched crossings     ${stitched}  (gaps <= ${STITCH_M} m joined)`)
console.log(`components             ${components.length}  (sizes: ${components.slice(0, 6).map((c) => c.length).join(', ')}${components.length > 6 ? ', ...' : ''})`)
console.log(`nodes kept             ${nodes.length}   (dropped ${out.meta.nodesDroppedAsIslands} on islands)`)
console.log(`edges kept             ${edges.length}`)
console.log(`total path length      ${(totalM / 1000).toFixed(2)} km`)
console.log('')
console.log('landmark snapping:')
for (const lm of landmarks) {
  const acc = ` [${lm.accessPoints} access]`
  const warn = lm.snapM > 80 ? '  <-- far from any path, check this' : ''
  console.log(`  ${lm.name.padEnd(12)} -> ${lm.nodeId.padEnd(12)} ${String(lm.snapM).padStart(6)} m${acc}${warn}`)
}
console.log('')
console.log('Wrote data/campus.json')
