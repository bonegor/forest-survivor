import { SPR } from '../engine/sprites.js';
import { drawText, textCanvas, textWidth } from '../engine/font.js';
import { fmtNum } from '../engine/util.js';
import { FILLERS, PASSIVES } from '../data/passives.js';
import { MAX_WEAPON_LEVEL } from '../data/weapons.js';
import { isCopper } from '../data/copper.js';

const CELL = 19, ROW = 20, BORDER = 4, HEADER = 11, GUTTER = 5;
const SHRINES = { fury:'i_might', haste:'i_cooldown', fortune:'i_greed', wisdom:'i_growth', protection:'i_armor' };
export const blessingTypes = Object.values(FILLERS).filter(def => def.count);

// Only persistent choices occupy build slots. A timed pickup occupies a slot
// while its effect lasts. Gold and healing have already been applied on receipt.
export function loadoutItems(g, held) {
  const p = g.player, weapons = [], powers = [];
  const main = g.caveStrike && g.mainWeapon();
  const weapon = (w, icon, rank, evolved) => ({
    icon, rank, evolved, ready: !held && !evolved && g.evoReady.includes(w),
    dormant: main && main !== w && !isCopper(w),
  });
  if (held) {
    for (const h of held.weapons) weapons.push(weapon(h.w, h.icon, Math.min(MAX_WEAPON_LEVEL, h.level + h.rankBonus), h.evolved));
  } else {
    for (const w of p.weapons) weapons.push(weapon(w, w.def.icon, w.effectiveRank(), w.evolved));
  }
  while (weapons.length < g.maxWeapons) weapons.push(null);
  for (const w of p.gearWeapons) weapons.push(weapon(w, w.def.icon, w.effectiveRank(), w.evolved));
  const relics = held ? held.relics : p.passives;
  for (const [id, rank] of relics) powers.push({ name:PASSIVES[id].name, icon:PASSIVES[id].icon, rank:p.effectivePassiveRank(id, rank) });
  for (const id of p.gearRanks.passives) {
    if (!(held ? held.relics.some(([key]) => key === id) : p.passives.has(id))) powers.push({ name:PASSIVES[id].name, icon:PASSIVES[id].icon, rank:1 });
  }
  for (const def of blessingTypes) {
    const rank = held ? held.blessings?.[def.count] : p[def.count];
    if (rank) powers.push({ name:def.name, icon:def.icon, rank, blessing:true });
  }
  if (g.skulls) powers.push({ name:'Cursed Skull', icon:'i_skull', rank:g.skulls });
  for (const [id, buff] of p.buffs) {
    const icon = SHRINES[id] || 'i_' + id;
    if (SPR[icon] && buff.t > 0) powers.push({ buff:id, icon, seconds:Math.ceil(buff.t), fraction:buff.t/buff.max });
  }
  return { weapons, powers };
}

// Leave the orb glass and its touch target clear. When those two corners leave
// too little room, wrap at the full width just above them instead.
export function loadoutLayout(W, H, touch, items, safe) {
  const width = W - safe.left - safe.right;
  const aboveOrbs = width < 228;
  const room = Math.max(CELL + 2 * BORDER, width - (aboveOrbs ? 8 : 112));
  const bottom = H - safe.bottom - (aboveOrbs ? 69 : touch ? 25 : 3);
  const groups = [];
  for (const [name, slots] of [['WEAPONS', items.weapons], ['POWERS', items.powers]]) {
    if (!slots.length) continue;
    const cols = Math.min(slots.length, Math.max(1, Math.floor((room - 2 * BORDER) / CELL)));
    const w = Math.max(cols * CELL, textWidth(name) + 7) + 2 * BORDER;
    const h = HEADER + Math.ceil(slots.length / cols) * ROW + 3;
    groups.push({ name, slots, cols, w, h });
  }
  const joined = groups.reduce((n, group) => n + group.w, 0) + GUTTER * Math.max(0, groups.length - 1);
  const beside = joined <= room;
  const w = beside ? joined : Math.max(...groups.map(group => group.w));
  const h = beside ? Math.max(0, ...groups.map(group => group.h)) : groups.reduce((n, group) => n + group.h, -2) + groups.length * 2;
  const x = safe.left + Math.floor((width - w) / 2), y = bottom - h;
  let nextX = x, nextY = y;
  for (const group of groups) {
    group.x = beside ? nextX : safe.left + Math.floor((width - group.w) / 2);
    group.y = beside ? bottom - group.h : nextY;
    nextX += group.w + GUTTER; nextY += group.h + 2;
  }
  return { x, y, w, h, groups };
}

function plate(ctx, { x, y, w, h, name }) {
  // Stepped end caps, a cast bronze rim and inset black iron.
  ctx.fillStyle = '#171217';
  ctx.fillRect(x + 2, y, w - 4, h); ctx.fillRect(x, y + 2, w, h - 4);
  ctx.fillStyle = '#8c765c'; ctx.fillRect(x + 3, y + 1, w - 6, 1);
  ctx.fillStyle = '#524338'; ctx.fillRect(x + 1, y + 3, 2, h - 6);
  ctx.fillStyle = '#30292a'; ctx.fillRect(x + w - 3, y + 3, 2, h - 6);
  ctx.fillStyle = '#625044'; ctx.fillRect(x + 3, y + h - 2, w - 6, 1);
  ctx.fillStyle = '#29252a'; ctx.fillRect(x + 3, y + 2, w - 6, h - 5);
  ctx.fillStyle = '#ad8c5e';
  ctx.fillRect(x + 3, y + 4, 2, 2); ctx.fillRect(x + w - 5, y + 4, 2, 2);
  drawText(ctx, name, x + Math.floor(w / 2), y + 2, { align:'center', color:'#c5ad88', outline:null });
}

function cell(ctx, x, y, item, power, t) {
  const w = 18;
  const metal = item?.evolved ? '#efb657' : power ? '#667777' : '#88745a';
  ctx.fillStyle = '#100f14'; ctx.fillRect(x, y, w, w);
  ctx.fillStyle = metal; ctx.fillRect(x, y, w - 1, 1); ctx.fillRect(x, y + 1, 1, w - 2);
  ctx.fillStyle = '#38333a'; ctx.fillRect(x + 1, y + 1, w - 2, w - 2);
  ctx.fillStyle = '#211e25'; ctx.fillRect(x + 2, y + 2, w - 3, w - 3);
  if (!item) return;
  if (item.dormant) ctx.globalAlpha = .4;
  ctx.drawImage(SPR[item.icon].frames[0].c, x + 1, y + 1, 16, 16);
  const timed = item.seconds != null;
  const label = item.evolved ? 'E' : String(timed ? item.seconds : fmtNum(item.rank));
  const color = timed ? '#97dcde' : item.blessing ? '#d7b7ed' : item.evolved || item.rank === MAX_WEAPON_LEVEL ? '#ffd286' : '#f2e5c9';
  const number = textCanvas(label, color, '#171417');
  const tw = Math.min(16, number.width);
  ctx.drawImage(number, x + 18 - tw, y + 18 - number.height, tw, number.height);
  ctx.globalAlpha = 1;
  if (timed) {
    ctx.fillStyle = '#6caeac'; ctx.fillRect(x + 1, y + 17, Math.ceil(16 * Math.min(1, item.fraction)), 1);
  } else if (item.ready) {
    ctx.fillStyle = Math.sin(t * 8) > 0 ? '#ffdf92' : '#d68738';
    ctx.fillRect(x, y, 18, 2); ctx.fillRect(x, y + 2, 2, 3); ctx.fillRect(x + 16, y + 2, 2, 3);
  }
}

export function drawLoadout(ctx, layout, t) {
  for (const group of layout.groups) {
    plate(ctx,group);
    const left = group.x + Math.floor((group.w - group.cols * CELL) / 2);
    for (let i = 0; i < group.slots.length; i++) {
      cell(ctx, left + i % group.cols * CELL, group.y + HEADER + Math.floor(i / group.cols) * ROW, group.slots[i], group.name === 'POWERS', t);
    }
  }
}
