import { Telegraph } from './effects.js';

const WARNING = '#e43b44';
const WARNING_EDGE = '#ff0044';

// Rasterize the combat polygon at the same one-world-pixel grid as the
// sprites. Sample each cell's centre so the warning follows the actual edge.
function rasterize(points) {
  const left = Math.floor(Math.min(...points.map(([x]) => x)));
  const right = Math.ceil(Math.max(...points.map(([x]) => x)));
  const top = Math.floor(Math.min(...points.map(([, y]) => y)));
  const bottom = Math.ceil(Math.max(...points.map(([, y]) => y)));
  const width = right - left;
  const height = bottom - top;
  const mask = new Uint8Array(width * height);
  const fill = [];
  const edge = [];

  for (let row = 0; row < height; row++) {
    const y = top + row + 0.5;
    const crossings = [];
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [ax, ay] = points[j];
      const [bx, by] = points[i];
      if ((ay > y) !== (by > y)) crossings.push(ax + (bx - ax) * (y - ay) / (by - ay));
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i < crossings.length; i += 2) {
      const start = Math.ceil(crossings[i] - 0.5);
      const end = Math.floor(crossings[i + 1] - 0.5) + 1;
      if (end <= start) continue;
      mask.fill(1, row * width + start - left, row * width + end - left);
      fill.push([start, top + row, end - start]);
    }
  }

  const filled = (x, y) => x >= 0 && x < width && y >= 0 && y < height && mask[y * width + x];
  for (let y = 0; y < height; y++) {
    let start = -1;
    for (let x = 0; x <= width; x++) {
      const boundary = filled(x, y) && (!filled(x - 1, y) || !filled(x + 1, y) ||
        !filled(x, y - 1) || !filled(x, y + 1));
      if (boundary && start < 0) start = x;
      if (!boundary && start >= 0) {
        edge.push([left + start, top + y, x - start]);
        start = -1;
      }
    }
  }
  return { fill, edge };
}

function paintRows(ctx, cam, rows, dx, dy, color, alpha) {
  const x = dx - cam.x;
  const y = dy - cam.y;
  const scale = cam.S;
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  for (const [left, top, width] of rows) {
    const x0 = Math.round((x + left) * scale);
    const y0 = Math.round((y + top) * scale);
    const x1 = Math.round((x + left + width) * scale);
    const y1 = Math.round((y + top + 1) * scale);
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  ctx.restore();
}

export class BoneKingSweepWarning extends Telegraph {
  constructor(g, { area, dur, follow, onDone, active }) {
    const x = follow?.x ?? 0;
    const y = follow?.y ?? 0;
    super(g, { x, y, dur, follow });
    this.originX = x;
    this.originY = y;
    this.startLife = follow?.life ?? 0;
    this.active = active;
    this.footprint = rasterize(area.map(([px, py]) => [px - x, py - y]));
    if (onDone) {
      this.o.onDone = () => {
        const dx = this.o.x - this.originX;
        const dy = this.o.y - this.originY;
        onDone(area.map(([px, py]) => [px + dx, py + dy]));
      };
    }
  }

  update(dt) {
    if (this.active && !this.active()) return false;
    // Enemy.update advanced life before creating us. Its clock starts the
    // warning now, so the effect's first update cannot spend that same tick.
    const elapsed = this.o.follow ? Math.max(0, this.o.follow.life - this.startLife - this.t) : dt;
    return super.update(elapsed);
  }

  drawGround(ctx, cam) {
    const progress = this.t / this.o.dur;
    paintRows(ctx, cam, this.footprint.fill, this.o.x, this.o.y, WARNING, 0.2 + 0.19 * progress);
  }

  drawThreat(ctx, cam) {
    const alpha = this.g.settings.softFlash ? 0.9 : 0.83 + 0.14 * Math.sin(this.t * 20);
    paintRows(ctx, cam, this.footprint.edge, this.o.x, this.o.y, WARNING_EDGE, alpha);
  }
}
