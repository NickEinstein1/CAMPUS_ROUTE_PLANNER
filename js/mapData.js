/**
 * Campus map data — loads graph topology, edge weights, and handles closures.
 *
 * This module turns the real campus layout (from Project.png) into a Graph object
 * that Dijkstra can search. It also simulates road closures for edge-case testing.
 *
 * Team member: Data
 */

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
