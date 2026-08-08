/**
 * Graph module — adjacency-list representation of campus roads/paths.
 *
 * Think of the campus as a map of places (nodes) connected by walkable paths (edges).
 * We use an adjacency list because our campus map is "sparse" — each location only
 * connects to a few neighbors, not to every other location.
 *
 * Team member: Graph + Algorithms
 */

class Graph {
  constructor() {
    // All vertices: locations (Library, Gym…) and intersections (unnamed waypoints).
    // Map gives O(1) lookup by node id.
    /** @type {Map<string, { id: string, label: string, x: number, y: number, type: string }>} */
    this.nodes = new Map();

    // Adjacency list: for each node id, an array of { to, weight, id } neighbors.
    // This is the standard graph representation for routing algorithms.
    /** @type {Map<string, Array<{ to: string, weight: number, id: string }>>} */
    this.adjacency = new Map();
  }

  /**
   * Add a vertex to the graph.
   * @param {string} id       - Unique id (e.g. "dorm_c")
   * @param {string} label    - Display name (e.g. "Dorm C"); empty for intersections
   * @param {number} x        - X coordinate for drawing on the map
   * @param {number} y        - Y coordinate for drawing on the map
   * @param {string} type     - "location" or "intersection"
   */
  addNode(id, label, x, y, type = "location") {
    this.nodes.set(id, { id, label, x, y, type });
    // Ensure every node has an adjacency entry, even before any edges are added.
    if (!this.adjacency.has(id)) {
      this.adjacency.set(id, []);
    }
  }

  /**
   * Add an undirected edge between two nodes.
   * Weight = distance in meters (used by Dijkstra to pick the shortest route).
   * We store the edge in BOTH directions because walking works both ways.
   */
  addEdge(from, to, weight, id = null) {
    const edgeId = id ?? `${from}-${to}`;
    this.adjacency.get(from)?.push({ to, weight, id: edgeId });
    this.adjacency.get(to)?.push({ to: from, weight, id: edgeId });
  }

  /** Look up a single node by id. */
  getNode(id) {
    return this.nodes.get(id);
  }

  /** Return all neighbors of a node — used when Dijkstra "relaxes" edges. */
  getNeighbors(id) {
    return this.adjacency.get(id) ?? [];
  }

  /** List every node id in the graph (needed to initialize distance table). */
  getAllNodeIds() {
    return [...this.nodes.keys()];
  }

  /** Only named places (no intersections) — used to fill the From/To dropdowns. */
  getLocationNodes() {
    return [...this.nodes.values()].filter((n) => n.type === "location");
  }
}
