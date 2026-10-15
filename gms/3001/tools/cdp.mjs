// Tiny headless-Chrome driver: open(url, {init}) -> { evaluate, key, shot, close }.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function open(url, { init = '', port = 9340 + Math.floor(Math.random() * 50), w = 960, h = 540 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'cdp-'));
  const chrome = spawn(CHROME, [`--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--headless=new', '--autoplay-policy=no-user-gesture-required', '--mute-audio', `--window-size=${w},${h}`, 'about:blank'], { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 60; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (targets.find((t) => t.type === 'page')) break; } catch {}
    await sleep(200);
  }
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  const logs = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    if (d.method === 'Runtime.consoleAPICalled') logs.push(d.params.type + ': ' + d.params.args.map((a) => a.value ?? a.description).join(' '));
    if (d.method === 'Runtime.exceptionThrown') logs.push('exception: ' + d.params.exceptionDetails.exception?.description);
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'eval failed');
    return r.result?.result?.value;
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  if (init) await send('Page.addScriptToEvaluateOnNewDocument', { source: init });
  await send('Page.navigate', { url });
  const key = async (k = 'Enter', code = 'Enter', vk = 13) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk });
    await sleep(80);
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk });
  };
  const shot = async (file) => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(file, Buffer.from(r.result.data, 'base64'));
  };
  const close = () => { ws.close(); chrome.kill(); };
  return { evaluate, key, shot, close, logs, send };
}
