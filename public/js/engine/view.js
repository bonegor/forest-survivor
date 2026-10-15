// The display canvas and the pixel scale.
//
// The art is authored in "world pixels". Each frame is drawn straight onto
// the full-resolution canvas with every art pixel blown up to S×S device
// pixels, so motion stays smooth while sprites stay crisp. W×H is the screen
// size measured in art pixels; HUD/menus are drawn into a W×H canvas and
// scaled up by S. The world itself is drawn at S × zoom, so it shows more of
// the forest around the hero than the HUD scale alone would.

import { makeCanvas, ctx2d } from './util.js';

export const view = {
  canvas: null,
  ctx: null,
  ui: null, // low-res UI canvas (W×H)
  uctx: null,
  dpr: 1,
  pxW: 0,
  pxH: 0,
  S: 4,
  W: 480,
  H: 270,
  zoom: 0.8, // world scale relative to the HUD: 0.8 shows 25% more each way
  listeners: [],
};

const MAX_PIXELS = 2560 * 1600;

export function initView(canvas) {
  view.canvas = canvas;
  view.ctx = canvas.getContext('2d', { alpha: false });
  view.ui = makeCanvas(480, 270);
  view.uctx = ctx2d(view.ui);
  resize();
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
}

export function onResize(fn) {
  view.listeners.push(fn);
}

function resize() {
  const cssW = Math.max(1, window.innerWidth);
  const cssH = Math.max(1, window.innerHeight);
  let dpr = Math.min(window.devicePixelRatio || 1, 3);
  if (cssW * cssH * dpr * dpr > MAX_PIXELS) dpr = Math.sqrt(MAX_PIXELS / (cssW * cssH));
  const pxW = Math.round(cssW * dpr);
  const pxH = Math.round(cssH * dpr);
  view.dpr = dpr;
  view.pxW = pxW;
  view.pxH = pxH;
  view.canvas.width = pxW;
  view.canvas.height = pxH;
  // Aim for roughly 270-330 art pixels on the short side.
  view.S = Math.max(1, Math.round(Math.min(pxW, pxH) / 300));
  view.W = Math.ceil(pxW / view.S);
  view.H = Math.ceil(pxH / view.S);
  view.ui.width = view.W;
  view.ui.height = view.H;
  view.uctx.imageSmoothingEnabled = false;
  view.ctx.imageSmoothingEnabled = false;
  for (const fn of view.listeners) fn(view);
}

// Blit the UI canvas onto the display.
export function presentUI() {
  const { ctx, ui, S } = view;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(ui, 0, 0, ui.width * S, ui.height * S);
  for (const [img, x, y, w, h, { fill, stretch }] of overlays) {
    // A framed picture is as large as its box allows: whole multiples of its
    // own size, or scaled down smoothly when even 1:1 does not fit. A
    // stretched one (a figure standing in for a sprite) fills its box exactly.
    const bx = x * S, by = y * S, bw = w * S, bh = h * S;
    const k = Math.min(bw / img.naturalWidth, bh / img.naturalHeight);
    const s = stretch ? k : k >= 1 ? Math.floor(k) : k;
    const dw = stretch ? bw : Math.round(img.naturalWidth * s), dh = stretch ? bh : Math.round(img.naturalHeight * s);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(bx, by, bw, bh);
    }
    ctx.imageSmoothingEnabled = s !== Math.floor(s);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, Math.round(bx + (bw - dw) / 2), Math.round(by + (bh - dh) / 2), dw, dh);
  }
  overlays.length = 0;
  ctx.imageSmoothingEnabled = false;
}

// For screens with pictures that belong behind their UI (a figure by the
// campfire under the title menu): presents the backdrop drawn so far, with
// its pictures, and clears the UI canvas for the rest of the screen.
export function presentBackdrop() {
  presentUI();
  view.uctx.clearRect(0, 0, view.ui.width, view.ui.height);
}

// Pictures shown at their own resolution rather than on the W×H UI canvas:
// the UI queues one per frame with its box in UI pixels, presentUI paints it.
const overlays = [];
export function overlay(img, x, y, w, h, { fill = '#181425', stretch = false } = {}) {
  overlays.push([img, x, y, w, h, { fill, stretch }]);
}

// A picture from public/, or null until it has loaded.
const pictures = new Map();
export function picture(src) {
  let img = pictures.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    pictures.set(src, img);
  }
  return img.complete && img.naturalWidth ? img : null;
}
