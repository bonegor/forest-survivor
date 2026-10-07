// Keyboard, mouse, touch and gamepad input folded into a few named actions.

import { view } from './view.js';

const BIND = {
  up: { keys: ['KeyW', 'ArrowUp'], pad: [12] },
  down: { keys: ['KeyS', 'ArrowDown'], pad: [13] },
  left: { keys: ['KeyA', 'ArrowLeft'], pad: [14] },
  right: { keys: ['KeyD', 'ArrowRight'], pad: [15] },
  confirm: { keys: ['Enter', 'NumpadEnter', 'Space'], pad: [0] },
  back: { keys: ['Escape', 'Backspace'], pad: [1] },
  pause: { keys: ['Escape', 'KeyP'], pad: [9] },
  ult: { keys: ['Space', 'KeyE', 'KeyQ'], pad: [2, 7, 6] },
  map: { keys: ['Tab', 'KeyM'], pad: [8] },
  reroll: { keys: ['KeyR'], pad: [3] },
  one: { keys: ['Digit1', 'Numpad1'], pad: [] },
  two: { keys: ['Digit2', 'Numpad2'], pad: [] },
  three: { keys: ['Digit3', 'Numpad3'], pad: [] },
  four: { keys: ['Digit4', 'Numpad4'], pad: [] },
  fps: { keys: ['F3'], pad: [] },
  fullscreen: { keys: ['F11', 'KeyF'], pad: [] },
};
const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Backspace', 'F3']);

export const input = {
  held: new Set(),
  justDown: new Set(),
  virtual: new Set(), // actions triggered by touch buttons this frame
  mouse: { x: -1, y: -1, down: false, clicked: false, rclicked: false, moved: false, wheel: 0 },
  stick: { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0, vx: 0, vy: 0 },
  joystickEnabled: false,
  touchRegions: null, // (x, y) => action | null, set by the active screen
  device: 'kb',
  pad: { index: -1, buttons: [], prev: [], ax: 0, ay: 0, navPrev: 0 },
  anyKey: false,
  typed: [],

  down(action) {
    const b = BIND[action];
    if (!b) return false;
    for (const k of b.keys) if (this.held.has(k)) return true;
    for (const i of b.pad) if (this.pad.buttons[i]) return true;
    return false;
  },

  pressed(action) {
    if (this.virtual.has(action)) return true;
    const b = BIND[action];
    if (!b) return false;
    for (const k of b.keys) if (this.justDown.has(k)) return true;
    for (const i of b.pad) if (this.pad.buttons[i] && !this.pad.prev[i]) return true;
    if (this.pad.nav === action) return true;
    return false;
  },

  bot: null, // { x, y } override used by automated play-tests

  // Movement vector (length <= 1).
  axis() {
    if (this.bot) return this.bot;
    let x = 0, y = 0;
    if (this.down('left')) x -= 1;
    if (this.down('right')) x += 1;
    if (this.down('up')) y -= 1;
    if (this.down('down')) y += 1;
    if (x || y) {
      const l = Math.hypot(x, y);
      return { x: x / l, y: y / l };
    }
    const p = this.pad;
    const pl = Math.hypot(p.ax, p.ay);
    if (pl > 0.2) {
      const m = Math.min(1, (pl - 0.2) / 0.7);
      return { x: (p.ax / pl) * m, y: (p.ay / pl) * m };
    }
    const s = this.stick;
    if (s.active) {
      const dx = s.x - s.ox, dy = s.y - s.oy;
      const l = Math.hypot(dx, dy);
      const R = 18;
      if (l > 2) {
        const m = Math.min(1, l / R);
        return { x: (dx / l) * m, y: (dy / l) * m };
      }
    }
    return { x: 0, y: 0 };
  },

  update() {
    // Gamepad polling.
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const p of pads) if (p && p.connected) { gp = p; break; }
    const pad = this.pad;
    pad.prev = pad.buttons;
    pad.nav = null;
    if (gp) {
      pad.buttons = gp.buttons.map((b) => b.pressed || b.value > 0.5);
      pad.ax = gp.axes[0] || 0;
      pad.ay = gp.axes[1] || 0;
      if (pad.buttons.some((b, i) => b && !pad.prev[i]) || Math.hypot(pad.ax, pad.ay) > 0.5) this.device = 'pad';
      // Stick-to-dpad edge for menu navigation.
      let dir = 0;
      if (pad.ay < -0.6) dir = 1;
      else if (pad.ay > 0.6) dir = 2;
      else if (pad.ax < -0.6) dir = 3;
      else if (pad.ax > 0.6) dir = 4;
      if (dir && dir !== pad.navPrev) pad.nav = ['', 'up', 'down', 'left', 'right'][dir];
      pad.navPrev = dir;
    } else {
      pad.buttons = [];
      pad.ax = pad.ay = 0;
    }
    if (this.anyKey === false && pad.buttons.some((b, i) => b && !pad.prev[i])) this.anyKey = true;
  },

  endFrame() {
    this.justDown.clear();
    this.virtual.clear();
    this.mouse.clicked = false;
    this.mouse.rclicked = false;
    this.mouse.moved = false;
    this.mouse.wheel = 0;
    this.anyKey = false;
    this.typed.length = 0;
  },
};

function toUI(clientX, clientY) {
  const r = view.canvas.getBoundingClientRect();
  const sx = view.pxW / r.width;
  const sy = view.pxH / r.height;
  return { x: ((clientX - r.left) * sx) / view.S, y: ((clientY - r.top) * sy) / view.S };
}

export function initInput(canvas) {
  // Typing into a form field (the developer panel) is not game input.
  const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '');
  window.addEventListener('keydown', (e) => {
    if (typing(e)) return;
    if (PREVENT.has(e.code)) e.preventDefault();
    if (!e.repeat) {
      input.justDown.add(e.code);
      input.anyKey = true;
    }
    input.held.add(e.code);
    input.device = 'kb';
    if (e.key && e.key.length === 1) input.typed.push(e.key);
  });
  window.addEventListener('keyup', (e) => input.held.delete(e.code));
  window.addEventListener('blur', () => input.held.clear());

  canvas.addEventListener('mousemove', (e) => {
    const p = toUI(e.clientX, e.clientY);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
    input.mouse.moved = true;
    input.device = 'mouse';
  });
  canvas.addEventListener('mousedown', (e) => {
    canvas.focus();
    const p = toUI(e.clientX, e.clientY);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
    if (e.button === 0) input.mouse.down = true;
    input.device = 'mouse';
    input.anyKey = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0 && input.mouse.down) {
      input.mouse.down = false;
      input.mouse.clicked = true;
    }
    if (e.button === 2) input.mouse.rclicked = true;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => { input.mouse.wheel += Math.sign(e.deltaY); }, { passive: true });

  // Touch: buttons registered by the active screen fire instantly; any other
  // touch either drives the virtual joystick (in game) or acts as a click.
  const taps = new Map();
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    input.device = 'touch';
    input.anyKey = true;
    for (const t of e.changedTouches) {
      const p = toUI(t.clientX, t.clientY);
      const action = input.touchRegions ? input.touchRegions(p.x, p.y) : null;
      if (action) { input.virtual.add(action); continue; }
      if (input.joystickEnabled && !input.stick.active) {
        Object.assign(input.stick, { active: true, id: t.identifier, ox: p.x, oy: p.y, x: p.x, y: p.y });
      } else {
        taps.set(t.identifier, { x: p.x, y: p.y, t: performance.now() });
        input.mouse.x = p.x;
        input.mouse.y = p.y;
        input.mouse.down = true;
      }
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const p = toUI(t.clientX, t.clientY);
      if (input.stick.active && t.identifier === input.stick.id) {
        input.stick.x = p.x;
        input.stick.y = p.y;
        // Drag the anchor along so the stick never feels "stuck".
        const dx = p.x - input.stick.ox, dy = p.y - input.stick.oy, l = Math.hypot(dx, dy), R = 26;
        if (l > R) {
          input.stick.ox = p.x - (dx / l) * R;
          input.stick.oy = p.y - (dy / l) * R;
        }
      } else if (taps.has(t.identifier)) {
        input.mouse.x = p.x;
        input.mouse.y = p.y;
      }
    }
  }, { passive: false });
  const end = (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (input.stick.active && t.identifier === input.stick.id) input.stick.active = false;
      const tap = taps.get(t.identifier);
      if (tap) {
        taps.delete(t.identifier);
        input.mouse.down = false;
        input.mouse.clicked = true;
      }
    }
  };
  canvas.addEventListener('touchend', end, { passive: false });
  canvas.addEventListener('touchcancel', end, { passive: false });
}
