# Viva prep — questions a DSA professor will ask

Numbers are live as of the current build: **V = 164, E = 220**, 17 destinations, 10.4 km.
Average degree 2.68, max degree 5. Edge weights range 0.1 m to 1209.8 m.

---

## 0. How to answer — read this first

All three of us should answer design questions in the same shape. Three beats:

> **1. Name what you rejected. 2. Give the number that decided it. 3. Concede where it flips.**

Most students only manage beat 1. The **number** is what makes it credible. The
**concession** is what shows you understand a trade-off rather than defending a
choice you were handed.

### The shape, applied

**Data structure — "why an adjacency list?"**

- *Rejected:* adjacency matrix.
- *Number:* 164 × 164 = 26,896 slots to hold 220 edges — over 99% empty. Neighbour lookup is O(2.68) instead of O(164).
- *Concession:* on a dense graph the matrix would win — O(1) edge-existence checks and better cache locality. Ours is sparse, so the list wins.

**Algorithm — "why Dijkstra?"**

- *Rejected:* BFS, A\*, Bellman–Ford.
- *Number:* BFS is outright wrong here — weights run 0.1 m to 1209.8 m, and our trace shows a 3-edge route (cost 8) beating a 2-edge one (cost 9).
- *Concession:* **A\* would genuinely be better.** Haversine distance is admissible and consistent, and Dijkstra is A\* with the heuristic set to zero — which is exactly why we settle 128 of 164 nodes rather than fewer.

That concession is the strongest single moment available to us. Volunteering
that a better algorithm exists, and explaining *precisely* why ours settles more
nodes, demonstrates more understanding than defending Dijkstra ever could.

**Implementation — "why no decrease-key?"**

- *Rejected:* an indexed heap supporting decrease-key.
- *Number:* it needs a node → heap-position index maintained on every swap. We push a duplicate and reject it on dequeue instead — 22 stale entries on a typical route.
- *Concession:* we trade memory (heap bounded by O(E) rather than O(V)) to drop an entire data structure. And we *display* the discard count rather than hiding it.

### When you don't know

Say so, then reason aloud: *"I haven't measured that — but I'd expect X because
Y, and I'd test it by Z."* Examiners are testing whether we can think, not
whether we memorised. Bluffing is the only answer that actually fails.

### Two traps specific to this project

**"Did you write this yourselves?"** Answer honestly, then pivot to decisions we
can defend: why 8 connectors and not 20, why the spatial grid excludes building
nodes, why closures multiply weights instead of deleting edges. Ownership shows
in the reasoning, not in the claim.

**"Why is your smallest edge 0.1 m?"** Don't improvise. It is an artefact of
splitting edges to give buildings their own access nodes; `REUSE_ENDPOINT_M = 3`
exists to avoid sub-metre stubs and a few slip past. Harmless — but only if it
comes out in one breath.

### The one habit

End every design answer on a number **from this project**, not from a textbook.

- Weak: *"adjacency lists are better for sparse graphs."*
- Strong: *"our graph has average degree 2.68 out of 164 possible, so the list stores 440 entries where the matrix would store 26,896."*

The second one is ours, and it pre-empts the follow-up.

---

## 1. Data structures

**Q. Which data structures did you use, and where?**

| Structure | Type | File |
|---|---|---|
| Graph | adjacency list — `Map<nodeId, Edge[]>` | `core/Graph.js` |
| Priority queue | binary min-heap over an array | `core/PriorityQueue.js` |
| Spatial index | uniform grid hash — `Map<"row:col", Node[]>` | `core/SpatialGrid.js` |
| `dist`, `prev`, `prevEdge` | `Map` — O(1) lookup | `core/dijkstra.js` |
| `settled` | array, insertion-ordered | `core/dijkstra.js` |
| Disruptions | `Map<edgeId, factor>` | `core/disruptions.js` |

**Q. Why an adjacency list and not a matrix?**

The graph is sparse. A matrix is 164 × 164 = **26,896** slots to store 220 edges — over 99% empty. The list stores **440** entries (each edge twice, once per direction). Dijkstra's inner loop asks "who are u's neighbours?" constantly; the list answers in O(deg u) ≈ 2.68, the matrix in O(V) = 164.

**Q. Why is each edge stored twice?**

The graph is undirected — you can walk a path both ways. Both copies share **one edge id**, which is what lets a single click close a path in both directions and lets the route highlight find the right polyline.

**Q. Why a Map rather than a plain object for `dist`?**

Map gives O(1) get/set with string keys, no prototype-chain surprises, and preserves insertion order. Object keys would also work here, but Map is the honest choice for a keyed collection.

---

## 2. Dijkstra

**Q. Explain the algorithm in one sentence.**

Always expand the closest unfinished node, and a node's distance is final the moment it leaves the priority queue.

**Q. Why is it correct?**

Because every weight is **non-negative**. When a node is dequeued it has the smallest tentative distance of anything unfinished, so no other route could reach it more cheaply — any alternative would have to pass through a node that is already further away and then add more non-negative weight.

**Q. What is the time complexity?**

**O((V + E) log V)**. Each edge can trigger at most one push, and every push/pop costs O(log V). For our graph that is roughly (164 + 220) × log₂(164) ≈ **2,825** heap operations worst case. Space is O(V + E).

**Q. You stop early. Is that safe?**

Yes, and for the same reason. Once the destination is dequeued its distance is final, so nothing later can improve it. Library → Gymnasium settles 128 of 164 nodes instead of all 164.

**Q. Why is "nodes settled" less than V?**

Early exit. It is also the honest measure of work done — we show it in the UI precisely so the cost of the search is visible.

---

## 3. The heap

**Q. Why a heap instead of scanning for the minimum?**

A linear scan costs O(V) per extraction, giving O(V²) overall. The heap costs O(log V), giving O((V+E) log V). At this size both are instant, but the difference is the whole point of the exercise.

**Q. What is the heap invariant?**

Every parent's priority ≤ both children's. The tree is implicit in an array: children of index `i` are at `2i+1` and `2i+2`, parent at `⌊(i-1)/2⌋`. No pointers.

**Q. Walk through an insertion.**

Push 5, 3, 8, 1 → `[1, 3, 8, 5]`. Pushing 1 appends it at index 3, compares with parent index 1 (value 5), swaps; then compares with parent index 0 (value 3), swaps. Two swaps — one per level, hence O(log n).

**Q. You do not implement decrease-key. Why not, and what breaks?**

A binary heap cannot decrease a key without also maintaining a node → heap-position index. Instead we push the improved copy and discard the outdated one when it surfaces:

```js
if (priority > dist.get(u)) { stale++; continue }
```

Nothing breaks — the stale copy always has a larger priority, so it is always rejected. The cost is a slightly larger heap; the saving is a whole index structure. We count the discards and display them ("Stale queue entries discarded: 22") so the trade-off is visible rather than hidden.

**Q. Could the heap grow unboundedly?**

It is bounded by the number of successful relaxations, which is at most E. So O(E) space worst case.

---

## 4. Alternatives

**Q. Why not BFS?**

BFS minimises the **number of edges**, not distance. It is only correct when all weights are equal; ours range from 0.1 m to 1209.8 m. Our worked example proves it: A→C→B→D costs 8 across three edges, while BFS returns A→B→D — two edges but cost 9.

**Q. Why not A\*?**

A\* would work well here — straight-line (haversine) distance to the destination is an admissible, consistent heuristic, since no path can be shorter than the direct line. Dijkstra **is** A\* with the heuristic fixed at zero, which is exactly why it settles more nodes than strictly necessary. We chose Dijkstra because the brief asked for it, and because it makes the "nodes settled" statistic more instructive.

**Q. Why not Bellman–Ford?**

It handles negative weights at O(V·E). We have no negative weights, so we would pay ~36,000 operations for a guarantee we do not need.

**Q. Why not Floyd–Warshall?**

All-pairs at O(V³) = ~4.4 million operations to answer one query. It would make sense if we precomputed every pair once and served many queries, but the graph is rebuilt whenever a path is disrupted.

---

## 5. Data and storage

**Q. How is the map stored?**

One committed file, `data/campus.json`, with four keys: `meta`, `nodes`, `edges`, `landmarks`. Nodes are `{id, lat, lon}`. Edges carry `from`, `to`, `weight` in metres, and a `geometry` array of points for drawing.

**Q. Why separate `weight` from `geometry`?**

They serve different consumers. **Topology** (`from`/`to`/`weight`) is what Dijkstra searches; **geometry** is what Leaflet draws. A path can bend through many points but is still one edge with one weight. Dijkstra never reads the geometry array.

**Q. How are the weights computed?**

Haversine distance summed along each polyline, so the weight is the true walked length on a sphere, not the straight line between endpoints.

**Q. Why JSON and not a database?**

The graph is ~200 KB, read-only, and never changes at runtime. SQLite in the browser would mean shipping ~1 MB of wasm and making startup async; a server would break the "works offline, no backend" property. A database would earn its place if disruptions needed to persist across users — that is a real extension, not a current need.

**Q. Where did the data come from?**

OpenStreetMap via the Overpass API, 78 pedestrian/service ways, fetched once by `scripts/fetch-osm.mjs` and committed. `scripts/build-graph.mjs` detects junctions, collapses each run of geometry between junctions into one weighted edge, keeps the largest connected component, and snaps landmarks.

**Q. What is the spatial grid for, and is it justified?**

Answering "which junction is nearest this click?" It buckets nodes into 60 m cells and expands ring by ring, stopping once the best hit beats anything the next ring could hold. Honest answer: at 164 nodes a linear scan would be fast enough. It is there because it stays near-constant-time as the network grows, and because snapping a point to a network is a real problem worth solving properly.

---

## 6. Disruptions

**Q. How do closures affect the algorithm?**

Two different ways, and the distinction is the point:

- **Maintenance (×2)** and **construction (×5)** multiply an edge's weight. The graph keeps its shape; only the cost changes. Dijkstra usually detours — but if every alternative is worse, it walks you straight through, which is the correct answer.
- **Closure (×∞)** skips the edge entirely. That changes the **topology** and can make a destination unreachable no matter how far you are willing to walk.

**Q. Do you rebuild the graph for this?**

No. It is one Map lookup per relaxation:

```js
const factor = factors.get(edgeId) ?? 1
if (factor === Infinity) continue
const alt = dist.get(u) + weight * factor
```

**Q. Does scaling the weights break correctness?**

No, because every factor is ≥ 1, so scaled weights stay non-negative and the "final on dequeue" guarantee holds. A factor below zero would break Dijkstra outright and force Bellman–Ford.

**Q. How do you know the detour cost?**

We run the search twice — once with disruptions, once on a clear campus — and report the difference. Cheap at this size.

---

## 7. Harder questions — be ready

**Q. Your smallest edge is 0.1 m. Is that a real path?**

No — it is an artefact of splitting edges to give buildings their own access nodes. It is harmless (a near-zero weight never distorts a shortest path) but it is not a walkway. `REUSE_ENDPOINT_M = 3` in the build script exists to reuse a junction rather than cut a sub-metre stub; a few slip through.

**Q. Some of your edges are "assumed". Explain.**

OpenStreetMap maps paths *around* these buildings but not always *between* them. Left raw, two buildings 39 m apart routed 690 m around the block. We added 8 connectors, each linking points within 35 m that the network otherwise routes 120 m+ around, none crossing a building footprint. They are flagged `assumed: true`, **drawn dashed**, and listed in `data/connectors.json`. Delete that file and rebuild for a pure-OSM graph.

**Q. Are the building names real?**

The 11 building names are **representative** — OSM records no names for those footprints. **Crossroads Cafe, Main Parking and the Sports Field are real** OSM features with their true names and tags. **Dorms A, B and C are invented** — OSM maps no dormitories at Jessup, and the only unused footprints nearby are private houses, which would be wrong to relabel. They are flagged `invented: true`.

**Q. Distance and time seem inconsistent under disruption.**

Deliberate. **Distance** reports metres actually walked; **time** is derived from the search *cost*, which includes the slowdown factors. Walking 100 m through construction covers 100 m of ground but takes longer — so a route can show more minutes without more metres.

**Q. What happens if the destination is unreachable?**

`dist.get(endId)` is still `Infinity` when the queue empties, and we return `null`. The UI prints the failure with its reason and suggests downgrading a closure to construction.

**Q. What is the weakest part of your project?**

The data, not the algorithm. The path network is real OSM, but the 8 assumed connectors, the representative building names and the 3 invented dorm positions are all judgement calls we made without walking the campus. Every one of them is flagged in the data and visible in the UI, which is the best we could do without a site visit.

**Q. How would you scale this to a whole city?**

The adjacency list and heap already scale to O((V+E) log V). At city scale I would (a) switch to A\* with a haversine heuristic to cut settled nodes, (b) consider bidirectional search, and (c) precompute contraction hierarchies if queries outnumbered updates. The spatial grid is already the right structure for snapping at that size.

---

## 8. Team contribution

| Person | Area | Files |
|---|---|---|
| Graph + Algorithms | adjacency list, min-heap, Dijkstra, spatial index | `app/src/core/` |
| UI | map, controls, results, console output | `app/src/components/`, `app/src/App.jsx` |
| Data | OSM pipeline, landmarks, connectors, closures | `scripts/`, `data/` |

**Q. Show me the required output.**

The terminal button in the nav bar. It prints, verbatim:

```
FINDING THE SHORTEST PATH FROM LIBRARY TO GYMNASIUM USING DIJKSTRA'S ALGORITHM

Route: Library → (16 waypoints) → Gymnasium
Distance: 518 m
Estimated walk: 7 min
Nodes settled: 128 of 164
Stale queue entries discarded: 22
Algorithm: Dijkstra with min-heap priority queue
```
