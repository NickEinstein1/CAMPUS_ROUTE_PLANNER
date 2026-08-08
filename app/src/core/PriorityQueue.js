/**
 * Binary min-heap priority queue.
 *
 * Dijkstra repeatedly asks "which unvisited node is closest?". Scanning every
 * node to answer that costs O(V) each time; a heap keeps the smallest element
 * at the root, so the same answer costs O(log V).
 *
 * The single invariant: every parent's priority is <= both of its children's.
 *
 * Ported unchanged from the original project — the algorithm layer does not
 * care that the map is now real.
 */
export default class PriorityQueue {
  constructor() {
    /** @type {Array<{ value: string, priority: number }>} */
    this.heap = []
  }

  get size() {
    return this.heap.length
  }

  isEmpty() {
    return this.heap.length === 0
  }

  enqueue(value, priority) {
    this.heap.push({ value, priority })
    this.#bubbleUp(this.heap.length - 1)
  }

  dequeue() {
    if (this.isEmpty()) return null
    const min = this.heap[0]
    const last = this.heap.pop()
    if (this.heap.length > 0) {
      this.heap[0] = last
      this.#bubbleDown(0)
    }
    return min
  }

  #bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2)
      if (this.heap[parent].priority <= this.heap[index].priority) break
      ;[this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]]
      index = parent
    }
  }

  #bubbleDown(index) {
    const length = this.heap.length
    for (;;) {
      let smallest = index
      const left = 2 * index + 1
      const right = 2 * index + 2

      if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left
      }
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right
      }
      if (smallest === index) break
      ;[this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]]
      index = smallest
    }
  }
}
