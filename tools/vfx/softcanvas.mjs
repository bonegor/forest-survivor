// A small 2D canvas in software, for Node: enough of the browser's for the game's effects to draw
// themselves for real in tools/vfx/compare.mjs (28 October 2026), where tools/headless.mjs's
// canvases draw nothing. Image data in and out; drawImage (nearest neighbour, as the game draws
// with smoothing off, any affine transform); fillRect in a colour or a radial or linear gradient;
// stroked polylines (round ends, edges softened as a browser's); globalAlpha and the composite
// operations the game uses ('source-over', 'lighter', 'multiply', 'destination-out'); save,
// restore, translate, rotate, scale. Pixels are kept premultiplied, in floats.
//   import { installSoftCanvas, SoftCanvas } from './softcanvas.mjs';
//   installSoftCanvas();   // document.createElement('canvas') makes these from now on

export class SoftCanvas {
  constructor(w = 300, h = 150) {
    this._w = Math.max(1, w | 0);
    this._h = Math.max(1, h | 0);
    this.px = new Float32Array(this._w * this._h * 4);
    this.ctx = null;
  }
  get width() { return this._w; }
  set width(v) { this._w = Math.max(1, v | 0); this.px = new Float32Array(this._w * this._h * 4); }
  get height() { return this._h; }
  set height(v) { this._h = Math.max(1, v | 0); this.px = new Float32Array(this._w * this._h * 4); }
  getContext() { return (this.ctx ??= new Soft2D(this)); }
  // Its pixels as a packed RGBA buffer ({ w, h, d }, as the engine's), unpremultiplied.
  toBuf() {
    const { _w: w, _h: h, px } = this, d = new Uint32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const a = px[i * 4 + 3];
      if (a <= 0) continue;
      const c = (k) => Math.max(0, Math.min(255, Math.round((px[i * 4 + k] / a) * 255)));
      d[i] = ((Math.round(Math.min(1, a) * 255) << 24) | (c(2) << 16) | (c(1) << 8) | c(0)) >>> 0;
    }
    return { w, h, d };
  }
}

export function installSoftCanvas() {
  globalThis.document = { createElement: () => new SoftCanvas() };
}

// A CSS colour as [r, g, b, a] in 0..1 (hex of 3, 6 or 8 digits, rgb(), rgba()).
const parsed = new Map();
export function parseColor(s) {
  let c = parsed.get(s);
  if (c) return c;
  if (s[0] === '#') {
    let h = s.slice(1);
    if (h.length === 3) h = [...h].map((x) => x + x).join('');
    const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
    c = [n(0), n(2), n(4), h.length >= 8 ? n(6) : 1];
  } else {
    const m = /rgba?\(([^)]*)\)/.exec(s);
    if (!m) throw new Error(`softcanvas: colour "${s}"`);
    const v = m[1].split(',').map((x) => parseFloat(x));
    c = [v[0] / 255, v[1] / 255, v[2] / 255, v.length > 3 ? v[3] : 1];
  }
  parsed.set(s, c);
  return c;
}

class Gradient {
  constructor(kind, p) {
    this.kind = kind;
    this.p = p;
    this.stops = [];
  }
  addColorStop(t, color) {
    this.stops.push([t, parseColor(color)]);
    this.stops.sort((a, b) => a[0] - b[0]);
  }
  // The colour at user-space point (x, y), unpremultiplied.
  at(x, y) {
    const p = this.p;
    let t;
    if (this.kind === 'radial') t = (Math.hypot(x - p[3], y - p[4]) - p[2]) / Math.max(1e-6, p[5] - p[2]);
    else {
      const dx = p[2] - p[0], dy = p[3] - p[1];
      t = ((x - p[0]) * dx + (y - p[1]) * dy) / Math.max(1e-9, dx * dx + dy * dy);
    }
    const s = this.stops;
    if (!s.length) return [0, 0, 0, 0];
    if (t <= s[0][0]) return s[0][1];
    for (let i = 1; i < s.length; i++) {
      if (t <= s[i][0]) {
        const [t0, a] = s[i - 1], [t1, b] = s[i], k = (t - t0) / Math.max(1e-9, t1 - t0);
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k];
      }
    }
    return s[s.length - 1][1];
  }
}

class Soft2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.globalAlpha = 1;
    this.globalCompositeOperation = 'source-over';
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.lineWidth = 1;
    this.lineCap = 'butt';
    this.lineJoin = 'miter';
    this.imageSmoothingEnabled = false;
    this.font = '';
    this.textAlign = 'left';
    this.textBaseline = 'alphabetic';
    this.m = [1, 0, 0, 1, 0, 0];
    this.stack = [];
    this.path = [];
  }

  save() {
    this.stack.push({ a: this.globalAlpha, op: this.globalCompositeOperation, f: this.fillStyle, s: this.strokeStyle, lw: this.lineWidth, m: [...this.m] });
  }
  restore() {
    const s = this.stack.pop();
    if (!s) return;
    Object.assign(this, { globalAlpha: s.a, globalCompositeOperation: s.op, fillStyle: s.f, strokeStyle: s.s, lineWidth: s.lw, m: s.m });
  }
  setTransform(a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) { this.m = [a, b, c, d, e, f]; }
  resetTransform() { this.m = [1, 0, 0, 1, 0, 0]; }
  transform(a, b, c, d, e, f) {
    const m = this.m;
    this.m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]];
  }
  translate(x, y) { this.transform(1, 0, 0, 1, x, y); }
  scale(x, y) { this.transform(x, 0, 0, y, 0, 0); }
  rotate(a) { this.transform(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0); }

  // user -> device, and back.
  dev(x, y) { const m = this.m; return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
  inv() {
    const [a, b, c, d, e, f] = this.m, det = a * d - b * c;
    return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
  }
  // The device pixels a user-space box covers, clipped to the canvas.
  box(x0, y0, x1, y1, pad = 0) {
    const pts = [this.dev(x0, y0), this.dev(x1, y0), this.dev(x0, y1), this.dev(x1, y1)];
    const W = this.canvas.width, H = this.canvas.height;
    return [
      Math.max(0, Math.floor(Math.min(...pts.map((p) => p[0])) - pad)), Math.max(0, Math.floor(Math.min(...pts.map((p) => p[1])) - pad)),
      Math.min(W, Math.ceil(Math.max(...pts.map((p) => p[0])) + pad)), Math.min(H, Math.ceil(Math.max(...pts.map((p) => p[1])) + pad)),
    ];
  }

  // One source pixel (premultiplied r, g, b, a) onto device pixel i, under the composite.
  put(i, r, g, b, a) {
    const d = this.canvas.px, op = this.globalCompositeOperation;
    if (op === 'lighter') {
      d[i] = Math.min(1, d[i] + r); d[i + 1] = Math.min(1, d[i + 1] + g); d[i + 2] = Math.min(1, d[i + 2] + b); d[i + 3] = Math.min(1, d[i + 3] + a);
    } else if (op === 'multiply') {
      const da = d[i + 3];
      for (let k = 0; k < 3; k++) {
        const s = [r, g, b][k];
        d[i + k] = s * (1 - da) + d[i + k] * (1 - a) + s * d[i + k];
      }
      d[i + 3] = a + da - a * da;
    } else if (op === 'destination-out') {
      for (let k = 0; k < 4; k++) d[i + k] *= 1 - a;
    } else {
      const k = 1 - a;
      d[i] = r + d[i] * k; d[i + 1] = g + d[i + 1] * k; d[i + 2] = b + d[i + 2] * k; d[i + 3] = a + d[i + 3] * k;
    }
  }
  // An unpremultiplied colour at coverage `cov`, under the global alpha.
  putColor(i, c, cov = 1) {
    const a = c[3] * this.globalAlpha * cov;
    if (a <= 0) return;
    this.put(i, c[0] * a, c[1] * a, c[2] * a, a);
  }
  styleAt(style, ux, uy) {
    return typeof style === 'string' ? parseColor(style) : style.at(ux, uy);
  }

  createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; }
  getImageData(x, y, w, h) {
    const img = this.createImageData(w, h), W = this.canvas.width, H = this.canvas.height, p = this.canvas.px;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const sx = x + i, sy = y + j;
        if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
        const s = (sy * W + sx) * 4, o = (j * w + i) * 4, a = p[s + 3];
        if (a <= 0) continue;
        img.data[o] = (p[s] / a) * 255; img.data[o + 1] = (p[s + 1] / a) * 255; img.data[o + 2] = (p[s + 2] / a) * 255; img.data[o + 3] = a * 255;
      }
    }
    return img;
  }
  putImageData(img, x, y) {
    const W = this.canvas.width, H = this.canvas.height, p = this.canvas.px;
    for (let j = 0; j < img.height; j++) {
      for (let i = 0; i < img.width; i++) {
        const dx = x + i, dy = y + j;
        if (dx < 0 || dy < 0 || dx >= W || dy >= H) continue;
        const s = (j * img.width + i) * 4, o = (dy * W + dx) * 4, a = img.data[s + 3] / 255;
        p[o] = (img.data[s] / 255) * a; p[o + 1] = (img.data[s + 1] / 255) * a; p[o + 2] = (img.data[s + 2] / 255) * a; p[o + 3] = a;
      }
    }
  }

  createRadialGradient(x0, y0, r0, x1, y1, r1) { return new Gradient('radial', [x0, y0, r0, x1, y1, r1]); }
  createLinearGradient(x0, y0, x1, y1) { return new Gradient('linear', [x0, y0, x1, y1]); }
  createPattern() { return null; }
  measureText() { return { width: 0 }; }
  fillText() {}
  strokeText() {}
  clearRect(x, y, w, h) {
    const op = this.globalCompositeOperation, ga = this.globalAlpha;
    this.globalCompositeOperation = 'destination-out';
    this.globalAlpha = 1;
    this.fillRectWith(x, y, w, h, [0, 0, 0, 1]);
    this.globalCompositeOperation = op;
    this.globalAlpha = ga;
  }

  fillRect(x, y, w, h) { this.fillRectWith(x, y, w, h, null); }
  fillRectWith(x, y, w, h, solid) {
    if (w < 0) (x += w), (w = -w);
    if (h < 0) (y += h), (h = -h);
    const [bx0, by0, bx1, by1] = this.box(x, y, x + w, y + h), iv = this.inv(), W = this.canvas.width;
    const style = solid || this.fillStyle;
    for (let py = by0; py < by1; py++) {
      for (let px = bx0; px < bx1; px++) {
        const cx = px + 0.5, cy = py + 0.5, ux = iv[0] * cx + iv[2] * cy + iv[4], uy = iv[1] * cx + iv[3] * cy + iv[5];
        if (ux < x || uy < y || ux >= x + w || uy >= y + h) continue;
        this.putColor((py * W + px) * 4, Array.isArray(style) ? style : this.styleAt(style, ux, uy));
      }
    }
  }

  drawImage(img, ...a) {
    let sx = 0, sy = 0, sw = img.width, sh = img.height, dx, dy, dw, dh;
    if (a.length === 2) [dx, dy] = a, (dw = sw), (dh = sh);
    else if (a.length === 4) [dx, dy, dw, dh] = a;
    else [sx, sy, sw, sh, dx, dy, dw, dh] = a;
    if (!(dw && dh)) return;
    const src = img.px, SW = img.width, SH = img.height;
    if (!src) return; // not one of ours (an Image): nothing to draw
    const [bx0, by0, bx1, by1] = this.box(dx, dy, dx + dw, dy + dh), iv = this.inv(), W = this.canvas.width, ga = this.globalAlpha;
    for (let py = by0; py < by1; py++) {
      for (let px = bx0; px < bx1; px++) {
        const cx = px + 0.5, cy = py + 0.5, ux = iv[0] * cx + iv[2] * cy + iv[4], uy = iv[1] * cx + iv[3] * cy + iv[5];
        const u = (ux - dx) / dw, v = (uy - dy) / dh;
        if (u < 0 || v < 0 || u >= 1 || v >= 1) continue;
        const ix = Math.floor(sx + u * sw), iy = Math.floor(sy + v * sh);
        if (ix < 0 || iy < 0 || ix >= SW || iy >= SH) continue;
        const s = (iy * SW + ix) * 4;
        if (src[s + 3] <= 0) continue;
        this.put((py * W + px) * 4, src[s] * ga, src[s + 1] * ga, src[s + 2] * ga, src[s + 3] * ga);
      }
    }
  }

  beginPath() { this.path = []; }
  moveTo(x, y) { this.path.push([this.dev(x, y)]); }
  lineTo(x, y) {
    if (!this.path.length) this.path.push([]);
    this.path[this.path.length - 1].push(this.dev(x, y));
  }
  closePath() {
    const p = this.path[this.path.length - 1];
    if (p && p.length) p.push(p[0]);
  }
  // The path's polylines, lineWidth wide (scaled with the transform), softened 1 px at the edge.
  stroke() {
    const segs = [];
    for (const p of this.path) for (let i = 0; i + 1 < p.length; i++) segs.push([p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]]);
    if (!segs.length) return;
    const m = this.m, hw = (this.lineWidth * Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]))) / 2;
    const W = this.canvas.width, H = this.canvas.height, iv = this.inv();
    const xs = segs.flatMap((s) => [s[0], s[2]]), ys = segs.flatMap((s) => [s[1], s[3]]);
    const x0 = Math.max(0, Math.floor(Math.min(...xs) - hw - 1)), x1 = Math.min(W, Math.ceil(Math.max(...xs) + hw + 1));
    const y0 = Math.max(0, Math.floor(Math.min(...ys) - hw - 1)), y1 = Math.min(H, Math.ceil(Math.max(...ys) + hw + 1));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const cx = px + 0.5, cy = py + 0.5;
        let dmin = Infinity;
        for (const [ax, ay, bx, by] of segs) {
          const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
          const t = l2 ? Math.max(0, Math.min(1, ((cx - ax) * vx + (cy - ay) * vy) / l2)) : 0;
          const d = Math.hypot(cx - ax - vx * t, cy - ay - vy * t);
          if (d < dmin) dmin = d;
        }
        const cov = Math.max(0, Math.min(1, hw + 0.5 - dmin));
        if (cov <= 0) continue;
        const ux = iv[0] * cx + iv[2] * cy + iv[4], uy = iv[1] * cx + iv[3] * cy + iv[5];
        this.putColor((py * W + px) * 4, this.styleAt(this.strokeStyle, ux, uy), cov);
      }
    }
  }
  fill() {
    // Even-odd fill of the path's polygons, by pixel centres.
    const polys = this.path.filter((p) => p.length > 2);
    if (!polys.length) return;
    const W = this.canvas.width, H = this.canvas.height, iv = this.inv();
    const xs = polys.flat().map((p) => p[0]), ys = polys.flat().map((p) => p[1]);
    for (let py = Math.max(0, Math.floor(Math.min(...ys))); py < Math.min(H, Math.ceil(Math.max(...ys))); py++) {
      for (let px = Math.max(0, Math.floor(Math.min(...xs))); px < Math.min(W, Math.ceil(Math.max(...xs))); px++) {
        const cx = px + 0.5, cy = py + 0.5;
        let inside = false;
        for (const p of polys) {
          for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
            const [xi, yi] = p[i], [xj, yj] = p[j];
            if (yi > cy !== yj > cy && cx < ((xj - xi) * (cy - yi)) / (yj - yi) + xi) inside = !inside;
          }
        }
        if (!inside) continue;
        const ux = iv[0] * cx + iv[2] * cy + iv[4], uy = iv[1] * cx + iv[3] * cy + iv[5];
        this.putColor((py * W + px) * 4, this.styleAt(this.fillStyle, ux, uy));
      }
    }
  }
  arc(x, y, r, a0, a1) {
    const n = Math.max(8, Math.ceil(r));
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      if (i === 0 && !this.path.length) this.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      else this.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
  }
  ellipse(x, y, rx, ry, rot, a0, a1) {
    const n = Math.max(8, Math.ceil(Math.max(rx, ry)));
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n, ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
      const px = x + ex * Math.cos(rot) - ey * Math.sin(rot), py = y + ex * Math.sin(rot) + ey * Math.cos(rot);
      if (i === 0 && !this.path.length) this.moveTo(px, py);
      else this.lineTo(px, py);
    }
  }
  rect(x, y, w, h) {
    this.moveTo(x, y);
    this.lineTo(x + w, y);
    this.lineTo(x + w, y + h);
    this.lineTo(x, y + h);
    this.closePath();
  }
  clip() {}
  setLineDash() {}
}
