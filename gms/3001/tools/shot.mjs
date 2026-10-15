// Screenshots of a hero sprite in the real game, through the Sprite Lab's game screen (the lab
// must be running: npm run lab): standing by the campfire crossroads, walking, and in a fight.
//   node gms/3001/tools/shot.mjs mage/remaster-v1 [knight/remaster-v1 ...] [--zoom=closer] [--out=dir]
// zoom: game (as the game shows it, the default), closer, or native (one screen pixel per pixel).
// PNGs go to gms/3001/sprites/lab/review/ (not kept in git): <class>-<id>-stand.png, -walk.png, -fight.png.
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { open, sleep } from './cdp.mjs';

const args = process.argv.slice(2);
const OUT = args.find((a) => a.startsWith('--out='))?.slice(6) || fileURLToPath(new URL('../sprites/lab/review/', import.meta.url));
const zoom = args.find((a) => a.startsWith('--zoom='))?.slice(7) || 'game';
const LAB = 'http://localhost:3001';
mkdirSync(OUT, { recursive: true });

const KEYS = { right: ['d', 'KeyD', 68], left: ['a', 'KeyA', 65], up: ['w', 'KeyW', 87], down: ['s', 'KeyS', 83] };
for (const id of args.filter((a) => !a.startsWith('--'))) {
  const [cls, eid] = id.replace(/^lab:/, '').split('/');
  const wear = eid === 'game' ? '' : `&wear=${encodeURIComponent(`lab:${cls}/${eid}`)}`;
  const b = await open(`${LAB}/stage.html?hero=${cls}&zoom=${zoom}${wear}`, { w: 1280, h: 720 });
  try {
    for (let i = 0; i < 40; i++) {
      await sleep(250);
      if (await b.evaluate(`!!document.querySelector('#note') && document.readyState === 'complete' && typeof window !== 'undefined'`)) break;
    }
    await sleep(2500);
    const tell = (action, data = {}) => b.evaluate(`window.postMessage(${JSON.stringify({ lab: true, action, ...data })}, location.origin)`);
    await tell('fight', { value: false });
    await sleep(400);
    const base = join(OUT, `${cls}-${eid}`);
    await b.shot(`${base}-stand.png`);
    // Walk right for a while, and shoot mid-stride.
    const [key, code, vk] = KEYS.right;
    await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk });
    await sleep(700);
    await b.shot(`${base}-walk.png`);
    await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk });
    // A fight: weapons on, the night's foes brought in.
    await tell('fight', { value: true });
    await tell('spawn', { part: 'skeleton', n: 8 });
    await tell('spawn', { part: 'bat', n: 6 });
    await sleep(1800);
    await b.shot(`${base}-fight.png`);
    const errors = b.logs.filter((l) => /error|exception/i.test(l));
    console.log(`${base}-{stand,walk,fight}.png${errors.length ? '\n  ! ' + errors.join('\n  ! ') : ''}`);
  } finally {
    b.close();
  }
}
process.exit(0);
