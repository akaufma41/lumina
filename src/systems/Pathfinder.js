// A* pathfinding on a 2D tile grid.
// 4-directional movement only (matches character animations).

export class Pathfinder {
  constructor(grid, width, height) {
    // grid[y][x] = true if walkable, false if blocked
    this.grid = grid;
    this.w = width;
    this.h = height;
  }

  findPath(sx, sy, tx, ty) {
    // Clamp to grid bounds
    sx = Math.max(0, Math.min(this.w - 1, sx));
    sy = Math.max(0, Math.min(this.h - 1, sy));
    tx = Math.max(0, Math.min(this.w - 1, tx));
    ty = Math.max(0, Math.min(this.h - 1, ty));

    // Target must be walkable
    if (!this.grid[ty][tx]) return null;
    // Already there
    if (sx === tx && sy === ty) return [];

    const key = (x, y) => y * this.w + x;
    const open = new Map();   // key → node
    const closed = new Set(); // key

    const startKey = key(sx, sy);
    open.set(startKey, { x: sx, y: sy, g: 0, f: this._h(sx, sy, tx, ty), parent: null });

    const dirs = [
      { dx: 0, dy: -1 }, // up
      { dx: 1, dy: 0 },  // right
      { dx: 0, dy: 1 },  // down
      { dx: -1, dy: 0 }, // left
    ];

    while (open.size > 0) {
      // Find node with lowest f in open set
      let best = null;
      let bestF = Infinity;
      for (const node of open.values()) {
        if (node.f < bestF) { bestF = node.f; best = node; }
      }

      // Reached target
      if (best.x === tx && best.y === ty) {
        return this._tracePath(best);
      }

      const bk = key(best.x, best.y);
      open.delete(bk);
      closed.add(bk);

      for (const { dx, dy } of dirs) {
        const nx = best.x + dx;
        const ny = best.y + dy;

        if (nx < 0 || nx >= this.w || ny < 0 || ny >= this.h) continue;
        if (!this.grid[ny][nx]) continue;

        const nk = key(nx, ny);
        if (closed.has(nk)) continue;

        const g = best.g + 1;
        const existing = open.get(nk);

        if (!existing || g < existing.g) {
          open.set(nk, {
            x: nx, y: ny,
            g,
            f: g + this._h(nx, ny, tx, ty),
            parent: best,
          });
        }
      }

      // Safety: bail on very long searches
      if (closed.size > 3000) return null;
    }

    return null; // no path found
  }

  _h(x, y, tx, ty) {
    return Math.abs(x - tx) + Math.abs(y - ty); // Manhattan
  }

  _tracePath(node) {
    const path = [];
    let cur = node;
    while (cur.parent) {
      path.push({ x: cur.x, y: cur.y });
      cur = cur.parent;
    }
    path.reverse();
    return path;
  }
}
