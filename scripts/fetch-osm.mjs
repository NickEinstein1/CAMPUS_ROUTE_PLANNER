/**
 * Step 1 of 2 — download the raw pedestrian network from OpenStreetMap.
 *
 *   node scripts/fetch-osm.mjs [--force]
 *
 * Writes data/osm-raw.json, and skips the download if that file already exists.
 * We commit the result so the app never depends on the Overpass API at runtime:
 * no rate limits, and no surprises on demo day.
 *
 * Data (c) OpenStreetMap contributors, ODbL 1.0.
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'data/osm-raw.json')

/** Jessup University, Rocklin CA — [south, west, north, east] */
const BBOX = [38.8168, -121.2965, 38.8235, -121.2888]

/** Ways a pedestrian can actually walk along. */
const WALKABLE = 'footway|path|pedestrian|steps|cycleway|service|living_street|residential'

const QUERY = `[out:json][timeout:90];
way[highway~"^(${WALKABLE})$"](${BBOX.join(',')});
out body geom;`

if (existsSync(OUT) && !process.argv.includes('--force')) {
  console.log('data/osm-raw.json already exists — skipping download.')
  console.log('Pass --force to re-download.')
  process.exit(0)
}

console.log(`Querying Overpass for bbox ${BBOX.join(', ')} ...`)

const res = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'campus-route-planner/1.0 (student project)',
  },
  body: new URLSearchParams({ data: QUERY }),
})

if (!res.ok) {
  console.error(`Overpass returned ${res.status} ${res.statusText}.`)
  console.error('It rate-limits heavy use — wait a minute and try again.')
  process.exit(1)
}

const json = await res.json()
const ways = json.elements.filter((e) => e.type === 'way')

if (ways.length === 0) {
  console.error('No ways returned. Is the bounding box right?')
  process.exit(1)
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(json))

const points = ways.reduce((n, w) => n + (w.geometry?.length ?? 0), 0)
console.log(`Saved ${ways.length} ways (${points} geometry points) to data/osm-raw.json`)
console.log('Next: node scripts/build-graph.mjs')
