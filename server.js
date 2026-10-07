#!/usr/bin/env node
// Forest Survivor — a tiny, zero-dependency game server.
//
// It serves the static game from ./public and exposes a small JSON API for
// the player profile. The server keeps no database: the profile and any saved
// run live in encrypted (AES-256-GCM) cookies on the player's browser. The only
// thing the server persists is its key (.data/cookie-secret, or COOKIE_SECRET).

import http from 'node:http';
import { createHmac, createCipheriv, createDecipheriv, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import * as P from './public/js/shared/profile.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const PROFILE_COOKIE = 'fs_profile';
const RUN_COOKIE = 'fs_run';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // browsers cap cookie lifetime at ~400 days
const MAX_BODY = 8 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.webmanifest']);

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; " +
    "script-src 'self'; connect-src 'self'; media-src 'self' blob: data:; object-src 'none'; frame-ancestors 'self'",
};

function loadSecret(root) {
  if (process.env.COOKIE_SECRET) return process.env.COOKIE_SECRET;
  const file = path.join(root, '.data', 'cookie-secret');
  try {
    const s = readFileSync(file, 'utf8').trim();
    if (s.length >= 32) return s;
  } catch {}
  const secret = randomBytes(32).toString('hex');
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, secret, { mode: 0o600 });
  } catch {
    console.warn('[forest-survivor] Could not persist the cookie secret; saves reset on restart. Set COOKIE_SECRET.');
  }
  return secret;
}

// ---------------------------------------------------------------- cookies --

// Cookies are sealed with AES-256-GCM: unreadable and tamper-proof. The cookie
// name is bound in as associated data, so a profile can't pose as a saved run.
// Cookies from before encryption (base64 JSON + HMAC signature) are still
// accepted once and re-issued encrypted.
const SEALED = 'e1.';
const IV_LEN = 12;
const TAG_LEN = 16;
const MAX_COOKIE = 4096;

function sealer(secret) {
  const key = Buffer.from(hkdfSync('sha256', secret, 'forest-survivor', 'cookie-encryption-v1', 32));
  const legacyMac = (data) => createHmac('sha256', secret).update(data).digest('base64url');
  const bad = { status: 'bad', data: null };
  return {
    seal(name, obj) {
      const iv = randomBytes(IV_LEN);
      const c = createCipheriv('aes-256-gcm', key, iv);
      c.setAAD(Buffer.from(name));
      const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
      return SEALED + Buffer.concat([iv, ct, c.getAuthTag()]).toString('base64url');
    },
    // status: 'none' (no cookie), 'ok', 'legacy' (old signed format, valid) or 'bad'.
    open(name, value) {
      if (!value) return { status: 'none', data: null };
      if (value.length > MAX_COOKIE) return bad;
      if (value.startsWith(SEALED)) {
        const buf = Buffer.from(value.slice(SEALED.length), 'base64url');
        if (buf.length <= IV_LEN + TAG_LEN) return bad;
        try {
          const d = createDecipheriv('aes-256-gcm', key, buf.subarray(0, IV_LEN));
          d.setAAD(Buffer.from(name));
          d.setAuthTag(buf.subarray(buf.length - TAG_LEN));
          const json = Buffer.concat([d.update(buf.subarray(IV_LEN, buf.length - TAG_LEN)), d.final()]).toString('utf8');
          return { status: 'ok', data: JSON.parse(json) };
        } catch {
          return bad;
        }
      }
      const dot = value.lastIndexOf('.');
      if (dot < 1) return bad;
      const body = value.slice(0, dot);
      const sig = Buffer.from(value.slice(dot + 1));
      const expected = Buffer.from(legacyMac(body));
      if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return bad;
      const data = P.decodeState(body);
      return data ? { status: 'legacy', data } : bad;
    },
  };
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (k) out[k] = part.slice(i + 1).trim();
  }
  return out;
}

function isHttps(req) {
  return req.socket.encrypted || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

function cookieHeader(req, name, value) {
  const parts = [`${name}=${value ?? ''}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  parts.push(value == null ? 'Max-Age=0' : `Max-Age=${COOKIE_MAX_AGE}`);
  if (isHttps(req)) parts.push('Secure');
  return parts.join('; ');
}

// ------------------------------------------------------------------- http --

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
  res.end(body);
}

function sendJson(res, status, obj, cookies = []) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (cookies.length) headers['Set-Cookie'] = cookies;
  send(res, status, JSON.stringify(obj), headers);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Body too large'), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

// ----------------------------------------------------------------- static --

function createStatic(publicDir) {
  const gzCache = new Map(); // path -> { mtime, buf }

  return async function serveStatic(req, res, pathname) {
    let rel;
    try {
      rel = decodeURIComponent(pathname);
    } catch {
      return send(res, 400, 'Bad request');
    }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.normalize(path.join(publicDir, rel));
    if (!file.startsWith(publicDir + path.sep)) return send(res, 403, 'Forbidden');

    let info;
    try {
      info = await stat(file);
      if (!info.isFile()) throw new Error('not a file');
    } catch {
      return send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
    }

    const ext = path.extname(file).toLowerCase();
    const etag = `"${info.size.toString(36)}-${Math.floor(info.mtimeMs).toString(36)}"`;
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      ETag: etag,
    };
    if (req.headers['if-none-match'] === etag) return send(res, 304, null, headers);

    let body = await readFile(file);
    if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '') && body.length > 512) {
      const hit = gzCache.get(file);
      if (hit && hit.mtime === info.mtimeMs) body = hit.buf;
      else {
        const buf = zlib.gzipSync(body);
        gzCache.set(file, { mtime: info.mtimeMs, buf });
        body = buf;
      }
      headers['Content-Encoding'] = 'gzip';
      headers.Vary = 'Accept-Encoding';
    }
    headers['Content-Length'] = body.length;
    send(res, 200, req.method === 'HEAD' ? null : body, headers);
  };
}

// -------------------------------------------------------------------- api --

export function createServer({ secret = loadSecret(ROOT), publicDir = PUBLIC } = {}) {
  const box = sealer(secret);
  const serveStatic = createStatic(publicDir);

  const openCookie = (req, name) => box.open(name, parseCookies(req.headers.cookie)[name]);
  const readProfile = (req) => P.sanitizeProfile(openCookie(req, PROFILE_COOKIE).data);
  const profileCookie = (req, p) => cookieHeader(req, PROFILE_COOKIE, box.seal(PROFILE_COOKIE, p));
  const runCookie = (req, cp) => cookieHeader(req, RUN_COOKIE, cp ? box.seal(RUN_COOKIE, cp) : null);

  async function api(req, res, route) {
    if (req.method === 'GET' && route === 'state') {
      const prof = openCookie(req, PROFILE_COOKIE);
      const run = openCookie(req, RUN_COOKIE);
      const profile = P.sanitizeProfile(prof.data);
      const checkpoint = P.sanitizeCheckpoint(run.data);
      const out = { profile, checkpoint, server: true };
      // A save that can't be decrypted (wrong key, corruption, tampering) is
      // reported, not silently replaced: the player is offered a fresh start,
      // and the cookie stays untouched until they accept it.
      if (prof.status === 'bad' || run.status === 'bad') {
        out.unreadable = { profile: prof.status === 'bad', run: run.status === 'bad' };
      }
      const cookies = [];
      if (prof.status === 'legacy') cookies.push(profileCookie(req, profile));
      if (run.status === 'legacy') cookies.push(runCookie(req, checkpoint));
      return sendJson(res, 200, out, cookies);
    }
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
    // JSON-only POSTs cannot be forged by a plain cross-site form.
    if (!/^application\/json\b/.test(req.headers['content-type'] || '')) {
      return sendJson(res, 415, { error: 'Expected application/json' });
    }
    const body = await readJson(req);
    const profile = readProfile(req);

    switch (route) {
      case 'run': {
        const r = P.applyRun(profile, body);
        if (!r.ok) return sendJson(res, 400, { error: r.error });
        // A finished run always consumes its checkpoint.
        return sendJson(res, 200, { profile: r.profile, reward: r.reward }, [
          profileCookie(req, r.profile),
          runCookie(req, null),
        ]);
      }
      case 'checkpoint': {
        const cp = body && body.checkpoint ? P.sanitizeCheckpoint(body.checkpoint) : null;
        if (body && body.checkpoint && !cp) return sendJson(res, 400, { error: 'Invalid checkpoint' });
        return sendJson(res, 200, { checkpoint: cp }, [runCookie(req, cp)]);
      }
      case 'buy': {
        const r = P.buyUpgrade(profile, body.id);
        if (!r.ok) return sendJson(res, 400, { error: r.error, profile: r.profile });
        return sendJson(res, 200, { profile: r.profile }, [profileCookie(req, r.profile)]);
      }
      case 'refund': {
        const r = P.refundUpgrades(profile);
        return sendJson(res, 200, { profile: r.profile, refunded: r.refunded }, [profileCookie(req, r.profile)]);
      }
      case 'unlock': {
        const r = P.unlockHero(profile, body.hero);
        if (!r.ok) return sendJson(res, 400, { error: r.error, profile: r.profile });
        return sendJson(res, 200, { profile: r.profile }, [profileCookie(req, r.profile)]);
      }
      case 'reset': {
        const p = P.defaultProfile();
        return sendJson(res, 200, { profile: p, checkpoint: null }, [profileCookie(req, p), runCookie(req, null)]);
      }
      default:
        return sendJson(res, 404, { error: 'Unknown endpoint' });
    }
  }

  return http.createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url, 'http://localhost');
      if (pathname.startsWith('/api/')) return await api(req, res, pathname.slice(5));
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
      return await serveStatic(req, res, pathname);
    } catch (err) {
      const status = err.status || 500;
      if (status === 500) console.error(err);
      if (!res.headersSent) sendJson(res, status, { error: status === 500 ? 'Server error' : err.message });
      else res.end();
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  createServer().listen(port, host, () => {
    console.log(`Forest Survivor is running at http://localhost:${port}`);
  });
}
