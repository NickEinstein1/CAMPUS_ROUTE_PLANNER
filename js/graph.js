/**
 * Graph module — adjacency-list representation of campus roads/paths.
 * Team member: Graph + Algorithms
 */

class Graph {
  constructor() {
    /** @type {Map<string, { id: string, label: string, x: number, y: number, type: string }>} */
    this.nodes = new Map();
    /** @type {Map<string, Array<{ to: string, weight: number, id: string }>>} */
    this.adjacency = new Map();
  }

  addNode(id, label, x, y, type = "location") {
    this.nodes.set(id, { id, label, x, y, type });
    if (!this.adjacency.has(id)) {
      this.adjacency.set(id, []);
    }
  }

  addEdge(from, to, weight, id = null) {
    const edgeId = id ?? `${from}-${to}`;
    this.adjacency.get(from)?.push({ to, weight, id: edgeId });
    this.adjacency.get(to)?.push({ to: from, weight, id: edgeId });
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  getNeighbors(id) {
    return this.adjacency.get(id) ?? [];
  }

  getAllNodeIds() {
    return [...this.nodes.keys()];
  }

  getLocationNodes() {
    return [...this.nodes.values()].filter((n) => n.type === "location");
  }
}
