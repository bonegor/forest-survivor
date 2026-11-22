// The display canvas and the pixel scale.
//
// The art is authored in "world pixels". Each frame is drawn straight onto
// the full-resolution canvas with every art pixel blown up to S×S device
// pixels, so motion stays smooth while sprites stay crisp. W×H is the screen
// size measured in art pixels; HUD/menus are drawn into a W×H canvas and
// scaled up by S. The world itself is drawn at S × zoom (Game.syncCam), so it
// shows more of the forest around the hero than the HUD scale alone would.

import { makeCanvas, ctx2d } from './util.js';

// The world is drawn about WORLD_ZOOM times the HUD's scale: 0.8 shows 25% more each way.
const WORLD_ZOOM = 0.8;
// true: resize() rounds the world's scale to the nearest whole number of
// screen pixels per art pixel (at least 1), so every art pixel comes out the
// same size. At exactly 0.8 the world was 1.6, 2.4 or 3.2 screen pixels per
// art pixel on 720p, 768p/900p and 1080p screens, so neighbouring pixels were
// 1 and 2, 2 and 3 or 3 and 4 wide, and thin outlines and eyes changed width
// across a sprite. The cost is that each screen shows a little more or less
// of the field than 0.8 would. false goes back to exactly WORLD_ZOOM.
const PIXEL_WORLD = true;

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
  safe: { left: 0, right: 0, bottom: 0 },
  zoom: WORLD_ZOOM, // world scale relative to the HUD (rounded by resize() under PIXEL_WORLD)
  listeners: [],
};

// The canvas holds at most MAX_PIXELS, and at most MAX_RATIO canvas pixels per
// CSS pixel. A screen with more is drawn at a whole fraction of its own pixels
// (a half, a third...), which the browser blows up by that whole factor
// (image-rendering: pixelated in index.html), so every pixel stays the same
// size. Cutting the resolution by any other factor made the browser stretch
// the frame by 1.07-1.42 on 4K, Retina and 150% screens, so even the HUD's
// pixels came out uneven.
const MAX_PIXELS = 2560 * 1600;
const MAX_RATIO = 3;

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
  const ratio = window.devicePixelRatio || 1;
  const devW = Math.round(cssW * ratio);
  const devH = Math.round(cssH * ratio);
  // The smallest whole divisor that brings the screen's own pixels within both limits.
  const div = Math.max(1, Math.ceil(ratio / MAX_RATIO - 1e-9), Math.ceil(Math.sqrt((devW * devH) / MAX_PIXELS) - 1e-9));
  const pxW = Math.round(devW / div);
  const pxH = Math.round(devH / div);
  const dpr = ratio / div; // canvas pixels per CSS pixel
  view.dpr = dpr;
  view.pxW = pxW;
  view.pxH = pxH;
  view.canvas.width = pxW;
  view.canvas.height = pxH;
  // Aim for roughly 270-330 art pixels on the short side.
  view.S = Math.max(1, Math.round(Math.min(pxW, pxH) / 300));
  if (PIXEL_WORLD) view.zoom = Math.max(1, Math.round(view.S * WORLD_ZOOM)) / view.S;
  view.W = Math.ceil(pxW / view.S);
  view.H = Math.ceil(pxH / view.S);
  const style = window.getComputedStyle?.(view.canvas);
  for (const edge of Object.keys(view.safe)) {
    const inset = parseFloat(style?.getPropertyValue('--hud-' + edge)) || 0;
    view.safe[edge] = Math.ceil(inset * dpr / view.S);
  }
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
