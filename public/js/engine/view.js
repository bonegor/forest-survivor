// The display canvas and the pixel scale.
//
// The art is authored in "world pixels". Each frame is drawn straight onto
// the full-resolution canvas with every art pixel blown up to S×S device
// pixels, so motion stays smooth while sprites stay crisp. W×H is the screen
// size measured in art pixels; HUD/menus are drawn into a W×H canvas and
// scaled up by S.

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
}
