# Campus Route Planner — Presentation & Team Brief

**The pitch:** We built a campus navigation app that answers "what's the fastest walk from A to B?" We model the campus as a **graph**, search it with **Dijkstra's algorithm**, and drive that search with a **min-heap priority queue** we wrote ourselves. We started on a hand-drawn 7-node map, then pointed the same algorithm at **145 real nodes of OpenStreetMap data** for Jessup University — and the algorithm files didn't change at all.

This is what we present and how we split it. It explains the *concepts*; the code is just where they live.

---

## Part 1 — Why a map has to become a graph

A campus map is a picture. A computer can't search a picture, so the first real decision was **how to represent the campus**.

A **graph**: **nodes** (places) joined by **edges** (walkable paths), each edge carrying a **weight** (distance in metres).

We built it twice, on purpose.

| | Prototype | Real campus |
|---|---|---|
| Nodes | 7, hand-placed | **145**, from OpenStreetMap |
| Edges | 10, hand-weighted | **189**, measured with Haversine |
| Path length | invented | **9.9 km** |

> **The insight that survived both versions:** a node doesn't have to be somewhere you want to *go*, only somewhere you can *be*. Our prototype had two unnamed "intersection" nodes because paths met there. In the real data we don't place those by hand — we **detect** them: any OSM point shared by two or more ways, or ending one, is a junction. Same idea, 20× the scale.

Everything else in the raw data — the dozens of points that just make a curve look smooth — carries no decision, so we collapse it away into the edge.

---

## Part 2 — Data structure #1: the adjacency list

| | **Adjacency matrix** | **Adjacency list** (ours) |
|---|---|---|
| Shape | 145 × 145 grid of every possible pair | Per node, only its actual neighbours |
| Space | V² = **21,025 slots** | ~2E = **378 entries** |
| "Who are u's neighbours?" | Scan all 145, discard the empties | Read the list — done |

Our network is **sparse**: each junction touches 2–4 others, not all 144. And Dijkstra's inner loop asks *"who are u's neighbours?"* constantly — a list answers in time proportional to the *actual* neighbours; a matrix always costs a full row scan.

Undirected edges are stored **twice**, once per direction, sharing a single edge id. That shared id is what later lets us highlight a route and close a path — one id, both directions, no risk of closing a street one-way.

---

## Part 3 — Dijkstra's algorithm

### The idea

Keep a **best-known distance** for every node — 0 for the start, **infinity** for everything else ("no route found yet"). Then repeat:

> **Take the unvisited node with the smallest known distance. Look at its neighbours. If going through this node beats what we already knew, write down the better number.**

That improvement step is **relaxation**, and it's the whole algorithm.

### Why greedy works here

Greedy algorithms are usually wrong. This one isn't, because **once we pull out the closest remaining node, no shorter route to it can exist** — any alternative would have to leave through a node that's *further away*, and with non-negative weights, going further can never come back cheaper. The moment a node leaves the queue, its distance is **final**.

> That's also exactly why **negative weights break Dijkstra**: the guarantee assumes detours only ever add cost. Distances in metres are never negative, so we're safe.

### The worked trace (use the prototype for this)

Small enough to follow on a board. Watch the Gym's number.

| Step | Pull from queue | What relaxes |
|---|---|---|
| 1 | **Dorm C (0)** | Library → 150, Lower intersection → 180 |
| 2 | **Library (150)** | Upper intersection → 330 |
| 3 | **Lower (180)** | Upper **improves 330 → 320**; Eng Hall → 380; Cafeteria → 380; **Gym → 680** |
| 4 | **Upper (320)** | Nothing improves |
| 5 | *Upper (330)* | **Stale — discarded** (already finalised at 320) |
| 6 | **Eng Hall (380)** | Gym via here = 700, worse than 680, rejected |
| 7 | **Cafeteria (380)** | **Gym improves 680 → 610** |
| 8 | **Gym (610)** | Target reached — **stop** |

**Result: 610 m, ~8 min.** *(Board/whiteboard example for class — the live demo uses the real OSM campus in `app/`.)*

**The two moments to point at:**

1. **Step 3 vs step 7.** The Gym is first reached at **680 m** — and that's *wrong*. Four steps later a longer-*looking* detour through the Cafeteria turns out to be **610 m**. **A shortest path can contain a longer step.** That's why you can't just walk toward the nearest thing, and it's what relaxation catches.
2. **Step 5.** A stale entry surfaces and is thrown away — see Part 4.

### Recovering the route

The algorithm computes *distances*, not paths. So every time we improve a node we also record **which node we came from** and **which edge we used**. At the end we walk those pointers backwards and reverse. The edge trail is what the map highlights.

### Early exit

We stop the moment the destination is settled rather than finishing every node — its distance is already final by the argument above. On the real campus that's a genuine saving: Library → Gymnasium settles **117 of 145** nodes, not all of them.

---

## Part 4 — Data structure #2: the min-heap

Every step, Dijkstra asks: **"which unvisited node is closest?"**

- **Scan the whole list:** O(V) per step
- **Min-heap:** the minimum is always at the root — O(log V)

A **binary min-heap** is a complete binary tree in an array with one rule: **every parent ≤ its children**. That alone guarantees the smallest item sits at index 0.

- **Insert** — append, then **bubble up** while smaller than the parent
- **Extract-min** — take the root, move the last item there, **bubble down** while larger than a child

Both touch one root-to-leaf path: **O(log n)**.

### The lazy-heap trick (our favourite detail)

Textbook Dijkstra uses *decrease-key* to update a node's priority in place, which means tracking where every node lives inside the heap — extra bookkeeping, easy to get wrong.

**We never update. We insert again.** When a node improves from 330 to 320, we push a second copy at 320. Because it's a min-heap, **the better copy always comes out first**; when the stale 330 surfaces we compare it against the best distance we already have, see it's worse, and **discard it**.

**You can watch this happen.** The app reports it: Library → Gymnasium discards **22 stale entries**. That's not a slide — it's live output.

Trade-off, stated honestly: the heap holds up to E entries instead of V, so slightly more memory. In exchange an entire class of bookkeeping bugs disappears and the complexity is unchanged. Most production implementations do exactly this.

### Complexity

**O((V + E) log V)** — each node and edge pushes at most one heap entry; every push or pop is log V.

At 145 nodes it's instant. The point is it scales — this is the same algorithm shape that runs on road networks with millions of nodes.

---

## Part 5 — The data was the hard part

**This is our strongest section. It's what separates us from a textbook exercise.**

Real data is messy, and we can prove we dealt with it rather than hoping.

### How we caught it

We measured **circuity** — walking distance ÷ straight-line distance — for all 55 building pairs. A real campus runs **×1.2–1.5**.

Ours came out at **×4.97**, with one pair at **×17.75**: two buildings **39 m apart** routed **690 m** around the block.

### Three causes, only one of them OSM's fault

| Problem | Cause | Fix |
|---|---|---|
| Network broke into 9 islands | OSM ways drawn crossing without sharing a node | Join components with gaps ≤ 20 m |
| No paths *between* buildings | OSM maps paths *around* buildings, not between | 8 **assumed** connectors, clearly flagged |
| **Every route inflated** | **Our own model: one doorway per building** | **Up to 3 access points — let Dijkstra pick the door** |

That third one was **our bug, not the data's**. Attaching a building to its single nearest path handed it an access point that was physically close but topologically on the wrong side. Buildings have more than one entrance; modelling that fixed it.

### The result

| Metric | Before | After |
|---|---|---|
| Average detour factor | ×4.97 | **×1.79** |
| Worst pair | ×17.75 | **×5.62** |
| Pairs over ×1.5 | 47 of 55 | **26 of 55** |

### The honest part — say this out loud

**None of us has walked the campus.** The 8 connectors are inferred from geometry alone: each links two points within 35 m that the network routes 120 m+ around, and none crosses a building footprint (we checked against the real OSM building polygons).

So we labelled them. `"assumed": true` in the data, **dashed amber** on the map, a legend entry that says *"assumed walkway (not OSM data)"*, and a hover tooltip repeating it. Delete `data/connectors.json`, rebuild, and you get a pure-OpenStreetMap graph.

Building names are the same kind of honesty: OSM records **no names** for any building here, so ours are representative campus buildings matched to each footprint's real size and position — not the actual Jessup names.

> **The line to land it:** *Dijkstra was correct the entire time. The graph was wrong. An algorithm is only ever as good as the data you hand it — so we measured our data instead of trusting it.*

---

## Part 6 — The demo

| Feature | What's happening underneath |
|---|---|
| From / To dropdowns | Only buildings are offered; junctions are routable but not destinations |
| Click two buildings | First sets start, second sets destination |
| **Click open ground** | Spatial grid snaps to the nearest walkable node — "current position" |
| Route drawn in blue | The edge trail Dijkstra returned |
| Distance / walk time | Summed edge weights; time at ~78 m/min |
| **Nodes settled** | How much of the graph the search actually finalised |
| **Stale entries** | The lazy-heap trick, live |
| Click a path to close it | The edge id joins a closed set; Dijkstra skips it and reroutes |

### Suggested demo order

1. **Library → Gymnasium** — 518 m, 7 min, 117 of 145 settled
2. **Change the destination** — route redraws instantly; watch *nodes settled* change with it
3. **Click open ground** — the pin snaps to the path network and reroutes from there
4. **Close a path mid-campus** — the route detours; distance and settled count both rise

> **Demo warning:** close a path in the **middle of campus**, not the short stub beside a building. Several buildings have only one access path, so closing it correctly reports "no route found" — which is right, but looks like a crash if you weren't expecting it.

---

## Part 7 — Team brief

### Who presents what

| Presenter | Sections | Owns | Must be able to answer |
|---|---|---|---|
| **Algorithms** | 2, 3, 4 | `app/src/core/` | Why Dijkstra is correct; why a heap beats a scan; the lazy-heap trick |
| **Data** | 1, 5 | `scripts/`, `data/` | Why junctions are detected not placed; what circuity is and why ×4.97 was wrong |
| **UI** | 6 + live demo | `app/src/components/` | How a returned edge list becomes a blue line on a real map |

Everyone should be able to explain **relaxation** and **the 680 → 610 moment**. That's the idea the whole project rests on.

### Flow (~10 min)

1. **Problem** (1 min) — a map is a picture; a computer needs a graph
2. **Model** (1.5 min) — nodes, edges, weights; junctions detected, not placed
3. **Algorithm** (3 min) — relaxation, then walk the trace on the board
4. **Data structures** (2 min) — adjacency list vs matrix, heap vs scan, lazy deletion
5. **The data problem** (2 min) — ×4.97 → ×1.79, and what we labelled as assumed
6. **Live demo** (1.5 min) — route it, then close a path
7. **Questions**

**Open on the trace table, not the app.** Show you understand it, *then* show it running. The demo confirms the explanation; it doesn't replace it.

### Questions she's likely to ask

**"Why Dijkstra and not BFS?"**
BFS finds the fewest *edges*, not the shortest *distance*. In the prototype, Dorm C → Gym direct is 2 edges / 680 m; via the Cafeteria it's 3 edges / 610 m. BFS returns the 680 m route. BFS is only right when every edge costs the same — ours don't.

**"What about A\*?"**
A* is Dijkstra plus a heuristic pulling the search toward the goal — straight-line distance, which we have since nodes carry real coordinates. It settles fewer nodes and is the natural next step. At 145 nodes the saving is real but modest, and Dijkstra is the honest baseline to understand first.

**"Would it work with negative weights?"**
No, and we can say exactly why: Dijkstra finalises a node the moment it leaves the queue, which assumes detours never make a path cheaper. A negative edge breaks that. Bellman-Ford handles negatives at higher cost. Distances can't be negative, so it isn't a limitation here.

**"What's the complexity?"**
O((V + E) log V). Each node and edge contributes at most one heap entry; each heap operation is log V.

**"Why write your own priority queue?"**
JavaScript has no built-in heap, and understanding it was the point. About 60 lines: bubble up, bubble down.

**"How do you know it's right?"**
We cross-checked every route against **Floyd-Warshall**, a completely different shortest-path algorithm, across 110 pairs — maximum disagreement 2.3e-13, which is floating-point noise. We also verified the heap on 200 randomised trials and the spatial index against brute force on 300 random points.

**"Is that real map data?"**
Yes — 78 pedestrian ways from OpenStreetMap, measured with the Haversine formula. With 8 clearly-labelled assumed connectors where OSM has gaps, and building names of our own because OSM records none.

**"What would you improve?"**
A* for larger maps. Surveyed distances and real building names from an actual campus visit. Time-based weights so stairs and hills cost more than flat ground. And accessibility routing — a step-free route is a genuinely different shortest path, and it's the same algorithm with different weights.

### Ground rules

- **Don't read code off the screen.** She's said she doesn't care about it. Talk about ideas; open a file only if asked.
- **If the demo fails, present the trace table.** The concepts are the grade. The 7-node worked example above is the fallback, independent of the live map.
- **Volunteer the limitations** — the assumed connectors, the invented names, the single-access buildings. Knowing exactly what's weak reads far stronger than pretending nothing is.
