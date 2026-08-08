import { useEffect, useRef } from 'react'
import { meta, edges, landmarks } from '../core/campus'
import { DISRUPTIONS } from '../core/disruptions'
import { CloseIcon } from './icons'

/**
 * Full-page reference: what the app does, how the campus is stored, which data
 * structures carry it, and how Dijkstra uses them.
 *
 * Everything here is written against the real code in src/core and the real
 * shape of data/campus.json. If you change one, change the other.
 */

/** Derived from the data rather than typed in, so it cannot drift. */
const geometryPoints = edges.reduce((n, e) => n + e.geometry.length, 0)

const SECTIONS = [
  ['overview', 'Overview'],
  ['storage', 'How the data is stored'],
  ['structures', 'Data structures'],
  ['algorithm', "Dijkstra's algorithm"],
  ['trace', 'A worked trace'],
  ['disruptions', 'Disruptions'],
  ['complexity', 'Complexity'],
  ['files', 'Where the code lives'],
]

export default function Guide({ onClose }) {
  const mainRef = useRef(null)
  const dialogRef = useRef(null)

  // Escape closes, and focus moves into the dialog so the arrow keys scroll
  // the guide rather than panning the map underneath.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  /**
   * Scrolls within the dialog instead of navigating. A plain href="#overview"
   * would overwrite the #guide hash and close the very page it is scrolling.
   */
  const jumpTo = (id) => (e) => {
    e.preventDefault()
    const target = mainRef.current?.querySelector(`#${id}`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      className="guide-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="guide"
        role="dialog"
        aria-modal="true"
        aria-label="How the Campus Route Planner works"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="guide-head">
          <h1>How the Campus Route Planner works</h1>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close the guide"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="guide-body">
          <nav className="guide-toc" aria-label="Contents">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={jumpTo(id)}>
                {label}
              </a>
            ))}
          </nav>

          <article className="guide-main" ref={mainRef}>
          {/* ---------------------------------------------------- overview */}
          <section id="overview">
            <h2>Overview</h2>
            <p>
              The app answers one question: <b>what is the shortest walk from A
              to B on this campus?</b> Everything else exists to support that
              question or to show its working.
            </p>
            <p>
              The campus is modelled as a <b>weighted undirected graph</b>.
              Junctions and building entrances are <b>nodes</b>; the footpaths
              between them are <b>edges</b>, weighted by their length in metres.
              Finding a route means finding the lowest-total-weight path through
              that graph, which is exactly what Dijkstra's algorithm does.
            </p>

            <div className="pipeline-flow">
              {[
                ['OpenStreetMap', 'raw pedestrian ways'],
                ['Build scripts', 'clean, weight, connect'],
                ['campus.json', `${meta.nodes} nodes, ${meta.edges} edges`],
                ['Graph', 'adjacency list in memory'],
                ['Dijkstra', 'min-heap search'],
                ['Leaflet', 'polylines on the map'],
              ].map(([step, sub], i, arr) => (
                <div className="flow-step" key={step}>
                  <b>{step}</b>
                  <span>{sub}</span>
                  {i < arr.length - 1 && <i className="flow-arrow">→</i>}
                </div>
              ))}
            </div>

            <p className="callout">
              The first three stages run <b>once, offline</b>, and the result is
              committed to the repo. At runtime the app never calls a routing
              service — the only network request is for map tiles.
            </p>
          </section>

          {/* ----------------------------------------------------- storage */}
          <section id="storage">
            <h2>How the data is stored</h2>
            <p>
              Everything the app knows about the campus lives in one file,{' '}
              <code>data/campus.json</code>, with four top-level keys.
            </p>

            <h3>Nodes — the points</h3>
            <p>
              A flat array. Each node is an id and a coordinate, nothing more.
              Junction ids keep their OpenStreetMap identity (<code>n…</code>);
              building nodes are prefixed <code>lm-</code> so the spatial index
              can filter them out.
            </p>
            <pre className="code">{`{ "id": "n433296989", "lat": 38.8182936, "lon": -121.2925451 }`}</pre>

            <h3>Edges — the paths</h3>
            <p>
              Each edge names the two nodes it joins, its <b>weight</b> in
              metres, and a <b>geometry</b> array of the points needed to draw
              its real curve. The weight is the true walked length along that
              curve, not the straight line between the endpoints.
            </p>
            <pre className="code">{`{
  "id": "e0",
  "from": "n433296989",
  "to": "n12076200227",
  "weight": 8,
  "geometry": [[38.8182936, -121.2925451],
               [38.8183292, -121.2924647]]
}`}</pre>
            <p>
              Two ideas are deliberately separate here:{' '}
              <b>topology</b> (<code>from</code>, <code>to</code>) is what the
              algorithm searches, and <b>geometry</b> is what the map draws.
              Dijkstra never looks at the geometry array. Across all{' '}
              {meta.edges} edges there are {geometryPoints} geometry points — a
              path can bend many times but still be a single edge with a single
              weight.
            </p>
            <p>
              Inferred connectors carry <code>"assumed": true</code> so the UI
              can draw them dashed and the honesty note in the README stays
              true.
            </p>

            <h3>Landmarks — the buildings</h3>
            <p>
              The dropdown list — {landmarks.length} destinations. Each landmark
              points at the graph node that represents it, plus{' '}
              <code>snapM</code>, how far that node sits from the building
              centre, and <code>accessPoints</code>, how many doorways it was
              given.
            </p>
            <pre className="code">{`{
  "id": "security-kiosk",
  "name": "Security Kiosk",
  "color": "#475569",
  "lat": 38.820384, "lon": -121.292084,
  "nodeId": "lm-security-kiosk",
  "snapM": 4.6,
  "accessPoints": 3
}`}</pre>

            <h3>Meta — provenance</h3>
            <p>
              Counts and build notes, so the numbers in the UI come from the
              data rather than from a hard-coded constant.
            </p>
            <div className="meta-grid">
              {[
                ['Nodes', meta.nodes],
                ['Edges', meta.edges],
                ['Path network', `${(meta.totalPathMetres / 1000).toFixed(1)} km`],
                ['Assumed connectors', meta.assumedConnectors],
                ['Components found', meta.componentsFound],
                ['Islands dropped', meta.nodesDroppedAsIslands],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </div>

            <p className="callout">
              <b>Why JSON on disk rather than a database?</b> The graph is small,
              read-only, and never changes at runtime. Anything more would be
              machinery without a purpose — and shipping the file means the demo
              works with no backend and no network.
            </p>
          </section>

          {/* -------------------------------------------------- structures */}
          <section id="structures">
            <h2>Data structures</h2>
            <p>
              Four structures do the real work, all in <code>src/core/</code>{' '}
              and all free of React and Leaflet.
            </p>

            <h3>1. Adjacency list — the graph</h3>
            <p>
              Two <code>Map</code>s. One holds nodes by id; the other holds, for
              each node id, the array of edges leaving it.
            </p>
            <pre className="code">{`nodes:     Map<nodeId, { id, lat, lon }>
adjacency: Map<nodeId, Array<{ to, weight, id }>>

"n433296989" → [ { to: "n12076200227", weight: 8,  id: "e0" },
                 { to: "n433296991",   weight: 41, id: "e7" } ]`}</pre>
            <p>
              The graph is <b>undirected</b>, so every edge is inserted twice —
              once in each direction — but both copies carry the{' '}
              <b>same edge id</b>. That shared id is what lets one click close a
              path in both directions, and what lets the route highlight find
              the right polyline.
            </p>
            <p>
              <b>Why not an adjacency matrix?</b> A matrix would be{' '}
              {meta.nodes} × {meta.nodes} ={' '}
              {(meta.nodes * meta.nodes).toLocaleString()} slots to store{' '}
              {meta.edges} edges — over 99% empty. The map is sparse: each
              junction touches two to four others. Dijkstra's inner loop asks
              "who are u's neighbours?" constantly, and a list answers in time
              proportional to the actual neighbours instead of scanning a
              mostly-empty row of {meta.nodes}.
            </p>

            <h3>2. Binary min-heap — the priority queue</h3>
            <p>
              Dijkstra repeatedly needs the closest unfinished node. Scanning
              every node costs O(V) each time. A heap answers in O(log V).
            </p>
            <p>
              It is a plain array with one invariant:{' '}
              <b>every parent's priority is ≤ both of its children's</b>. The
              tree is implicit — the children of index <code>i</code> live at{' '}
              <code>2i+1</code> and <code>2i+2</code>, so no pointers are needed.
            </p>
            <pre className="code">{`push 5, 3, 8, 1  →  array [1, 3, 8, 5]

index:  0     1     2     3
        1     3     8     5

                1          ← root is always the minimum
               / \\
              3   8
             /
            5`}</pre>
            <p>
              <code>enqueue</code> appends then <b>bubbles up</b> while it is
              smaller than its parent. <code>dequeue</code> takes the root, moves
              the last element into its place, then <b>bubbles down</b> while it
              is larger than a child. Both touch at most one node per level, so
              both are O(log n).
            </p>

            <h3>3. Uniform spatial grid — click to nearest node</h3>
            <p>
              When you click open ground, the app has to answer "which junction
              is nearest?". The grid buckets every junction into 60 m cells
              keyed by its row and column.
            </p>
            <pre className="code">{`key(lat, lon) = floor(lat / latStep) + ":" + floor(lon / lonStep)
cells: Map<"row:col", Node[]>`}</pre>
            <p>
              A lookup checks the click's own cell, then expands ring by ring,
              stopping as soon as the best hit so far is closer than the next
              ring could possibly contain. Building nodes are excluded from the
              index, so a click snaps to a path you could actually stand on
              rather than to the middle of a building.
            </p>
            <p>
              Distances use the <b>haversine formula</b>, so both the edge
              weights and the snap distances are real metres on a sphere rather
              than degrees of latitude.
            </p>
            <p className="callout">
              Honest note: at {meta.nodes} nodes a plain linear scan would
              already be fast enough. The grid is here because it keeps clicks
              near-constant-time as the network grows, and because "snap a point
              to a network" deserves a real answer.
            </p>

            <h3>4. Map and Set — the bookkeeping</h3>
            <p>
              Dijkstra itself runs on four collections, all chosen for O(1)
              lookup:
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>Structure</th>
                  <th>Type</th>
                  <th>Holds</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>dist</code></td>
                  <td>Map</td>
                  <td>best known distance to each node</td>
                </tr>
                <tr>
                  <td><code>prev</code></td>
                  <td>Map</td>
                  <td>which node we came from — rebuilds the path</td>
                </tr>
                <tr>
                  <td><code>prevEdge</code></td>
                  <td>Map</td>
                  <td>which edge we came along — rebuilds the drawing</td>
                </tr>
                <tr>
                  <td><code>settled</code></td>
                  <td>Array</td>
                  <td>nodes finalised, in order — the "nodes settled" stat</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* --------------------------------------------------- algorithm */}
          <section id="algorithm">
            <h2>Dijkstra's algorithm</h2>
            <p>
              The idea in one sentence:{' '}
              <b>
                always expand the closest unfinished node, and a node's distance
                is final the moment it comes off the queue.
              </b>
            </p>
            <pre className="code">{`dist[start] = 0;  dist[everything else] = Infinity
push (start, 0) onto the heap

while heap is not empty:
    (u, d) = pop the smallest
    if d > dist[u]:  discard — stale copy;  continue
    mark u settled
    if u == destination:  stop early
    for each neighbour v of u:
        if edge is closed:  skip
        alt = dist[u] + weight(u, v) x factor
        if alt < dist[v]:
            dist[v] = alt;  prev[v] = u;  prevEdge[v] = edge
            push (v, alt)`}</pre>

            <h3>Why it is correct</h3>
            <p>
              Because every weight is <b>non-negative</b>. When a node comes off
              the heap it has the smallest tentative distance of anything
              unfinished, and no future path could reach it more cheaply — any
              detour would have to pass through something further away and then
              add more. That guarantee is what licenses the <b>early exit</b>{' '}
              when the destination is settled, and it is exactly what negative
              weights would break.
            </p>

            <h3>The lazy heap</h3>
            <p>
              Textbook Dijkstra uses <i>decrease-key</i> to update a node's
              priority in place. A binary heap cannot do that without also
              maintaining an index from node to heap position. So this
              implementation does the standard practical thing:{' '}
              <b>push the improved copy and ignore the old one</b> when it
              surfaces.
            </p>
            <pre className="code">{`if (priority > dist.get(u)) { stale++; continue }`}</pre>
            <p>
              That one line is the whole trick. The "stale entries discarded"
              counter in the notes drawer is how often it fired — the price of
              skipping decrease-key, and it is a bargain.
            </p>

            <h3>Why not something else?</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Algorithm</th>
                  <th>Why not here</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>BFS</td>
                  <td>
                    Minimises the <i>number of edges</i>, not distance. Only
                    correct if every edge has equal weight — ours range from a
                    few metres to hundreds.
                  </td>
                </tr>
                <tr>
                  <td>A*</td>
                  <td>
                    Would work well; straight-line distance is an admissible
                    heuristic. Dijkstra <i>is</i> A* with the heuristic fixed at
                    zero, which is why it settles more nodes than it strictly
                    needs to.
                  </td>
                </tr>
                <tr>
                  <td>Bellman–Ford</td>
                  <td>
                    Handles negative weights, at O(V·E). We have no negative
                    weights, so we would be paying for nothing.
                  </td>
                </tr>
                <tr>
                  <td>Floyd–Warshall</td>
                  <td>
                    All-pairs at O(V³) — {(meta.nodes ** 3).toLocaleString()}{' '}
                    operations to answer one query.
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* ------------------------------------------------------- trace */}
          <section id="trace">
            <h2>A worked trace</h2>
            <p>
              Four nodes, A to D. Note that the shortest route is{' '}
              <b>not</b> the one with the fewest edges.
            </p>
            <pre className="code">{`      4
  A ------- B
  |       / |
 2|     1/  |5
  |    /    |
  C --------D
       8`}</pre>

            <table className="table">
              <thead>
                <tr>
                  <th>Pop</th>
                  <th>Settle</th>
                  <th>Relaxations</th>
                  <th>dist after</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>(A, 0)</td>
                  <td>A</td>
                  <td>B = 0+4 = 4 · C = 0+2 = 2</td>
                  <td>A0 B4 C2 D∞</td>
                </tr>
                <tr>
                  <td>(C, 2)</td>
                  <td>C</td>
                  <td>B = 2+1 = 3 <b>improves 4</b> · D = 2+8 = 10</td>
                  <td>A0 B3 C2 D10</td>
                </tr>
                <tr>
                  <td>(B, 3)</td>
                  <td>B</td>
                  <td>D = 3+5 = 8 <b>improves 10</b></td>
                  <td>A0 B3 C2 D8</td>
                </tr>
                <tr>
                  <td>(D, 8)</td>
                  <td>D</td>
                  <td>destination settled — <b>stop</b></td>
                  <td>A0 B3 C2 D8</td>
                </tr>
              </tbody>
            </table>

            <p>
              <b>Answer: A → C → B → D, cost 8.</b> BFS would have returned
              A → B → D — two edges instead of three, but a cost of 9. Fewer
              stops, longer walk.
            </p>
            <p>
              The heap still holds <code>(B, 4)</code> and <code>(D, 10)</code>{' '}
              when we stop. Had the search continued, each would have popped,
              failed the <code>priority &gt; dist[u]</code> test, and been
              counted as stale.
            </p>
            <p>
              Then the path is rebuilt <b>backwards</b> from D through{' '}
              <code>prev</code>: D ← B ← C ← A, reversed to A → C → B → D. The
              parallel <code>prevEdge</code> map gives the edge ids, which become
              the highlighted polylines.
            </p>
          </section>

          {/* ------------------------------------------------- disruptions */}
          <section id="disruptions">
            <h2>Disruptions — construction, maintenance, closure</h2>
            <p>
              Clicking a path lets you interrupt it. There are two genuinely
              different things this can do to the graph, and the difference is
              the point.
            </p>

            <table className="table">
              <thead>
                <tr>
                  <th>State</th>
                  <th>Factor</th>
                  <th>What changes</th>
                </tr>
              </thead>
              <tbody>
                {['maintenance', 'construction', 'closed'].map((id) => {
                  const d = DISRUPTIONS[id]
                  return (
                    <tr key={id}>
                      <td>
                        <span className={`swatch swatch--${id}`} /> {d.label}
                      </td>
                      <td>{d.factor === Infinity ? '∞' : `×${d.factor}`}</td>
                      <td>
                        {d.factor === Infinity
                          ? 'The edge is skipped entirely — the graph loses a connection.'
                          : 'The edge stays, but costs more to use.'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <p>
              <b>Weight changes move the answer. Topology changes can destroy
              it.</b> Raising a weight makes a path expensive, so Dijkstra
              usually detours — but if every alternative is worse it will happily
              walk you straight through the construction zone, which is the right
              answer and often the most surprising moment of a demo. Closing an
              edge removes it from the search altogether, and enough closures
              make a destination <i>unreachable</i> no matter how far you are
              willing to walk.
            </p>

            <p>None of this rebuilds the graph. It is one lookup per relaxation:</p>
            <pre className="code">{`const factor = factors.get(edgeId) ?? 1
if (factor === Infinity) continue        // closed: not in today's graph
const alt = dist.get(u) + weight * factor`}</pre>

            <p>
              Every factor is <b>≥ 1</b>, so scaled weights stay non-negative and
              the correctness argument above still holds. A factor below zero
              would break Dijkstra outright and force Bellman–Ford.
            </p>
            <p>
              To price the interruption, the app simply runs the search{' '}
              <b>twice</b> — once with the disruptions and once on a clear
              campus — and reports the difference as the detour distance and
              delay.
            </p>
          </section>

          {/* -------------------------------------------------- complexity */}
          <section id="complexity">
            <h2>Complexity</h2>
            <p>
              With V = {meta.nodes} nodes and E = {meta.edges} edges:
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Cost</th>
                  <th>Why</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Build the graph</td>
                  <td>O(V + E)</td>
                  <td>one pass over each array, once at startup</td>
                </tr>
                <tr>
                  <td>heap enqueue / dequeue</td>
                  <td>O(log V)</td>
                  <td>one swap per level of the tree</td>
                </tr>
                <tr>
                  <td>Full search</td>
                  <td>O((V + E) log V)</td>
                  <td>every edge can trigger one push, each push O(log V)</td>
                </tr>
                <tr>
                  <td>Nearest node to a click</td>
                  <td>≈O(1)</td>
                  <td>grid cells scanned, not all nodes</td>
                </tr>
                <tr>
                  <td>Rebuild the path</td>
                  <td>O(path length)</td>
                  <td>follow <code>prev</code> backwards</td>
                </tr>
                <tr>
                  <td>Memory</td>
                  <td>O(V + E)</td>
                  <td>adjacency list, not a V² matrix</td>
                </tr>
              </tbody>
            </table>
            <p>
              In practice a full search here settles ~100 nodes and completes in
              well under a millisecond, which is why the route updates the
              instant you change anything rather than behind a spinner.
            </p>
          </section>

          {/* ------------------------------------------------------- files */}
          <section id="files">
            <h2>Where the code lives</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Responsibility</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['core/Graph.js', 'Adjacency list — nodes, edges, neighbours'],
                  ['core/PriorityQueue.js', 'Binary min-heap'],
                  ['core/dijkstra.js', 'The search, path rebuild, stats'],
                  ['core/SpatialGrid.js', 'Click → nearest node, haversine'],
                  ['core/disruptions.js', 'Disruption states and weight factors'],
                  ['core/campus.js', 'Loads campus.json, builds the graph once'],
                  ['components/MapView.jsx', 'Leaflet layers, path condition popup'],
                  ['components/*.jsx', 'Search card, results, legend, notes'],
                  ['scripts/', 'OSM fetch, graph build, connector proposal'],
                  ['data/campus.json', 'The committed graph'],
                ].map(([f, r]) => (
                  <tr key={f}>
                    <td>
                      <code>{f}</code>
                    </td>
                    <td>{r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="callout">
              The <code>core/</code> modules import nothing from React or
              Leaflet. You could run the whole search in Node with no browser —
              which is the clearest evidence that the algorithm layer and the
              display layer are genuinely separate.
            </p>
          </section>

            <footer className="guide-foot">
              Map data © OpenStreetMap contributors, ODbL 1.0 · graph built{' '}
              {meta.generated} · {meta.campus}
            </footer>
          </article>
        </div>
      </div>
    </div>
  )
}
