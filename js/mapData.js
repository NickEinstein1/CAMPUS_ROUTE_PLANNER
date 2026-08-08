/**
 * Campus map data — loads graph topology, edge weights, and handles closures.
 *
 * This module turns the real campus layout (from Project.png) into a Graph object
 * that Dijkstra can search. It also simulates road closures for edge-case testing.
 *
 * Team member: Data
 */

/**
 * Fixed row/column order for the adjacency matrix (7 campus nodes).
 * Matrix[i][j] = distance in meters from node i to node j (0 = no direct road).
 */
const CAMPUS_NODE_ORDER = [
  "library",
  "eng_hall",
  "dorm_c",
  "gym",
  "cafeteria",
  "intersection_upper",
  "intersection_lower",
];

/** Short labels for printing the matrix (matches CAMPUS_NODE_ORDER). */
const CAMPUS_MATRIX_LABELS = [
  "Library",
  "Eng Hall",
  "Dorm C",
  "Gym",
  "Cafeteria",
  "Int Upper",
  "Int Lower",
];

/**
 * Initial adjacency matrix for the campus graph (weights in meters).
 * Symmetric because every road is walkable both ways.
 *
 * Reading the matrix:
 *   - Rows and columns follow CAMPUS_NODE_ORDER above.
 *   - Diagonal entries are 0 (distance from a node to itself).
 *   - 0 off the diagonal means no direct road between those two nodes.
 *   - A positive number is the edge weight (path length in meters).
 *
 * Example: matrix[2][6] = 180 → Dorm C to Lower intersection is 180 m.
 *
 *        Lib  Eng  Dorm Gym  Cafe IU   IL
 * Library [ 0    0  150   0    0  180   0 ]
 * Eng Hall[ 0    0    0  320    0  180 200 ]
 * Dorm C  [150   0    0    0    0    0 180 ]
 * Gym     [ 0  320    0    0  230    0 500 ]
 * Cafeteria[ 0    0    0  230    0    0 200 ]
 * Int Upper[180  180    0    0    0    0 140 ]
 * Int Lower[ 0  200  180  500  200  140   0 ]
 */
const INITIAL_ADJACENCY_MATRIX = [
  [0, 0, 150, 0, 0, 180, 0],
  [0, 0, 0, 320, 0, 180, 200],
  [150, 0, 0, 0, 0, 0, 180],
  [0, 320, 0, 0, 230, 0, 500],
  [0, 0, 0, 230, 0, 0, 200],
  [180, 180, 0, 0, 0, 0, 140],
  [0, 200, 180, 500, 200, 140, 0],
];

/** Preset closure scenarios for the UI dropdown. */
/** @type {Array<{ id: string, label: string }>} */
const CLOSURE_PRESETS = [
  { id: "none", label: "No closures" },
  { id: "cafeteria-gym", label: "Cafeteria ↔ Gym closed" },
  { id: "dorm-lower", label: "Dorm C ↔ Lower intersection closed" },
  { id: "upper-lower", label: "Upper ↔ Lower intersection closed" },
];

/**
 * Build the campus graph matching Project.png layout.
 * Distances are in meters. Dorm C → Gym via Cafeteria = 610 m (demo route).
 * @returns {Graph}
 */
function buildCampusGraph() {
  const g = new Graph();

  // Named locations — these appear in the From/To dropdowns (green circles in mockup).
  g.addNode("library", "Library", 120, 80, "location");
  g.addNode("eng_hall", "Engineering Hall", 480, 80, "location");
  g.addNode("dorm_c", "Dorm C", 80, 220, "location");
  g.addNode("gym", "Gym", 520, 340, "location");
  g.addNode("cafeteria", "Cafeteria", 280, 320, "location");

  // Intersection waypoints — help model turns; not shown in dropdowns (grey dots).
  g.addNode("intersection_upper", "", 300, 80, "intersection");
  g.addNode("intersection_lower", "", 300, 220, "intersection");

  // Roads between nodes. Third argument = weight (meters). Fourth = unique edge id.
  g.addEdge("library", "dorm_c", 150, "library-dorm_c");
  g.addEdge("library", "intersection_upper", 180, "library-intersection_upper");
  g.addEdge("intersection_upper", "eng_hall", 180, "intersection_upper-eng_hall");
  g.addEdge("intersection_upper", "intersection_lower", 140, "intersection_upper-intersection_lower");
  g.addEdge("dorm_c", "intersection_lower", 180, "dorm_c-intersection_lower");
  g.addEdge("eng_hall", "intersection_lower", 200, "eng_hall-intersection_lower");
  g.addEdge("intersection_lower", "cafeteria", 200, "intersection_lower-cafeteria");
  g.addEdge("cafeteria", "gym", 230, "cafeteria-gym");
  g.addEdge("intersection_lower", "gym", 500, "intersection_lower-gym"); // longer alternate
  g.addEdge("eng_hall", "gym", 320, "eng_hall-gym");

  return g;
}

/**
 * Build an adjacency matrix from the graph (same layout as INITIAL_ADJACENCY_MATRIX).
 * Useful to verify the live graph matches the documented initial matrix.
 * @param {Graph} graph
 * @param {string[]} [nodeOrder=CAMPUS_NODE_ORDER]
 * @returns {number[][]}
 */
function buildAdjacencyMatrixFromGraph(graph, nodeOrder = CAMPUS_NODE_ORDER) {
  const n = nodeOrder.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (const { to, weight } of graph.getNeighbors(nodeOrder[i])) {
      const j = nodeOrder.indexOf(to);
      if (j !== -1) matrix[i][j] = weight;
    }
  }
  return matrix;
}

/**
 * Format the adjacency matrix as a readable table string for the output panel.
 * @param {number[][]} matrix
 * @param {string[]} [labels=CAMPUS_MATRIX_LABELS]
 * @returns {string}
 */
function formatAdjacencyMatrix(matrix, labels = CAMPUS_MATRIX_LABELS) {
  const colWidth = 6;
  const header = "".padStart(colWidth) + labels.map((l) => l.padStart(colWidth)).join("");
  const rows = matrix.map((row, i) =>
    labels[i].padEnd(colWidth) + row.map((v) => String(v).padStart(colWidth)).join("")
  );
  return [header, ...rows].join("\n");
}

/**
 * Initial distance vector for Dijkstra before the main loop runs.
 * Every node starts at Infinity (unknown); the source is set to 0.
 * @param {Graph} graph
 * @param {string} startId
 * @param {string[]} [nodeOrder=CAMPUS_NODE_ORDER]
 * @returns {Map<string, number>}
 */
function createInitialDistanceMap(graph, startId, nodeOrder = CAMPUS_NODE_ORDER) {
  const dist = new Map();
  for (const id of nodeOrder) {
    if (graph.getNode(id)) dist.set(id, Infinity);
  }
  dist.set(startId, 0);
  return dist;
}

/**
 * Format the initial distance vector as a one-column table (for display / debugging).
 * @param {Map<string, number>} dist
 * @param {string[]} [nodeOrder=CAMPUS_NODE_ORDER]
 * @param {Graph} graph
 * @returns {string}
 */
function formatInitialDistanceVector(dist, graph, nodeOrder = CAMPUS_NODE_ORDER) {
  return nodeOrder
    .filter((id) => graph.getNode(id))
    .map((id) => {
      const label = graph.getNode(id).label || id;
      const value = dist.get(id) === Infinity ? "∞" : dist.get(id);
      return `${label.padEnd(16)} ${value}`;
    })
    .join("\n");
}

/**
 * Convert a closure preset id into a Set of blocked edge ids.
 * Dijkstra skips any edge whose id is in this set.
 * @param {string} presetId
 * @returns {Set<string>}
 */
function getClosedEdges(presetId) {
  const closed = new Set();
  switch (presetId) {
    case "cafeteria-gym":
      closed.add("cafeteria-gym");
      break;
    case "dorm-lower":
      closed.add("dorm_c-intersection_lower");
      break;
    case "upper-lower":
      closed.add("intersection_upper-intersection_lower");
      break;
    default:
      break; // "none" — empty set, all roads open
  }
  return closed;
}

/**
 * Get each road once for drawing (adjacency list stores each edge twice).
 * @param {Graph} graph
 * @returns {Array<{ id: string, from: string, to: string, weight: number }>}
 */
function getUniqueEdges(graph) {
  const seen = new Set();
  const edges = [];

  for (const [from, neighbors] of graph.adjacency) {
    for (const { to, weight, id } of neighbors) {
      // Sort ids so A-B and B-A count as the same undirected edge.
      const key = [from, to].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ id, from, to, weight });
    }
  }
  return edges;
}

/**
 * Turn a list of node ids into a readable route string for the output panel.
 * Example: "Dorm C → intersection → Cafeteria → Gym"
 * @param {Graph} graph
 * @param {string[]} path
 * @returns {string}
 */
function formatPathDescription(graph, path) {
  const labels = path.map((id) => {
    const node = graph.getNode(id);
    if (!node) return id;
    return node.type === "location" ? node.label : "intersection";
  });
  return labels.join(" → ");
}
