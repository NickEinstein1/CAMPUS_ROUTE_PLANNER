/**
 * UI controller — renders map, handles clicks, displays route results.
 * Team member: UI
 */

const graph = buildCampusGraph();
const locations = graph.getLocationNodes();

const fromSelect = document.getElementById("from-select");
const toSelect = document.getElementById("to-select");
const closureSelect = document.getElementById("closure-select");
const findRouteBtn = document.getElementById("find-route-btn");
const edgesLayer = document.getElementById("edges-layer");
const routeLayer = document.getElementById("route-layer");
const nodesLayer = document.getElementById("nodes-layer");
const resultsPanel = document.getElementById("results");
const distanceValue = document.getElementById("distance-value");
const walkValue = document.getElementById("walk-value");
const consoleOutput = document.getElementById("console-output");

let clickStep = 0; // 0 = next click sets from, 1 = sets to
let activeRouteEdges = new Set();

function populateSelects() {
  for (const loc of locations) {
    fromSelect.append(new Option(loc.label, loc.id));
    toSelect.append(new Option(loc.label, loc.id));
  }
  fromSelect.value = "dorm_c";
  toSelect.value = "gym";

  for (const preset of CLOSURE_PRESETS) {
    closureSelect.append(new Option(preset.label, preset.id));
  }
}

function renderMap() {
  const closedEdges = getClosedEdges(closureSelect.value);
  const edges = getUniqueEdges(graph);

  edgesLayer.innerHTML = "";
  for (const edge of edges) {
    const from = graph.getNode(edge.from);
    const to = graph.getNode(edge.to);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y);
    line.setAttribute("x2", to.x);
    line.setAttribute("y2", to.y);
    line.classList.add("edge");
    line.dataset.edgeId = edge.id;
    if (closedEdges.has(edge.id)) line.classList.add("closed");
    edgesLayer.appendChild(line);
  }

  nodesLayer.innerHTML = "";
  for (const node of graph.nodes.values()) {
    if (node.type === "intersection") {
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", node.x);
      dot.setAttribute("cy", node.y);
      dot.setAttribute("r", 6);
      dot.classList.add("node-intersection");
      nodesLayer.appendChild(dot);
    } else {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", node.x);
      circle.setAttribute("cy", node.y);
      circle.setAttribute("r", 22);
      circle.classList.add("node-location");
      circle.dataset.nodeId = node.id;
      circle.addEventListener("click", () => onNodeClick(node.id));
      nodesLayer.appendChild(circle);

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", node.x);
      label.setAttribute("y", node.y - 30);
      label.classList.add("node-label");
      label.textContent = node.label;
      nodesLayer.appendChild(label);
    }
  }

  updateNodeSelectionStyles();
}

function updateNodeSelectionStyles() {
  document.querySelectorAll(".node-location").forEach((el) => {
    el.classList.remove("selected-from", "selected-to");
    if (el.dataset.nodeId === fromSelect.value) el.classList.add("selected-from");
    if (el.dataset.nodeId === toSelect.value) el.classList.add("selected-to");
  });
}

function highlightRoute(edgeIds) {
  activeRouteEdges = new Set(edgeIds);
  routeLayer.innerHTML = "";

  for (const edgeId of edgeIds) {
    const edgeEl = edgesLayer.querySelector(`[data-edge-id="${edgeId}"]`);
    if (!edgeEl) continue;

    const routeLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    routeLine.setAttribute("x1", edgeEl.getAttribute("x1"));
    routeLine.setAttribute("y1", edgeEl.getAttribute("y1"));
    routeLine.setAttribute("x2", edgeEl.getAttribute("x2"));
    routeLine.setAttribute("y2", edgeEl.getAttribute("y2"));
    routeLine.classList.add("edge", "route");
    routeLayer.appendChild(routeLine);
  }

  edgesLayer.querySelectorAll(".edge").forEach((el) => {
    el.classList.toggle("route", activeRouteEdges.has(el.dataset.edgeId));
  });
}

function clearRouteHighlight() {
  activeRouteEdges = new Set();
  routeLayer.innerHTML = "";
  edgesLayer.querySelectorAll(".edge.route").forEach((el) => el.classList.remove("route"));
}

function onNodeClick(nodeId) {
  if (clickStep === 0) {
    fromSelect.value = nodeId;
    clickStep = 1;
  } else {
    toSelect.value = nodeId;
    clickStep = 0;
  }
  updateNodeSelectionStyles();
}

function findRoute() {
  const start = fromSelect.value;
  const end = toSelect.value;
  const closedEdges = getClosedEdges(closureSelect.value);
  const startLabel = graph.getNode(start).label;
  const endLabel = graph.getNode(end).label;

  clearRouteHighlight();

  const result = dijkstra(graph, start, end, closedEdges);

  if (!result) {
    resultsPanel.hidden = true;
    consoleOutput.innerHTML =
      `<span class="error-text">FINDING THE SHORTEST PATH FROM ${startLabel.toUpperCase()} TO ${endLabel.toUpperCase()} USING DIJKSTRA'S ALGORITHM</span>\n\n` +
      `No route found.\n` +
      (closedEdges.size > 0 ? "Try removing road closures or pick different locations." : "Locations may be disconnected.");
    return;
  }

  highlightRoute(result.edges);

  const minutes = estimateWalkMinutes(result.distance);
  const pathDesc = formatPathDescription(graph, result.path);

  resultsPanel.hidden = false;
  distanceValue.textContent = `${result.distance} m`;
  walkValue.textContent = `${minutes} min`;

  consoleOutput.innerHTML =
    `<span class="success-text">FINDING THE SHORTEST PATH FROM ${startLabel.toUpperCase()} TO ${endLabel.toUpperCase()} USING DIJKSTRA'S ALGORITHM</span>\n\n` +
    `Route: ${pathDesc}\n` +
    `Distance: ${result.distance} m\n` +
    `Estimated walk: ${minutes} min\n` +
    `Algorithm: Dijkstra with min-heap priority queue` +
    (closedEdges.size > 0 ? `\n\nNote: ${closedEdges.size} edge(s) closed for this simulation.` : "");
}

fromSelect.addEventListener("change", updateNodeSelectionStyles);
toSelect.addEventListener("change", updateNodeSelectionStyles);
closureSelect.addEventListener("change", () => {
  renderMap();
  clearRouteHighlight();
  resultsPanel.hidden = true;
  consoleOutput.textContent = "Road closures updated. Click Find route to recalculate.";
});
findRouteBtn.addEventListener("click", findRoute);

populateSelects();
renderMap();
findRoute();
