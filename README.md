# Campus Route Planner

A mini Google-Maps-style campus navigation app built from the **Project.png** specification. It models roads as a graph, finds shortest paths with **Dijkstra's algorithm** and a **min-heap priority queue**, and renders the route on an interactive map.

## Team split (suggested)

| Person | Module | Responsibility |
|--------|--------|----------------|
| **Graph + Algorithms** | `js/graph.js`, `js/priorityQueue.js`, `js/dijkstra.js` | Adjacency-list graph, min-heap PQ, Dijkstra shortest path |
| **UI** | `index.html`, `css/style.css`, `js/app.js` | Dropdowns, SVG map, route highlighting, results panel |
| **Data** | `js/mapData.js` | Campus topology, edge weights, road-closure simulation |

## Features

- **From / To** dropdowns plus click-to-select on the map
- **Find route** draws the shortest path in dark blue (matching the mockup)
- Shows **distance**, **estimated walk time**, and **algorithm used**
- Console-style output: `FINDING THE SHORTEST PATH FROM … TO … USING DIJKSTRA'S ALGORITHM`
- **Road closures** preset to test rerouting when paths are blocked

## Sample output (Dorm C → Gym)

```
FINDING THE SHORTEST PATH FROM DORM C TO GYM USING DIJKSTRA'S ALGORITHM

Route: Dorm C → intersection → intersection → Cafeteria → Gym
Distance: 610 m
Estimated walk: 8 min
Algorithm: Dijkstra with min-heap priority queue
```

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
cd PROJECT
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).

## Campus graph

**Locations:** Library, Engineering Hall, Dorm C, Gym, Cafeteria  
**Waypoints:** Two intersection nodes for path routing  
**Algorithm:** Dijkstra with custom binary min-heap priority queue  
**Walk speed:** ~78 m/min (~1.3 m/s) for time estimates

## Project structure

```
PROJECT/
├── Project.png          # UI / graph reference mockup
├── index.html
├── css/style.css
├── js/
│   ├── graph.js         # Graph (adjacency list)
│   ├── priorityQueue.js # Min-heap priority queue
│   ├── dijkstra.js      # Shortest path + walk time estimate
│   ├── mapData.js       # Campus data + closures
│   └── app.js           # UI wiring
└── README.md
```
