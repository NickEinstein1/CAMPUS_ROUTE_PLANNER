# Campus Route Planner

A mini Google-Maps-style navigation app for **Jessup University, Rocklin**. It builds a graph from real OpenStreetMap footpath data, finds shortest routes with **Dijkstra's algorithm** and a **min-heap priority queue** we wrote ourselves, and draws the result on an interactive map.

Class assignment: *Route/navigation planner for a city or campus.*

- [PRESENTATION.md](PRESENTATION.md) — concepts, worked trace, and team brief for class
- [DOCS.md](DOCS.md) — pipeline, module APIs, data formats, how to extend

## What it does

- Pick **start** and **destination** from 14 campus destinations, or click them on the map
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

Then open <http://localhost:5173>. No API keys, no backend. The graph is pre-built and committed, so the only network request is the map tiles.

## The graph

| | |
|---|---|
| Nodes | **156** (junctions + access points + 14 destinations) |
| Edges | **206** |
| Path network | **10.2 km** |
| Source | OpenStreetMap, 78 pedestrian/service ways |
| Assumed connectors | 8, drawn dashed — see below |

A typical query — Library to Gymnasium — walks 518 m in about 7 minutes, settling 128 of 156 nodes. Close one path on that route and it reroutes to 550 m.

## An honest note on the data

OpenStreetMap maps paths *around* the buildings on this campus but not the short walkways *between* them. Left raw, that produced routes up to **17× the straight-line distance** — two buildings 39 m apart routed 690 m around the block.

We closed the worst gaps with 8 **assumed** connectors. Nobody on the team has walked the campus, so these are inferred from geometry alone: each links two points within 35 m that the network otherwise routes 120 m+ around, and none crosses a building footprint. They are flagged `"assumed": true`, **drawn as dashed amber lines**, and listed in `data/connectors.json`.

Delete that file and re-run the build for a pure-OpenStreetMap graph.

The 11 **building** names are representative (Library, Gymnasium, Science Hall…), chosen to fit each footprint's real size and position. They are **not** the actual Jessup building names — OSM records none. Rename them freely in `data/landmarks.json`.

The other three destinations *are* real OSM features and carry their true names and tags: **Crossroads Cafe** (`amenity=restaurant`, with Jessup's own dining page and opening hours), **Main Parking** (`amenity=parking`, 4.5 ha) and the **Sports Field** (`leisure=pitch`, 1 ha). Entries with an `osmType`/`kind` field are the real ones.

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
├── js/ css/ index.html       original 7-node prototype (kept as a fallback)
└── Project.png               original mockup
```

`js/`, `css/` and `index.html` are the hand-built 7-node version the project started from. It still runs — open `index.html` — and the presentation uses it as the small worked example before scaling to real data.

Map data © OpenStreetMap contributors, ODbL 1.0.
