/**
 * Min-heap priority queue used by Dijkstra's algorithm.
 *
 * Dijkstra always needs the unvisited node with the SMALLEST distance next.
 * A min-heap lets us get that node quickly (O(log n)) instead of scanning all nodes (O(n)).
 *
 * Team member: Graph + Algorithms
 */

class PriorityQueue {
  constructor() {
    // Stored as an array representing a complete binary tree:
    // parent at index i has children at 2i+1 and 2i+2.
    /** @type {Array<{ priority: number, value: string }>} */
    this.heap = [];
  }

  size() {
    return this.heap.length;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  /**
   * Insert a node with a given priority (its current best distance).
   * After inserting at the end, bubble up to restore the min-heap property.
   */
  enqueue(value, priority) {
    this.heap.push({ value, priority });
    this._bubbleUp(this.heap.length - 1);
  }

  /**
   * Remove and return the element with the smallest priority (minimum distance).
   * Move the last element to the root, then bubble down to restore the heap.
   */
  dequeue() {
    if (this.isEmpty()) return null;
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._bubbleDown(0);
    }
    return min;
  }

  /**
   * After insert: swap with parent while this node is smaller than its parent.
   * Stops when the min-heap property is satisfied (parent ≤ children).
   */
  _bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[parent].priority <= this.heap[index].priority) break;
      [this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]];
      index = parent;
    }
  }

  /**
   * After removing the root: swap with the smaller child until the node
   * is smaller than both children (min-heap property restored).
   */
  _bubbleDown(index) {
    const length = this.heap.length;
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      if (smallest === index) break;
      [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
      index = smallest;
    }
  }
}
