import { meta } from '../core/campus'
import { CloseIcon } from './icons'

/**
 * Demo companion: the data structure behind each module, why it was chosen,
 * and how the four fit together. Content mirrors src/core — if you change an
 * implementation, change the note.
 */
const MODULES = [
  {
    file: 'core/Graph.js',
    title: 'Graph',
    structure: 'Adjacency list — Map<nodeId, Edge[]>',
    cost: 'neighbours O(deg u) · memory O(V + E)',
    points: [
      'Two Maps: nodes (id → lat/lon) and adjacency (id → neighbour list).',
      'Undirected, so every edge is stored twice but shares one edge id — that is what lets a single click close both directions.',
      `A matrix would be ${meta.nodes} × ${meta.nodes} = ${(meta.nodes * meta.nodes).toLocaleString()} slots for ${meta.edges} edges. The map is sparse: each junction touches 2–4 others.`,
    ],
  },
  {
    file: 'core/PriorityQueue.js',
    title: 'Priority queue',
    structure: 'Binary min-heap over a plain array',
    cost: 'enqueue / dequeue O(log V) · peek O(1)',
    points: [
      'Invariant: every parent’s priority ≤ both children’s. Children of i live at 2i+1 and 2i+2, so no pointers are needed.',
      'enqueue pushes to the end then bubbles up; dequeue takes the root, moves the last item there, then bubbles down.',
      'Answers “which unvisited node is closest?” in O(log V) instead of the O(V) a linear scan would cost.',
    ],
  },
  {
    file: 'core/dijkstra.js',
    title: "Dijkstra's algorithm",
    structure: 'Greedy + heap, with dist / prev / prevEdge maps',
    cost: 'O((V + E) log V)',
    points: [
      'dist starts at 0 for the start node and Infinity everywhere else; each pass settles the closest unfinished node and relaxes its neighbours.',
      'Non-negative weights mean a node is final the moment it leaves the heap — so we stop as soon as the destination is settled.',
      'No decrease-key: an improved node is pushed again and the outdated copy is skipped when it surfaces. That is the “stale entries” count.',
      'prev and prevEdge let us walk backwards from the destination to rebuild the path and the exact edges to draw.',
      'Disruptions are applied as a per-edge multiplier inside the relax loop, so nothing is rebuilt when a path changes condition.',
    ],
  },
  {
    file: 'core/disruptions.js',
    title: 'Disruptions',
    structure: 'Map<edgeId, stateId> → Map<edgeId, factor>',
    cost: 'no extra asymptotic cost — one Map lookup per relax',
    points: [
      'Maintenance (×2) and construction (×5) multiply an edge’s weight. The graph keeps its shape; only the cost of that edge changes.',
      'Closure (×∞) is skipped in the relax loop, which removes the edge from the search. That changes the topology and can make a node unreachable.',
      'This is the whole lesson: a weight change moves the answer, a topology change can destroy it.',
      'Every factor is ≥ 1, so weights stay non-negative and Dijkstra’s “final on dequeue” guarantee survives. Negative factors would need Bellman–Ford.',
      'The app runs the search twice — once with disruptions, once clear — and reports the difference as the detour cost.',
    ],
  },
  {
    file: 'core/SpatialGrid.js',
    title: 'Spatial grid',
    structure: 'Uniform grid hash — Map<"row:col", Node[]>, 60 m cells',
    cost: '≈O(1) per lookup vs O(V) linear scan',
    points: [
      'Buckets every junction by floor(lat / step) and floor(lon / step).',
      'A lookup checks the click’s own cell, then expands ring by ring, stopping once the best hit is closer than the next ring could possibly hold.',
      'Distances use the haversine formula, so weights and snaps are real metres on a sphere.',
      'Building nodes are excluded from the index — a map click should snap to a path you can walk, not to a building centre.',
    ],
  },
]

const PIPELINE = [
  ['Build', `campus.json → Graph: ${meta.nodes} nodes and ${meta.edges} edges loaded into the adjacency list once, at startup.`],
  ['Point', 'A dropdown gives a node id directly. A map click goes to SpatialGrid.nearest() first, which snaps it to the closest junction.'],
  ['Search', 'dijkstra(graph, start, end, closedEdges) drives the min-heap: dequeue the closest node, relax its neighbours, enqueue the improvements.'],
  ['Rebuild', 'prevEdge is followed backwards from the destination to produce the ordered list of edge ids.'],
  ['Draw', 'Those ids become Leaflet polylines. React re-renders whenever start, destination, or the closure Set changes.'],
]

export default function NotesPanel({ open, onClose, result, meta }) {
  return (
    <aside
      className={`drawer${open ? ' is-open' : ''}`}
      aria-hidden={!open}
      aria-label="Data structures and algorithms"
    >
      <header className="drawer-head">
        <h2>How it works</h2>
        <button
          type="button"
          className="icon-btn"
          onClick={onClose}
          title="Close notes"
          aria-label="Close notes"
        >
          <CloseIcon />
        </button>
      </header>

      <div className="drawer-body">
        <p className="drawer-intro">
          Four framework-free modules in <code>src/core/</code>. Leaflet and
          React only draw the answer.
        </p>

        {result?.ok && (
          <div className="note-live">
            <h3>This run</h3>
            <dl>
              <div>
                <dt>Nodes settled</dt>
                <dd>
                  {result.settled} of {meta.nodes}
                </dd>
              </div>
              <div>
                <dt>Stale heap entries</dt>
                <dd>{result.stale}</dd>
              </div>
              <div>
                <dt>Edges in path</dt>
                <dd>{result.edgeIds.length}</dd>
              </div>
              <div>
                <dt>Distance</dt>
                <dd>{result.distance} m</dd>
              </div>
            </dl>
            <p className="note-aside">
              Settled below the node total is early exit doing its job — the
              search stopped when the destination came off the heap.
            </p>
          </div>
        )}

        {MODULES.map((m) => (
          <article className="note" key={m.file}>
            <h3>{m.title}</h3>
            <code className="note-file">{m.file}</code>
            <p className="note-structure">{m.structure}</p>
            <p className="note-cost">{m.cost}</p>
            <ul>
              {m.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </article>
        ))}

        <article className="note">
          <h3>How they fit together</h3>
          <ol className="pipeline">
            {PIPELINE.map(([step, text]) => (
              <li key={step}>
                <b>{step}.</b> {text}
              </li>
            ))}
          </ol>
        </article>

        <article className="note">
          <h3>Questions students ask</h3>
          <ul>
            <li>
              <b>Why not BFS?</b> BFS finds the fewest edges, not the shortest
              walk. Ten short segments can beat two long ones.
            </li>
            <li>
              <b>Why not A*?</b> A* would work here — straight-line distance is
              an admissible heuristic. Dijkstra is A* with the heuristic set to
              zero, which is why it settles more nodes.
            </li>
            <li>
              <b>What breaks with negative weights?</b> The “final on dequeue”
              guarantee. You would need Bellman–Ford.
            </li>
            <li>
              <b>Why do dashed amber lines exist?</b> OpenStreetMap maps paths
              around these buildings but not between them. Eight connectors were
              inferred from geometry and flagged as assumptions.
            </li>
          </ul>
        </article>
      </div>
    </aside>
  )
}
