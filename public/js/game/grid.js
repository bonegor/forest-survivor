// Uniform spatial grid (linked lists in typed arrays) centred on the player.
// Rebuilt every frame; anything outside the window is clamped to the border.

export class SpatialGrid {
  constructor(cell = 24, cols = 72, rows = 72) {
    this.cell = cell;
    this.cols = cols;
    this.rows = rows;
    this.head = new Int32Array(cols * rows);
    this.next = new Int32Array(2048);
    this.items = [];
    this.ox = 0;
    this.oy = 0;
  }

  rebuild(list, cx, cy) {
    this.items = list;
    if (this.next.length < list.length) this.next = new Int32Array(list.length * 2);
    this.head.fill(-1);
    this.ox = Math.floor(cx / this.cell) - (this.cols >> 1);
    this.oy = Math.floor(cy / this.cell) - (this.rows >> 1);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const c = this.index(e.x, e.y);
      e._cell = c;
      this.next[i] = this.head[c];
      this.head[c] = i;
    }
  }

  index(x, y) {
    let gx = Math.floor(x / this.cell) - this.ox;
    let gy = Math.floor(y / this.cell) - this.oy;
    gx = gx < 0 ? 0 : gx >= this.cols ? this.cols - 1 : gx;
    gy = gy < 0 ? 0 : gy >= this.rows ? this.rows - 1 : gy;
    return gy * this.cols + gx;
  }

  // Items in cells overlapping the circle (not exact). Pass `out` only from
  // loops that cannot recurse into another query (damage can kill, and a
  // death can explode and query again).
  query(x, y, r, out = []) {
    out.length = 0;
    const c = this.cell;
    let gx0 = Math.floor((x - r) / c) - this.ox, gx1 = Math.floor((x + r) / c) - this.ox;
    let gy0 = Math.floor((y - r) / c) - this.oy, gy1 = Math.floor((y + r) / c) - this.oy;
    if (gx1 < 0 || gy1 < 0 || gx0 >= this.cols || gy0 >= this.rows) return out;
    if (gx0 < 0) gx0 = 0;
    if (gy0 < 0) gy0 = 0;
    if (gx1 >= this.cols) gx1 = this.cols - 1;
    if (gy1 >= this.rows) gy1 = this.rows - 1;
    const { head, next, items } = this;
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        for (let i = head[gy * this.cols + gx]; i !== -1; i = next[i]) out.push(items[i]);
      }
    }
    return out;
  }
}
