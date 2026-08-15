# Documentation

Technical reference. For setup see [README.md](README.md); for the concepts see [PRESENTATION.md](PRESENTATION.md).

## Architecture

Two halves that never mix:

```
scripts/  ──build once──▶  data/campus.json  ──imported──▶  app/src/core/  ◀──used by──  app/src/components/
(Node, offline)              (committed)                    (pure JS, no React)            (React + Leaflet)
```

- **Offline pipeline** turns OpenStreetMap data into a routable graph. Runs on your machine, not in the browser.
- **Core** is plain ES modules with no React imports. Testable in Node, and the same files would work in any UI.
- **UI** only decides *when* to call the core and *how* to draw the answer.

That separation is why `PriorityQueue.js` and `dijkstra.js` moved from the original prototype into the React app unchanged.

## The pipeline

Three scripts, zero dependencies. Only the second needs re-running for routine edits.

### 1. `scripts/fetch-osm.mjs`

```bash
node scripts/fetch-osm.mjs [--force]
```

Queries the Overpass API for pedestrian-usable ways in the campus bounding box and writes `data/osm-raw.json`. Skips the download if the file exists.

The result is **committed on purpose**. Overpass is rate-limited and occasionally slow, and a class demo gets one shot — so the app never touches the network for data.

Highway types kept: `footway`, `path`, `pedestrian`, `steps`, `cycleway`, `service`, `living_street`, `residential`.

### 2. `scripts/build-graph.mjs`

```bash
node scripts/build-graph.mjs
```

Reads `data/osm-raw.json`, `data/landmarks.json`, `data/connectors.json` → writes `data/campus.json`.

OSM gives **ways** — polylines with many geometry points. A routing graph wants **edges between decision points**. Five stages:

| # | Stage | What happens |
|---|---|---|
| 1 | **Junction detection** | A node shared by 2+ ways, or terminating one, is a junction. Everything else is just drawing detail. |
| 2 | **Collapse** | Each run of geometry between two junctions becomes one edge, keeping the polyline for drawing. |
| 3 | **Measure** | Haversine along the polyline gives real metres. |
| 3b | **Assumed connectors** | Links from `connectors.json` are added, flagged `assumed: true`. |
| 4 | **Stitch + filter** | Components whose nearest nodes are ≤ 20 m apart are joined (OSM ways often cross without sharing a node); whatever is still unreachable is dropped. |
| 5 | **Snap landmarks** | Each building is projected onto nearby edges, those edges are cut at the projection, and the building joins by short *access* edges. |

Current output: **145 nodes, 189 edges, 9.9 km**, 22 nodes dropped as islands, 1 stitched crossing, 8 assumed connectors.

Three design decisions in that pipeline are worth knowing, because each fixed a measured bug:

- **Filter before snapping.** 22 nodes sit on disconnected fragments. A building snapped to a fragment can never be routed to.
- **Buildings get their own node.** Snapping to the nearest *junction* put three buildings on one node, reporting **0 m** between them.
- **Up to three access points per building.** With a single access point, a physically-close path on the wrong side of a building inflated every route through it. Letting Dijkstra choose the doorway cut the average detour factor from ×4.97 to **×1.79**.

### 3. `scripts/propose-connectors.mjs`

```bash
node scripts/propose-connectors.mjs [--write]
```

Suggests walkways OSM never mapped. A pair qualifies when it is **within 35 m** physically, **over 120 m apart on the network**, and the straight line **does not cross a building footprint** (checked against `data/buildings.json`). Proposals are made greedily, re-measuring after each one, capped at 8.

Dry-run by default. Output is an *assumption* — see the honesty note in the README.

## Data files

| File | Written by | Hand-edited? |
|---|---|---|
| `data/osm-raw.json` | `fetch-osm.mjs` | No |
| `data/buildings.json` | Overpass (footprints) | No |
| `data/landmarks.json` | **you** | **Yes** — names and colours |
| `data/connectors.json` | `propose-connectors.mjs --write` | **Yes** — delete entries you doubt |
| `data/campus.json` | `build-graph.mjs` | No — regenerated |

### `landmarks.json`

```jsonc
{
  "id": "library",          // stable key — routing depends on it
  "osmWayId": 1299153822,   // provenance
  "name": "Library",        // display only — safe to edit
  "color": "#059669",       // marker colour — safe to edit
  "lat": 38.819856,
  "lon": -121.291994,
  "areaM2": 1006,
  "hint": "Central-east. Large (~1006 m2)."
}
```

`name` and `color` are display-only; nothing in the routing touches them.

### `campus.json`

```jsonc
{
  "meta":  { "nodes": 145, "edges": 189, "totalPathMetres": 9884, ... },
  "nodes": [ { "id": "n612757017", "lat": 38.8199, "lon": -121.2925 } ],
  "edges": [ { "id": "e0", "from": "n1", "to": "n2", "weight": 71.4,
               "geometry": [[lat, lon], ...], "assumed": true } ],
  "landmarks": [ { "id": "library", "name": "Library", "color": "#059669",
                   "nodeId": "lm-library", "snapM": 12.3, "accessPoints": 3 } ]
}
```

Node id prefixes: `n…` an OSM junction, `s…` a split point where a building attaches, `lm-…` a building itself.

## Core modules (`app/src/core/`)

### `Graph.js`

Adjacency list. Chosen over a matrix because the network is sparse — each junction touches 2–4 others, not all 144 — and Dijkstra's inner loop asks for neighbours constantly.

| Method | Description |
|---|---|
| `addNode(id, lat, lon)` | Add a node. |
| `addEdge(from, to, weight, id)` | Undirected: stored both ways, sharing one edge id. |
| `getNode(id)` / `getNeighbors(id)` | Lookup; neighbours returns `[{ to, weight, id }]`. |
| `getAllNodeIds()` / `nodeCount` | Iteration and size. |

### `PriorityQueue.js`

Binary min-heap. `enqueue(value, priority)`, `dequeue()` → `{ value, priority }` or `null`, `isEmpty()`, `size`.

No decrease-key. Dijkstra pushes an improved node again and discards the outdated copy when it surfaces.

### `dijkstra.js`

```js
dijkstra(graph, startId, endId, closedEdges = new Set())
```

Returns `null` if either id is unknown or no route exists, otherwise:

```js
{
  path:     ['lm-library', 'n123', ..., 'lm-gymnasium'],  // node ids
  edges:    ['e12', 'e40', ...],                          // for highlighting
  distance: 518.3,                                        // metres
  settled:  [...],                                        // nodes finalised, in order
  stale:    22                                            // outdated heap entries discarded
}
```

`settled` and `stale` exist for the UI: they make the search visible instead of asserted.

`closedEdges` is a set of edge ids treated as nonexistent — that is the whole closure feature.

### `SpatialGrid.js`

Uniform grid answering *"which node is nearest this click?"*. Buckets nodes into ~60 m cells, searches outward ring by ring, stops when the best hit beats anything the next ring could hold. Also exports `haversine(lat1, lon1, lat2, lon2)`.

At 145 nodes a linear scan would do; the grid keeps clicks cheap as the network grows.

### `campus.js`

Loads `campus.json` and exposes `graph`, `edges`, `landmarks`, `meta`, `edgeById`, `grid`, `landmarkById(id)`, `estimateWalkMinutes(metres)`.

The grid is built over **junctions only** — clicking the map should snap you to a path you can walk on, not the centre of a building.

Walking pace: **78 m/min** (~1.3 m/s), minimum 1 minute.

## UI (`app/src/`)

`App.jsx` owns all state — `fromId`, `toId`, `currentPos`, `closedEdges`, `clickStep`, `fitKey` — and recomputes the route in a `useMemo`. Routing is live; there is no stale result to refresh.

| Component | Responsibility |
|---|---|
| `MapView` | Tiles, all 189 edges, route overlay, building markers, labels, click handling |
| `ControlPanel` | From/To selects, swap, Find route, reopen-closures |
| `ResultsPanel` | Four stat cards plus the console-style output block |

Two behaviours worth knowing:

- **Zoom and pan are preserved.** The map frames the route on first load and again only when `fitKey` changes (the **Find route** button). Refitting on every change would throw away the user's viewport every time they touched a control.
- **`CircleMarker`, not `Marker`.** Leaflet's default marker is a runtime-resolved PNG that bundlers routinely break. Circles are drawn by Leaflet itself.

## Extending

**Rename a building or change its colour** — edit `name` / `color` in `landmarks.json`, re-run `build-graph.mjs`.

**Add a building** — add an entry with `id`, `name`, `color`, `lat`, `lon`. It snaps itself to the network and appears in both dropdowns.

**Remove an assumed connector you don't believe** — delete it from `connectors.json` and rebuild. Deleting the whole file gives a pure-OSM graph.

**Move to a different campus** — change `BBOX` in `fetch-osm.mjs`, re-fetch, replace `landmarks.json`, rebuild. Nothing in `core/` changes.

**Change walking pace** — `METRES_PER_MINUTE` in `campus.js`.

## Verifying

The core has no automated test suite yet, but it has been checked against the real graph:

| Check | Result |
|---|---|
| Heap extraction order, 200 randomised trials | pass |
| All 55 building pairs reachable, none 0 m | pass |
| **Dijkstra vs. Floyd-Warshall, 110 pairs** | pass, max difference 2.3e-13 |
| Closing route edges forces a longer path or none | pass |
| Grid nearest-node vs. brute force, 300 random points | pass 300/300 |

The Floyd-Warshall comparison is the strong one: a completely different algorithm agreeing on every pair.

Useful manual checks after a change:

| Action | Expected |
|---|---|
| Library → Gymnasium, no closures | 518 m, 7 min, 117 of 145 settled |
| Same start and destination | "Start and destination are the same place." |
| Close a path mid-campus | Route detours; distance and settled count both rise |
| Close a stub beside a building | "No route found" — single-access buildings really are cut off |
| Click open ground far from paths | Green pin snaps to nearest path, console notes the snap distance |

## Deployment

Production hosting targets the React app in `app/` only. Root `vercel.json` runs `npm run build --prefix app` and publishes `app/dist`. The early hand-built 7-node SVG demo was removed so Vercel cannot pick up a stale `index.html` at the repo root. The small worked Dijkstra trace still lives in `PRESENTATION.md` for class.
