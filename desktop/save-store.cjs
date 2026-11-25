'use strict';

// Main-process storage for the desktop edition. Renderer messages may name only
// these game keys; a key is never used as a filesystem path.
const fs = require('node:fs');
const path = require('node:path');

const ALLOWED_KEYS = Object.freeze([
  'fs_lprofile', 'fs_spoils', 'fs_settings', 'fs_seen',
  'fs_demo_profile', 'fs_demo_spoils', 'fs_demo_settings', 'fs_demo_seen',
]);
const KEY_SET = new Set(ALLOWED_KEYS);
const MAX_VALUE_BYTES = 256 * 1024;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

function checkKey(name) {
  if (typeof name !== 'string' || !KEY_SET.has(name)) throw new TypeError('Unknown save key');
}

function checkValue(value) {
  if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > MAX_VALUE_BYTES) {
    throw new TypeError('Save value must be a string of at most 256 KiB');
  }
}

function encode(values) {
  const bytes = Buffer.from(JSON.stringify({ version: 1, values }), 'utf8');
  if (bytes.length > MAX_FILE_BYTES) throw new RangeError('Save file is too large');
  return bytes;
}

function decode(bytes) {
  if (bytes.length > MAX_FILE_BYTES) throw new RangeError('Save file is too large');
  const data = JSON.parse(bytes.toString('utf8'));
  if (!data || data.version !== 1 || !data.values || typeof data.values !== 'object' || Array.isArray(data.values)) {
    throw new TypeError('Unsupported save format');
  }
  const values = Object.create(null);
  for (const [name, value] of Object.entries(data.values)) {
    checkKey(name);
    checkValue(value);
    values[name] = value;
  }
  return values;
}

function load(file) {
  let bytes;
  try {
    // Reject oversized files before reading them into memory.
    if (fs.statSync(file).size > MAX_FILE_BYTES) return { invalid: true };
    bytes = fs.readFileSync(file);
  } catch (error) {
    if (error.code === 'ENOENT') return { missing: true };
    throw error;
  }
  try {
    return { values: decode(bytes) };
  } catch {
    return { invalid: true };
  }
}

// Write and flush a sibling temporary file, then replace the destination. A
// failed replacement leaves the old destination intact and never changes the
// in-memory state. The app holds a single-instance lock around this store.
function atomicWrite(file, bytes) {
  const temporary = file + '.tmp';
  let handle;
  try {
    handle = fs.openSync(temporary, 'w', 0o600);
    fs.writeFileSync(handle, bytes);
    fs.fsyncSync(handle);
    fs.closeSync(handle);
    handle = undefined;
    fs.renameSync(temporary, file);
  } finally {
    if (handle !== undefined) fs.closeSync(handle);
    try { fs.unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

class SaveStore {
  constructor(directory) {
    if (typeof directory !== 'string' || !directory || !path.isAbsolute(directory)) {
      throw new TypeError('An absolute save directory is required');
    }
    this.directory = path.resolve(directory);
    this.file = path.join(this.directory, 'saves.json');
    this.backup = path.join(this.directory, 'saves.backup.json');
    this.recovered = false;
    this.values = Object.create(null);
    fs.mkdirSync(this.directory, { recursive: true });
    const main = load(this.file);
    if (main.values) {
      this.values = main.values;
      return;
    }
    const backup = load(this.backup);
    if (backup.values) {
      // Keep the damaged primary for diagnosis or manual recovery. Never put
      // damaged content into the known-good backup.
      if (main.invalid) fs.copyFileSync(this.file, path.join(this.directory, 'saves.corrupt.json'));
      atomicWrite(this.file, encode(backup.values));
      this.values = backup.values;
      this.recovered = true;
      return;
    }
    if (main.invalid || backup.invalid) {
      throw new Error('The saved progress and its backup could not be read. Existing files were preserved.');
    }
  }

  read(name) {
    checkKey(name);
    return Object.hasOwn(this.values, name) ? this.values[name] : null;
  }

  write(name, value) {
    checkKey(name);
    if (value !== null) checkValue(value);
    if (this.read(name) === value) return true;
    const next = Object.assign(Object.create(null), this.values);
    if (value === null) delete next[name];
    else next[name] = value;
    const bytes = encode(next);
    // The backup is the previous successful state. Persist it before replacing
    // the primary, including on the first write (when that state is empty).
    atomicWrite(this.backup, encode(this.values));
    atomicWrite(this.file, bytes);
    this.values = next;
    return true;
  }

  status() {
    return { recovered: this.recovered, file: this.file, backup: this.backup, version: 1 };
  }
}

module.exports = { SaveStore, ALLOWED_KEYS, MAX_VALUE_BYTES, MAX_FILE_BYTES };
