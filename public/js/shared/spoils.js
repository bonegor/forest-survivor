import { MAX_LORDS, SLOTS, itemPrice, packGear, sameItem, sanitizeGear, sanitizeItem } from './items.js';

// Four hours of Ranked, with the same maximum crypt frequency as sanitizeRun.
export const MAX_SPOILS = MAX_LORDS * (4 * 60 * 60 / 45 + 1);
export const MAX_CLAIMS = 12;
const MAX_PACKED_LENGTH = MAX_SPOILS * 64;
const STATES = ['sold', 'worn', 'found'];

export const validRunId = (value) => typeof value === 'string' && /^[a-f0-9]{24}$/.test(value);

export function makeRunId() {
  const bytes = new Uint8Array(12);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function packSpoils(entries) {
  return entries.slice(0, MAX_SPOILS).map(({ item, state }) => {
    const slot = SLOTS.indexOf(item.slot);
    const tag = state === 'sealed' ? SLOTS.length * STATES.length + slot : slot * STATES.length + STATES.indexOf(state);
    return tag.toString(36) + packGear({ [item.slot]: item }).slice(slot);
  }).join('|');
}

export function unpackSpoils(raw, limit = MAX_SPOILS) {
  if (typeof raw !== 'string' || !raw.length || raw.length > MAX_PACKED_LENGTH) return [];
  const entries = [];
  for (const part of raw.split('|', Math.min(MAX_SPOILS, limit))) {
    if (part.length > 64 || !/^[0-9a-n][0-4]\./.test(part)) continue;
    const tag = parseInt(part[0], 36);
    const sealed = tag >= SLOTS.length * STATES.length;
    const slot = sealed ? tag - SLOTS.length * STATES.length : Math.floor(tag / STATES.length);
    const state = sealed ? 'sealed' : STATES[tag % STATES.length];
    const item = sanitizeGear('|'.repeat(slot) + part.slice(1))[SLOTS[slot]];
    if (item) entries.push({ item, state });
  }
  return entries;
}

// Collected objects are kept in the run in acquisition order. Replacements are sold by
// the normal gear flow, so only the exact object still in its slot remains equipped.
export function runSpoils(items, gear, sealed = false) {
  const entries = [];
  for (const raw of items) {
    const item = sanitizeItem(raw);
    if (item) entries.push({ item, state: sealed ? 'sealed' : gear[item.slot] === raw ? 'worn' : 'sold' });
  }
  return packSpoils(entries);
}

// A report carries these for presentation. They do not award gear or add sale proceeds.
export function settledSpoils(raw, found, gear, soldOnConflict = []) {
  return packSpoils(unpackSpoils(raw, found).filter(e => e.state !== 'sealed').map(({ item, state }) => ({
    item, state: state === 'worn' && !sameItem(gear?.[item.slot], item)
      ? soldOnConflict.some(sold => sameItem(sold, item)) ? 'sold' : 'found'
      : state,
  })));
}

export function partitionRunSpoils(raw, found) {
  const items = unpackSpoils(raw, found).filter(entry => entry.state === 'sealed');
  const excess = items.slice(MAX_CLAIMS);
  return {
    claims: packSpoils(items.slice(0, MAX_CLAIMS)),
    history: packSpoils(excess.map(({ item }) => ({ item, state: 'sold' }))),
    overflowGold: excess.reduce((n, { item }) => n + itemPrice(item), 0),
  };
}
