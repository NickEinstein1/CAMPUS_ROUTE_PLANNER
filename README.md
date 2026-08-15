# Campus Route Planner

A mini Google-Maps-style navigation app for **Jessup University, Rocklin**. It builds a graph from real OpenStreetMap footpath data, finds shortest routes with **Dijkstra's algorithm** and a **min-heap priority queue** we wrote ourselves, and draws the result on an interactive map.

Class assignment: *Route/navigation planner for a city or campus.*

- [PRESENTATION.md](PRESENTATION.md) — concepts, worked trace, and team brief for class
- [QA.md](QA.md) — ~40 questions a DSA examiner will ask, with answers
- [DOCS.md](DOCS.md) — pipeline, module APIs, data formats, how to extend

The app also carries its own documentation: a **Guide** modal and a **notes drawer** covering the data structures, the algorithm and how the data is stored.

## What it does

- Pick **start** and **destination** from 17 campus destinations, or click them on the map
- Click **open ground** to drop a current position — it snaps to the nearest footpath
- Click any **path segment** to disrupt it — *maintenance* (×2), *construction* (×5) or *closed* (impassable) — and the route responds immediately
- Shows distance, walking time, **nodes settled**, and the detour cost versus a clear campus
- Your zoom and pan are preserved; **Find route** re-centres
- Dark and light mode, following your OS until you choose
- A built-in **Guide** page (`#guide`) and a **notes drawer** explaining the data structures and algorithm — written for demoing to a class

## Run it

```bash
cd app
npm install
npm run dev
```

Then open <http://localhost:5173> (Vite picks the next free port if that one is busy). No API keys, no backend. The graph is pre-built and committed, so the only network request is the map tiles.

## Deploy on Vercel

The live UI is the React app in `app/` (configured by root `vercel.json`).

1. Push this repo to GitHub.
2. In [Vercel](https://vercel.com/new), **Import** the `CAMPUS_ROUTE_PLANNER` repo.
3. Leave settings as detected from `vercel.json` (build: `app`, output: `app/dist`).
4. Click **Deploy**.

CLI alternative from the repo root:

```bash
npx vercel
```

## The graph

| | |
|---|---|
| Nodes | **164** (123 junctions + 24 access points + 17 destinations) |
| Edges | **220** (212 from OSM + 8 assumed) |
| Path network | **10.4 km** |
| Average degree | **2.68** (max 5) |
| Source | OpenStreetMap, 78 pedestrian/service ways |

The network is sparse, which is why the graph is an **adjacency list**: a matrix would be 164 × 164 = 26,896 slots to hold 220 edges, over 99% of them empty.

A typical query — Library to Gymnasium — walks 518 m in about 7 minutes, settling 128 of 164 nodes. Close one path on that route and it reroutes to 550 m.

## An honest note on the data

OpenStreetMap maps paths *around* the buildings on this campus but not the short walkways *between* them. Left raw, that produced routes up to **17× the straight-line distance** — two buildings 39 m apart routed 690 m around the block.

We closed the worst gaps with 8 **assumed** connectors. Nobody on the team has walked the campus, so these are inferred from geometry alone: each links two points within 35 m that the network otherwise routes 120 m+ around, and none crosses a building footprint. They are flagged `"assumed": true`, **drawn as dashed amber lines**, and listed in `data/connectors.json`.

Delete that file and re-run the build for a pure-OpenStreetMap graph.

The 17 destinations are not all equally real. In `data/landmarks.json`:

| | Destinations | Basis |
|---|---|---|
| **Real feature, real name** | Crossroads Cafe, Main Parking, Sports Field | Tagged in OSM. The cafe carries Jessup's own dining page and opening hours; the lot is 4.5 ha, the pitch 1 ha. Flagged with `osmType`/`kind`. |
| **Real footprint, invented name** | Library, Gymnasium, Science Hall, and 8 more | The building outlines are real OSM footprints, but OSM records **no names** for them. Ours were chosen to fit each footprint's size and position. |
| **Invented entirely** | Dorm A, Dorm B, Dorm C | OSM maps **no dormitories** at Jessup — every campus footprint was already spoken for, and the only unused ones nearby are private houses. Positions were chosen beside the south-east path corridor. Flagged `"invented": true`. |

Rename or move any of them freely, then re-run `build-graph.mjs`.

## Rebuilding the graph

```bash
node scripts/fetch-osm.mjs           # OSM -> data/osm-raw.json (skips if present)
node scripts/build-graph.mjs         # -> data/campus.json
node scripts/propose-connectors.mjs  # suggests missing walkways (--write to save)
```

Only `build-graph.mjs` needs re-running after editing names, colours, or connectors.

## Team split

| Person | Area | Files |
|---|---|---|
| **Graph + Algorithms** | Adjacency list, min-heap, Dijkstra, spatial index | `app/src/core/` |
| **UI** | Map, controls, results, console output | `app/src/components/`, `app/src/App.jsx` |
| **Data** | OSM pipeline, landmarks, connectors, closures | `scripts/`, `data/` |

## Project structure

```
CAMPUS_ROUTE_PLANNER/
├── app/                      React + Leaflet app
│   ├── src/core/             framework-free algorithm modules
│   │   ├── Graph.js          adjacency list
│   │   ├── PriorityQueue.js  binary min-heap
│   │   ├── dijkstra.js       shortest path
│   │   ├── SpatialGrid.js    click -> nearest node
│   │   ├── disruptions.js    maintenance / construction / closure factors
│   │   └── campus.js         loads campus.json
│   └── src/components/       MapView, controls, results, Guide, NotesPanel
├── scripts/                  OSM fetch + graph build + connector proposal
├── data/                     osm-raw, buildings, landmarks, connectors, campus
├── vercel.json               Vercel build → app/dist
└── Project.png               original mockup
```

Map data © OpenStreetMap contributors, ODbL 1.0.
